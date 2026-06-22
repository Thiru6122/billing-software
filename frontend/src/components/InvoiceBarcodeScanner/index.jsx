import { useRef, useState, useEffect } from 'react';
import { Form, Input, Alert, message } from 'antd';
import { BarcodeOutlined } from '@ant-design/icons';
import { request } from '@/request';
import useLanguage from '@/locale/useLanguage';
import calculate from '@/utils/calculate';

function buildLineItem(product, quantity = 1) {
  const price = Number(product.price) || 0;
  const qty = Number(quantity) || 1;
  return {
    product: product._id,
    itemName: product.name,
    price,
    quantity: qty,
    total: Number.parseFloat(calculate.multiply(price, qty)),
    description: product.sku ? `SKU: ${product.sku}` : '',
  };
}

export default function InvoiceBarcodeScanner({ add }) {
  const translate = useLanguage();
  const form = Form.useFormInstance();
  const inputRef = useRef(null);
  const [scanValue, setScanValue] = useState('');
  const scanningRef = useRef(false);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleScan = async (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    if (scanningRef.current) return;

    const code = scanValue.trim();
    if (!code) return;

    scanningRef.current = true;

    try {
      const response = await request.get({
        entity: `product/barcode/${encodeURIComponent(code)}`,
      });

      if (!response?.success || !response?.result) {
        message.error(response?.message || translate('product_not_found_for_barcode'));
        return;
      }

      const product = response.result;
      const items = (form.getFieldValue('items') || []).filter((row) => row && row.itemName);

      const existingIndex = items.findIndex(
        (row) =>
          String(row.product) === String(product._id) ||
          String(row.product?._id) === String(product._id)
      );

      if (existingIndex >= 0) {
        const currentQty = Number(items[existingIndex].quantity) || 1;
        const nextQty = currentQty + 1;
        const price = Number(items[existingIndex].price) || Number(product.price) || 0;

        form.setFieldValue(['items', existingIndex, 'quantity'], nextQty);
        form.setFieldValue(
          ['items', existingIndex, 'total'],
          calculate.multiply(price, nextQty)
        );
      } else if (typeof add === 'function') {
        add(buildLineItem(product, 1));
      } else {
        form.setFieldValue('items', [...items, buildLineItem(product, 1)]);
      }

      message.success(`${product.name} ${translate('added')}`);
      setScanValue('');
    } catch {
      message.error(translate('product_not_found_for_barcode'));
      setScanValue('');
    } finally {
      scanningRef.current = false;
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  return (
    <div style={{ marginBottom: 16 }}>
      <Alert
        type="info"
        showIcon
        icon={<BarcodeOutlined />}
        message={translate('scan_barcode_to_add')}
        description={translate('scan_barcode_invoice_hint')}
        style={{ marginBottom: 12 }}
      />
      <Input
        ref={inputRef}
        size="large"
        value={scanValue}
        onChange={(e) => setScanValue(e.target.value)}
        onKeyDown={handleScan}
        placeholder={translate('scan_barcode_placeholder')}
        prefix={<BarcodeOutlined />}
        allowClear
      />
    </div>
  );
}

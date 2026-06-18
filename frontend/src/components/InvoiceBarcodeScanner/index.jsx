import { useRef, useState, useEffect } from 'react';
import { Form, Input, Alert, message } from 'antd';
import { BarcodeOutlined } from '@ant-design/icons';
import { request } from '@/request';
import useLanguage from '@/locale/useLanguage';
import calculate from '@/utils/calculate';

function buildLineItem(product, quantity = 1) {
  const price = product.price || 0;
  return {
    product: product._id,
    itemName: product.name,
    price,
    quantity,
    total: Number.parseFloat(calculate.multiply(price, quantity)),
    description: product.sku ? `SKU: ${product.sku}` : '',
  };
}

export default function InvoiceBarcodeScanner({ add }) {
  const translate = useLanguage();
  const form = Form.useFormInstance();
  const inputRef = useRef(null);
  const [scanValue, setScanValue] = useState('');

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const applyItems = (items) => {
    form.setFieldsValue({ items });
  };

  const handleScan = async (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();

    const code = scanValue.trim();
    if (!code) return;

    try {
      const response = await request.get({
        entity: `product/barcode/${encodeURIComponent(code)}`,
      });

      if (!response?.success || !response?.result) {
        message.error(translate('product_not_found_for_barcode'));
        setScanValue('');
        inputRef.current?.focus();
        return;
      }

      const product = response.result;
      let items = [...(form.getFieldValue('items') || [])].filter((row) => row && row.itemName);

      const existingIndex = items.findIndex(
        (row) => row.product === product._id || row.product?._id === product._id
      );

      if (existingIndex >= 0) {
        const qty = (items[existingIndex].quantity || 1) + 1;
        items[existingIndex] = buildLineItem(product, qty);
        applyItems(items);
      } else if (typeof add === 'function') {
        add(buildLineItem(product, 1));
      } else {
        items.push(buildLineItem(product, 1));
        applyItems(items);
      }

      message.success(`${product.name} ${translate('added')}`);
      setScanValue('');
      inputRef.current?.focus();
    } catch {
      message.error(translate('product_not_found_for_barcode'));
      setScanValue('');
      inputRef.current?.focus();
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

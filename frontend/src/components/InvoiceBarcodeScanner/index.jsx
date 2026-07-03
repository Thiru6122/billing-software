import { useRef, useState, useEffect } from 'react';
import { Form, Input, Alert, message, Select, Row, Col, Empty } from 'antd';
import { BarcodeOutlined, SearchOutlined } from '@ant-design/icons';
import { request } from '@/request';
import useLanguage from '@/locale/useLanguage';
import useDebounce from '@/hooks/useDebounce';
import useMoney from '@/settings/useMoney';
import { addProductToInvoice } from '@/utils/invoiceProductLineItem';

function InvoiceProductSearch({ add, taxRate = 0 }) {
  const translate = useLanguage();
  const { moneyFormatter } = useMoney();
  const form = Form.useFormInstance();
  const [options, setOptions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedValue, setSelectedValue] = useState(undefined);
  const addingRef = useRef(false);

  const [, cancelDebounce] = useDebounce(
    () => setDebouncedSearch(searchText),
    400,
    [searchText]
  );

  useEffect(() => {
    const query = debouncedSearch.trim();
    if (!query) {
      setOptions([]);
      setSearching(false);
      return undefined;
    }

    let cancelled = false;
    setSearching(true);

    request
      .search({
        entity: 'product',
        options: { q: query, fields: 'name,sku,barcode' },
      })
      .then((response) => {
        if (cancelled) return;
        setOptions(
          response?.success
            ? (response.result || []).filter((product) => product.enabled !== false)
            : []
        );
      })
      .finally(() => {
        if (!cancelled) setSearching(false);
      });

    return () => {
      cancelled = true;
      cancelDebounce();
    };
  }, [debouncedSearch, cancelDebounce]);

  const handleProductSelect = async (productId) => {
    if (!productId || addingRef.current) return;

    addingRef.current = true;
    try {
      let product = options.find((item) => String(item._id) === String(productId));

      if (!product) {
        const response = await request.read({ entity: 'product', id: productId });
        if (!response?.success || !response?.result) {
          message.error(translate('product_not_found_for_barcode'));
          return;
        }
        product = response.result;
      }

      addProductToInvoice({ form, add, product, taxRate });
      message.success(`${product.name} ${translate('added')}`);
      setSelectedValue(undefined);
      setSearchText('');
      setDebouncedSearch('');
      setOptions([]);
    } finally {
      addingRef.current = false;
    }
  };

  return (
    <Select
      showSearch
      allowClear
      size="large"
      value={selectedValue}
      placeholder={translate('search_product_to_add')}
      filterOption={false}
      loading={searching}
      notFoundContent={searching ? '...' : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />}
      onSearch={(value) => {
        setSearchText(value);
        setSelectedValue(undefined);
      }}
      onChange={handleProductSelect}
      onClear={() => {
        setSearchText('');
        setDebouncedSearch('');
        setOptions([]);
        setSelectedValue(undefined);
      }}
      suffixIcon={<SearchOutlined />}
      style={{ width: '100%' }}
    >
      {options.map((product) => (
        <Select.Option key={product._id} value={product._id}>
          {product.name}
          {product.barcode ? ` (${product.barcode})` : ''}
          {product.price != null ? ` — ${moneyFormatter({ amount: product.price })}` : ''}
        </Select.Option>
      ))}
    </Select>
  );
}

export default function InvoiceBarcodeScanner({ add, taxRate = 0 }) {
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
      addProductToInvoice({ form, add, product, taxRate });
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
        message={translate('add_product_to_invoice')}
        description={translate('add_product_invoice_hint')}
        style={{ marginBottom: 12 }}
      />
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <TypographyLabel text={translate('scan_barcode_to_add')} />
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
        </Col>
        <Col xs={24} md={12}>
          <TypographyLabel text={translate('search_product_to_add')} />
          <InvoiceProductSearch add={add} taxRate={taxRate} />
        </Col>
      </Row>
    </div>
  );
}

function TypographyLabel({ text }) {
  return (
    <div style={{ marginBottom: 8, fontSize: 13, fontWeight: 500, color: '#444' }}>
      {text}
    </div>
  );
}

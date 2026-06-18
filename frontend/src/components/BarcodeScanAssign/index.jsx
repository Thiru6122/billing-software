import { useRef, useState } from 'react';
import { Alert, Input, Form, message } from 'antd';
import { BarcodeOutlined } from '@ant-design/icons';
import useLanguage from '@/locale/useLanguage';

export default function BarcodeScanAssign() {
  const translate = useLanguage();
  const form = Form.useFormInstance();
  const inputRef = useRef(null);
  const [scanValue, setScanValue] = useState('');

  const handleScan = (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();

    const code = scanValue.trim();
    if (!code) return;

    form.setFieldValue('barcode', code);
    message.success(translate('barcode_assigned_save_product'));
    setScanValue('');
    inputRef.current?.focus();
  };

  return (
    <div style={{ marginBottom: 16 }}>
      <Alert
        type="warning"
        showIcon
        icon={<BarcodeOutlined />}
        message={translate('scan_to_assign_barcode')}
        description={translate('scan_to_assign_barcode_hint')}
        style={{ marginBottom: 8 }}
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

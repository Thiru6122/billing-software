import { useEffect, useRef } from 'react';
import { Input, Button, Space } from 'antd';
import { BarcodeOutlined, ReloadOutlined, PrinterOutlined } from '@ant-design/icons';
import useLanguage from '@/locale/useLanguage';
import { generateBarcodeValue, printBarcodeLabels, createBarcodeSvg } from '@/utils/barcodePrint';

export { generateBarcodeValue };

export default function BarcodeField({ value, onChange }) {
  const translate = useLanguage();
  const svgRef = useRef(null);

  useEffect(() => {
    if (!svgRef.current || !value) return;
    svgRef.current.innerHTML = createBarcodeSvg(value, { height: 70 });
  }, [value]);

  const handleGenerate = () => {
    onChange?.(generateBarcodeValue());
  };

  const handlePrint = () => {
    if (!value) return;
    printBarcodeLabels([{ code: value, title: '', subtitle: '' }], translate('barcode_labels'));
  };

  return (
    <div>
      <Space.Compact style={{ width: '100%', marginBottom: 8 }}>
        <Input
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={translate('barcode')}
        />
        <Button icon={<ReloadOutlined />} onClick={handleGenerate}>
          {translate('generate_barcode')}
        </Button>
        <Button icon={<PrinterOutlined />} onClick={handlePrint} disabled={!value}>
          {translate('print_label')}
        </Button>
      </Space.Compact>
      {value ? (
        <div
          style={{
            border: '1px dashed #d9d9d9',
            padding: 12,
            textAlign: 'center',
            background: '#fafafa',
          }}
        >
          <div ref={svgRef} />
          <div style={{ marginTop: 8, color: '#666', fontSize: 12 }}>
            <BarcodeOutlined /> {translate('barcode_label_hint')}
          </div>
        </div>
      ) : null}
    </div>
  );
}

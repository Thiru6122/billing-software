import { useEffect, useRef } from 'react';
import { Input } from 'antd';
import { BarcodeOutlined } from '@ant-design/icons';
import useLanguage from '@/locale/useLanguage';
import { createBarcodeSvg } from '@/utils/barcodePrint';

export default function BarcodeField({ value }) {
  const translate = useLanguage();
  const svgRef = useRef(null);

  useEffect(() => {
    if (!svgRef.current || !value) return;
    svgRef.current.innerHTML = createBarcodeSvg(value, { height: 70 });
  }, [value]);

  return (
    <div>
      <Input value={value || ''} readOnly placeholder={translate('barcode_auto_assign_placeholder')} />
      {value ? (
        <div
          style={{
            border: '1px dashed #d9d9d9',
            padding: 12,
            textAlign: 'center',
            background: '#fafafa',
            marginTop: 8,
          }}
        >
          <div ref={svgRef} />
          <div style={{ marginTop: 8, color: '#666', fontSize: 12 }}>
            <BarcodeOutlined /> {translate('barcode_product_hint')}
          </div>
        </div>
      ) : (
        <TypographyHint text={translate('barcode_auto_assign_hint')} />
      )}
    </div>
  );
}

function TypographyHint({ text }) {
  return <p style={{ color: '#888', fontSize: 12, marginTop: 8 }}>{text}</p>;
}

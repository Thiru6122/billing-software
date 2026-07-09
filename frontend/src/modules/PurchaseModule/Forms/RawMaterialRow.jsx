import { useEffect } from 'react';
import { Form, Input, InputNumber, Row, Col, Select } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import { useMoney } from '@/settings';
import useLanguage from '@/locale/useLanguage';
import { computeGstExclusiveLine } from '@/constants/indianStates';

const RAW_MATERIAL_UNITS = [
  { value: 'kg', label: 'kg' },
  { value: 'g', label: 'g' },
  { value: 'ltr', label: 'ltr' },
  { value: 'ml', label: 'ml' },
  { value: 'pcs', label: 'pcs' },
  { value: 'bag', label: 'bag' },
  { value: 'box', label: 'box' },
  { value: 'carton', label: 'carton' },
  { value: 'dozen', label: 'dozen' },
];

const GST_RATE_OPTIONS = [
  { value: 0, label: '0%' },
  { value: 5, label: '5%' },
  { value: 12, label: '12%' },
  { value: 18, label: '18%' },
  { value: 28, label: '28%' },
];

export default function RawMaterialRow({ field, remove, current = null }) {
  const translate = useLanguage();
  const form = Form.useFormInstance();
  const money = useMoney();

  const quantity = Form.useWatch(['items', field.name, 'quantity'], form);
  const price = Form.useWatch(['items', field.name, 'price'], form);
  const gstRate = Form.useWatch(['items', field.name, 'gstRate'], form);
  const unit = Form.useWatch(['items', field.name, 'unit'], form);

  const { taxableValue, gstAmount, total: lineTotal } = computeGstExclusiveLine(
    quantity,
    price,
    gstRate
  );
  const unitPrice = Number(price) || 0;
  const rate = Number(gstRate) || 0;
  const gstPerUnit = Math.round(((unitPrice * rate) / 100) * 100) / 100;
  const totalPerUnit = Math.round((unitPrice + gstPerUnit) * 100) / 100;

  useEffect(() => {
    form.setFieldValue(['items', field.name, 'total'], lineTotal);
    form.setFieldValue(['items', field.name, 'taxableValue'], taxableValue);
    form.setFieldValue(['items', field.name, 'gstAmount'], gstAmount);
  }, [lineTotal, taxableValue, gstAmount, field.name, form]);

  useEffect(() => {
    if (!current?.items?.[field.fieldKey]) return;
    const item = current.items[field.fieldKey];
    form.setFieldValue(['items', field.name, 'itemName'], item.itemName);
    form.setFieldValue(['items', field.name, 'unit'], item.unit || 'kg');
    form.setFieldValue(['items', field.name, 'quantity'], item.quantity);
    form.setFieldValue(['items', field.name, 'price'], item.price);
    form.setFieldValue(['items', field.name, 'gstRate'], item.gstRate ?? 0);
    form.setFieldValue(['items', field.name, 'total'], item.total);
  }, [current, field.fieldKey, field.name, form]);

  const moneyInputProps = {
    min: 0,
    controls: false,
    style: { width: '100%' },
    addonAfter: money.currency_position === 'after' ? money.currency_symbol : undefined,
    addonBefore: money.currency_position === 'before' ? money.currency_symbol : undefined,
    formatter: (value) =>
      money.amountFormatter({
        amount: value ?? 0,
        currency_code: money.currency_code,
      }),
  };

  const readOnlyMoneyProps = {
    ...moneyInputProps,
    readOnly: true,
  };

  return (
    <>
      <Row gutter={[8, 8]} style={{ position: 'relative' }} className="invoice-item-row">
        <Form.Item name={[field.name, 'product']} hidden>
          <Input />
        </Form.Item>
        <Form.Item name={[field.name, 'total']} hidden>
          <InputNumber />
        </Form.Item>
        <Form.Item name={[field.name, 'taxableValue']} hidden>
          <InputNumber />
        </Form.Item>
        <Form.Item name={[field.name, 'gstAmount']} hidden>
          <InputNumber />
        </Form.Item>
        <Col xs={24} sm={8} md={6}>
          <Form.Item
            name={[field.name, 'itemName']}
            rules={[{ required: true, message: translate('raw_material_name_required') }]}
          >
            <Input placeholder={translate('raw_material_name_placeholder')} />
          </Form.Item>
        </Col>
        <Col xs={8} sm={4} md={2}>
          <Form.Item name={[field.name, 'unit']} initialValue="kg">
            <Select options={RAW_MATERIAL_UNITS} />
          </Form.Item>
        </Col>
        <Col xs={8} sm={4} md={3}>
          <Form.Item
            name={[field.name, 'quantity']}
            rules={[{ required: true, message: translate('quantity_required') }]}
            initialValue={1}
          >
            <InputNumber min={0.01} step={0.01} style={{ width: '100%' }} />
          </Form.Item>
        </Col>
        <Col xs={8} sm={6} md={3}>
          <Form.Item
            name={[field.name, 'price']}
            rules={[{ required: true, message: translate('rate_required') }]}
          >
            <InputNumber {...moneyInputProps} placeholder={translate('rate_excl_gst')} />
          </Form.Item>
        </Col>
        <Col xs={8} sm={4} md={2}>
          <Form.Item name={[field.name, 'gstRate']} initialValue={0}>
            <Select options={GST_RATE_OPTIONS} />
          </Form.Item>
        </Col>
        <Col xs={8} sm={5} md={3}>
          <InputNumber {...readOnlyMoneyProps} value={gstPerUnit} />
        </Col>
        <Col xs={8} sm={5} md={3}>
          <InputNumber {...readOnlyMoneyProps} value={totalPerUnit} />
        </Col>
        <Col xs={16} sm={8} md={3}>
          <InputNumber {...readOnlyMoneyProps} value={lineTotal} />
        </Col>
        <div className="invoice-item-row__delete">
          <DeleteOutlined onClick={() => remove(field.name)} />
        </div>
      </Row>
      <div style={{ margin: '-4px 0 8px 0', fontSize: 11, color: '#666', paddingLeft: 4 }}>
        Per {unit || 'kg'}: {translate('rate_excl_gst')}{' '}
        {money.amountFormatter({ amount: unitPrice, currency_code: money.currency_code })} + GST{' '}
        {rate}% ({money.amountFormatter({ amount: gstPerUnit, currency_code: money.currency_code })}) ={' '}
        {money.amountFormatter({ amount: totalPerUnit, currency_code: money.currency_code })}
      </div>
    </>
  );
}

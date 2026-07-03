import { useEffect } from 'react';
import { Form, Input, InputNumber, Row, Col, Select } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import { useMoney } from '@/settings';
import calculate from '@/utils/calculate';
import useLanguage from '@/locale/useLanguage';

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

export default function RawMaterialRow({ field, remove, current = null }) {
  const translate = useLanguage();
  const form = Form.useFormInstance();
  const money = useMoney();

  const quantity = Form.useWatch(['items', field.name, 'quantity'], form);
  const price = Form.useWatch(['items', field.name, 'price'], form);

  const lineTotal = Number.parseFloat(
    calculate.multiply(Number(price) || 0, Number(quantity) || 0)
  );

  useEffect(() => {
    form.setFieldValue(['items', field.name, 'total'], lineTotal);
    form.setFieldValue(['items', field.name, 'gstRate'], 0);
  }, [lineTotal, field.name, form]);

  useEffect(() => {
    if (!current?.items?.[field.fieldKey]) return;
    const item = current.items[field.fieldKey];
    form.setFieldValue(['items', field.name, 'itemName'], item.itemName);
    form.setFieldValue(['items', field.name, 'unit'], item.unit || 'kg');
    form.setFieldValue(['items', field.name, 'quantity'], item.quantity);
    form.setFieldValue(['items', field.name, 'price'], item.price);
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

  return (
    <Row gutter={[12, 12]} style={{ position: 'relative' }} className="invoice-item-row">
      <Form.Item name={[field.name, 'product']} hidden>
        <Input />
      </Form.Item>
      <Form.Item name={[field.name, 'total']} hidden>
        <Input />
      </Form.Item>
      <Form.Item name={[field.name, 'gstRate']} hidden initialValue={0}>
        <InputNumber />
      </Form.Item>
      <Col xs={24} sm={10} md={8}>
        <Form.Item
          name={[field.name, 'itemName']}
          rules={[{ required: true, message: translate('raw_material_name_required') }]}
        >
          <Input placeholder={translate('raw_material_name_placeholder')} />
        </Form.Item>
      </Col>
      <Col xs={8} sm={4} md={3}>
        <Form.Item name={[field.name, 'unit']} initialValue="kg">
          <Select options={RAW_MATERIAL_UNITS} />
        </Form.Item>
      </Col>
      <Col xs={8} sm={4} md={4}>
        <Form.Item
          name={[field.name, 'quantity']}
          rules={[{ required: true, message: translate('quantity_required') }]}
          initialValue={1}
        >
          <InputNumber min={0.01} step={0.01} style={{ width: '100%' }} />
        </Form.Item>
      </Col>
      <Col xs={8} sm={6} md={4}>
        <Form.Item
          name={[field.name, 'price']}
          rules={[{ required: true, message: translate('rate_required') }]}
        >
          <InputNumber {...moneyInputProps} placeholder={translate('rate_per_unit')} />
        </Form.Item>
      </Col>
      <Col xs={16} sm={8} md={4}>
        <InputNumber {...moneyInputProps} readOnly value={lineTotal} />
      </Col>
      <div className="invoice-item-row__delete">
        <DeleteOutlined onClick={() => remove(field.name)} />
      </div>
    </Row>
  );
}

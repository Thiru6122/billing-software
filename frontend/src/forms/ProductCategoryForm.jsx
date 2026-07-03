import { Form, Input, InputNumber, Switch } from 'antd';
import { CloseOutlined, CheckOutlined } from '@ant-design/icons';
import useLanguage from '@/locale/useLanguage';

export default function ProductCategoryForm() {
  const translate = useLanguage();

  return (
    <>
      <Form.Item
        label={translate('category')}
        name="name"
        rules={[{ required: true, message: translate('required') }]}
      >
        <Input placeholder="e.g. Hair Oil" />
      </Form.Item>
      <Form.Item
        label={translate('hsn_code')}
        name="hsnCode"
        rules={[
          { required: true, message: translate('required') },
          { pattern: /^\d{4}(\d{2})?(\d{2})?$/, message: translate('hsn_code_invalid') },
        ]}
      >
        <Input placeholder="e.g. 1515" maxLength={8} />
      </Form.Item>
      <Form.Item
        label="GST %"
        name="taxRate"
        rules={[{ required: true, type: 'number', min: 0, max: 100 }]}
        initialValue={5}
      >
        <InputNumber min={0} max={100} suffix="%" style={{ width: '100%' }} />
      </Form.Item>
      <Form.Item label={translate('description')} name="description">
        <Input.TextArea rows={2} />
      </Form.Item>
      <Form.Item
        label={translate('enabled')}
        name="enabled"
        valuePropName="checked"
        initialValue={true}
      >
        <Switch checkedChildren={<CheckOutlined />} unCheckedChildren={<CloseOutlined />} />
      </Form.Item>
    </>
  );
}

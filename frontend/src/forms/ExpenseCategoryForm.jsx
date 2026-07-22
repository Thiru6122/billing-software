import { Form, Input, InputNumber, Select, DatePicker, Switch } from 'antd';
import { CloseOutlined, CheckOutlined } from '@ant-design/icons';
import useLanguage from '@/locale/useLanguage';

export default function ExpenseCategoryForm() {
  const translate = useLanguage();

  return (
    <>
      <Form.Item
        label={translate('category')}
        name="name"
        rules={[{ required: true, message: translate('required') }]}
      >
        <Input placeholder="e.g. Rent, Utilities, Salaries" />
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

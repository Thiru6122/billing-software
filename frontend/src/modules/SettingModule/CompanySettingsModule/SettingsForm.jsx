import { Form, Input, InputNumber, Select, Switch, Divider } from 'antd';
import { CloseOutlined, CheckOutlined } from '@ant-design/icons';
import useLanguage from '@/locale/useLanguage';

const { TextArea } = Input;

const formItems = [
  { settingKey: 'company_name', valueType: 'string' },
  { settingKey: 'company_address', valueType: 'string' },
  { settingKey: 'company_state', valueType: 'string', label: 'State (for GST)' },
  { settingKey: 'company_country', valueType: 'string' },
  { settingKey: 'company_email', valueType: 'string' },
  { settingKey: 'company_phone', valueType: 'string' },
  { settingKey: 'company_website', valueType: 'string' },
  { settingKey: 'company_gstin', valueType: 'string', label: 'GSTIN' },
  { settingKey: 'company_pan', valueType: 'string', label: 'PAN' },
  { settingKey: 'company_tax_number', valueType: 'string', label: 'Tax number' },
  { settingKey: 'company_vat_number', valueType: 'string' },
  { settingKey: 'company_reg_number', valueType: 'string' },
];

const bankItems = [
  { settingKey: 'company_bank_account_name', valueType: 'string', label: 'Account holder name' },
  { settingKey: 'company_bank_name', valueType: 'string', label: 'Bank name' },
  { settingKey: 'company_bank_branch', valueType: 'string', label: 'Bank branch' },
  { settingKey: 'company_bank_account_number', valueType: 'string', label: 'Account number' },
  { settingKey: 'company_bank_ifsc', valueType: 'string', label: 'IFSC code' },
  { settingKey: 'company_gpay', valueType: 'string', label: 'GPay No' },
];

function SettingField({ item, translate }) {
  return (
    <Form.Item
      key={item.settingKey}
      label={item.label ? translate(item.label) : translate(item.settingKey)}
      name={item.settingKey}
      rules={[{ required: false }]}
      valuePropName={item.valueType === 'boolean' ? 'checked' : 'value'}
    >
      {item.valueType === 'string' && <Input autoComplete="off" />}
      {item.valueType === 'number' && <InputNumber min={0} style={{ width: '100%' }} />}
      {item.valueType === 'boolean' && (
        <Switch checkedChildren={<CheckOutlined />} unCheckedChildren={<CloseOutlined />} />
      )}
      {item.valueType === 'array' && (
        <Select mode="tags" style={{ width: '100%' }} tokenSeparators={[',']} />
      )}
    </Form.Item>
  );
}

export default function SettingForm() {
  const translate = useLanguage();

  return (
    <div>
      {formItems.map((item) => (
        <SettingField key={item.settingKey} item={item} translate={translate} />
      ))}

      <Divider orientation="left">{translate('bank_details')}</Divider>
      {bankItems.map((item) => (
        <SettingField key={item.settingKey} item={item} translate={translate} />
      ))}

      <Divider orientation="left">{translate('invoice_terms_conditions')}</Divider>
      <Form.Item
        name="invoice_terms_conditions"
        label={translate('invoice_terms_conditions')}
        rules={[{ required: false }]}
      >
        <TextArea rows={6} placeholder={translate('invoice_terms_conditions_hint')} />
      </Form.Item>
    </div>
  );
}

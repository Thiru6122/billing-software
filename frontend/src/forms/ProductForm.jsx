import { useEffect, useMemo } from 'react';
import { Form, Input, InputNumber, Switch, Divider } from 'antd';
import { CloseOutlined, CheckOutlined } from '@ant-design/icons';
import { useSelector } from 'react-redux';
import useLanguage from '@/locale/useLanguage';
import BarcodeField from '@/components/BarcodeField';
import SelectAsync from '@/components/SelectAsync';
import { selectCompanySettings } from '@/redux/settings/selectors';
import { getDefaultLabelTemplate } from '@/utils/barcodePrint';

export default function ProductForm({ isUpdateForm = false }) {
  const translate = useLanguage();
  const companySettings = useSelector(selectCompanySettings) || {};
  const form = Form.useFormInstance();
  const labelDefaults = useMemo(
    () => getDefaultLabelTemplate(companySettings.company_name),
    [companySettings.company_name]
  );

  useEffect(() => {
    if (isUpdateForm || !form) return;
    form.setFieldsValue({
      enterpriseLine1: form.getFieldValue('enterpriseLine1') || labelDefaults.enterpriseLine1,
      companyName: form.getFieldValue('companyName') || labelDefaults.companyName,
      packDate: form.getFieldValue('packDate') || labelDefaults.packDate,
      expiryText: form.getFieldValue('expiryText') || labelDefaults.expiryText,
    });
  }, [isUpdateForm, form, labelDefaults]);

  return (
    <>
      <Form.Item
        label={translate('name')}
        name="name"
        rules={[{ required: true }]}
      >
        <Input />
      </Form.Item>
      <Form.Item label="SKU" name="sku">
        <Input placeholder="SKU-001" />
      </Form.Item>
      <Form.Item
        label={translate('barcode')}
        name="barcode"
        extra={translate('barcode_auto_assign_hint')}
      >
        <BarcodeField />
      </Form.Item>
      <Form.Item label={translate('category')} name="category">
        <Input />
      </Form.Item>
      <Form.Item label={translate('unit')} name="unit" initialValue="pcs">
        <Input />
      </Form.Item>
      <Form.Item
        label={translate('price')}
        name="price"
        rules={[{ required: true, type: 'number', min: 0 }]}
      >
        <InputNumber min={0} style={{ width: '100%' }} />
      </Form.Item>
      <Form.Item label={translate('cost')} name="cost">
        <InputNumber min={0} style={{ width: '100%' }} />
      </Form.Item>
      {isUpdateForm && (
        <Form.Item label={translate('quantity')} name="quantity">
          <InputNumber min={0} style={{ width: '100%' }} disabled />
        </Form.Item>
      )}
      <Form.Item label={translate('min_quantity')} name="minQuantity" initialValue={0}>
        <InputNumber min={0} style={{ width: '100%' }} />
      </Form.Item>
      <Form.Item label="HSN Code" name="hsnCode">
        <Input placeholder="e.g. 6109" maxLength={8} />
      </Form.Item>
      <Form.Item label="GST %" name="taxRate" initialValue={0}>
        <SelectAsync
          entity="taxes"
          outputValue="taxValue"
          displayLabels={['taxName']}
          withRedirect
          urlToRedirect="/taxes"
          redirectLabel="Add GST rate"
          placeholder="Select GST %"
        />
      </Form.Item>
      <Form.Item label={translate('description')} name="description">
        <Input.TextArea rows={2} />
      </Form.Item>

      <Divider orientation="left">{translate('label_details')}</Divider>
      <Form.Item
        label={translate('label_enterprise_line1')}
        name="enterpriseLine1"
        rules={[{ required: true, message: translate('required') }]}
      >
        <Input placeholder="Ashwin" />
      </Form.Item>
      <Form.Item
        label={translate('company_name')}
        name="companyName"
        rules={[{ required: true, message: translate('required') }]}
      >
        <Input placeholder="REAL" />
      </Form.Item>
      <Form.Item
        label={translate('pack_date')}
        name="packDate"
        rules={[{ required: true, message: translate('required') }]}
      >
        <Input placeholder="JUN 30" />
      </Form.Item>
      <Form.Item
        label={translate('expiry_text')}
        name="expiryText"
        rules={[{ required: true, message: translate('required') }]}
      >
        <Input placeholder="12 MONTHS" />
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

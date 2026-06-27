import { Form, Input, InputNumber, Switch } from 'antd';
import { CloseOutlined, CheckOutlined } from '@ant-design/icons';
import useLanguage from '@/locale/useLanguage';
import BarcodeField from '@/components/BarcodeField';
import BarcodeScanAssign from '@/components/BarcodeScanAssign';
import SelectAsync from '@/components/SelectAsync';

export default function ProductForm({ isUpdateForm = false }) {
  const translate = useLanguage();

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
      <BarcodeScanAssign />
      <Form.Item
        label={translate('barcode')}
        name="barcode"
        rules={[{ required: true, message: translate('scan_barcode_to_map') }]}
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

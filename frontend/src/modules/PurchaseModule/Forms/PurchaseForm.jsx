import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { Form, Input, InputNumber, Button, Select, Divider, Row, Col } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { DatePicker } from 'antd';
import AutoCompleteAsync from '@/components/AutoCompleteAsync';
import RawMaterialRow from '@/modules/PurchaseModule/Forms/RawMaterialRow';
import MoneyInputFormItem from '@/components/MoneyInputFormItem';
import { selectFinanceSettings, selectSettings } from '@/redux/settings/selectors';
import { useDate } from '@/settings';
import useLanguage from '@/locale/useLanguage';
import { useSelector } from 'react-redux';
import { request } from '@/request';
import { computePurchaseGstFromItems } from '@/constants/indianStates';

export default function PurchaseForm({ current = null }) {
  const { isLoading: settingsLoading } = useSelector(selectSettings);
  const { last_purchase_number } = useSelector(selectFinanceSettings);

  if (last_purchase_number === undefined && settingsLoading) {
    return null;
  }

  return <LoadPurchaseForm current={current} />;
}

function LoadPurchaseForm({ current = null }) {
  const translate = useLanguage();
  const form = Form.useFormInstance();
  const { dateFormat } = useDate();
  const { last_purchase_number } = useSelector(selectFinanceSettings);

  const [subTotal, setSubTotal] = useState(0);
  const [taxTotal, setTaxTotal] = useState(0);
  const [total, setTotal] = useState(0);
  const [lastNumber, setLastNumber] = useState(() => (last_purchase_number ?? 0) + 1);
  const currentYear = new Date().getFullYear();

  const supplierId = Form.useWatch('supplier', form);
  const items = Form.useWatch('items', form) || [];

  useEffect(() => {
    if (current) {
      setLastNumber(current.number);
    } else {
      const existingItems = form.getFieldValue('items');
      if (!existingItems || existingItems.length === 0) {
        form.setFieldValue('items', [{ quantity: 1, unit: 'kg', gstRate: 0 }]);
      }
      form.setFieldValue('taxRate', 0);
      form.setFieldValue('gstType', 'intra');
      form.setFieldValue('year', currentYear);
    }
  }, [current, currentYear, form]);

  useEffect(() => {
    if (!supplierId || typeof supplierId !== 'string') return;
    request.read({ entity: 'supplier', id: supplierId }).then((res) => {
      if (res?.success && res.result?.name) {
        form.setFieldValue('supplierName', res.result.name);
      }
    });
  }, [supplierId, form]);

  useEffect(() => {
    const totals = computePurchaseGstFromItems(items, form.getFieldValue('gstType') || 'intra');
    setSubTotal(totals.subTotal);
    setTaxTotal(totals.taxTotal);
    setTotal(totals.total);
    form.setFieldValue('taxRate', totals.taxRate);
  }, [items, form]);

  return (
    <>
      <Row gutter={[12, 0]}>
        <Col span={8}>
          <Form.Item name="supplierName" label={translate('supplier_name')}>
            <Input placeholder={translate('supplier_name_optional')} allowClear />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="supplier" label={translate('saved_supplier_optional')}>
            <AutoCompleteAsync
              entity="supplier"
              displayLabels={['name']}
              searchFields="name"
              redirectLabel={translate('add_new_supplier')}
              withRedirect
              urlToRedirect="/supplier"
            />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item
            name="date"
            label={translate('purchase_date')}
            rules={[{ required: true, type: 'object' }]}
            initialValue={dayjs()}
          >
            <DatePicker style={{ width: '100%' }} format={dateFormat} />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item
            label={translate('bill_number')}
            name="number"
            initialValue={lastNumber}
            rules={[{ required: true }]}
          >
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item label={translate('status')} name="status" initialValue="received">
            <Select
              options={[
                { value: 'draft', label: translate('draft') },
                { value: 'ordered', label: translate('ordered') },
                { value: 'received', label: translate('received') },
                { value: 'cancelled', label: translate('cancelled') },
              ]}
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label={translate('Note')} name="notes">
            <Input placeholder={translate('purchase_notes_placeholder')} />
          </Form.Item>
        </Col>
      </Row>

      <AlertHint translate={translate} />
      <Divider dashed />

      <Row gutter={[12, 12]} className="invoice-items-header">
        <Col md={6}><p>{translate('raw_material')}</p></Col>
        <Col md={2}><p>{translate('unit')}</p></Col>
        <Col md={3}><p>{translate('Quantity')}</p></Col>
        <Col md={3}><p>{translate('rate_excl_gst')}</p></Col>
        <Col md={2}><p>{translate('gst_percent')}</p></Col>
        <Col md={3}><p>{translate('gst_value_per_unit')}</p></Col>
        <Col md={3}><p>{translate('total_per_unit')}</p></Col>
        <Col md={3}><p>{translate('line_total')}</p></Col>
      </Row>

      <Form.List name="items">
        {(fields, { add, remove }) => (
          <>
            {fields.map((field) => (
              <RawMaterialRow key={field.key} remove={remove} field={field} current={current} />
            ))}
            <Form.Item>
              <Button type="dashed" onClick={() => add({ quantity: 1, unit: 'kg', gstRate: 0 })} block icon={<PlusOutlined />}>
                {translate('add_raw_material')}
              </Button>
            </Form.Item>
          </>
        )}
      </Form.List>

      <Divider dashed />

      <Form.Item name="year" hidden initialValue={currentYear}>
        <InputNumber />
      </Form.Item>
      <Form.Item name="taxRate" hidden initialValue={0}>
        <InputNumber />
      </Form.Item>
      <Form.Item name="gstType" hidden initialValue="intra">
        <Input />
      </Form.Item>

      <div style={{ width: '100%', float: 'right' }}>
        <Row gutter={[12, -5]}>
          <Col span={5}>
            <Form.Item>
              <Button type="primary" htmlType="submit" icon={<PlusOutlined />} block>
                {translate('Save')}
              </Button>
            </Form.Item>
          </Col>
          <Col span={4} offset={10}>
            <p style={{ textAlign: 'right', margin: 0, paddingTop: 5 }}>{translate('value_excl_gst')} :</p>
          </Col>
          <Col span={5}>
            <MoneyInputFormItem readOnly value={subTotal} />
          </Col>
        </Row>
        <Row gutter={[12, -5]}>
          <Col span={4} offset={15}>
            <p style={{ textAlign: 'right', margin: 0, paddingTop: 5 }}>{translate('gst_total')} :</p>
          </Col>
          <Col span={5}>
            <MoneyInputFormItem readOnly value={taxTotal} />
          </Col>
        </Row>
        <Row gutter={[12, -5]}>
          <Col span={4} offset={15}>
            <p style={{ textAlign: 'right', margin: 0, paddingTop: 5, fontWeight: 600 }}>{translate('Total')} :</p>
          </Col>
          <Col span={5}>
            <MoneyInputFormItem readOnly value={total} />
          </Col>
        </Row>
      </div>
    </>
  );
}

function AlertHint({ translate }) {
  return (
    <div style={{ marginBottom: 8, color: '#666', fontSize: 12 }}>
      {translate('raw_material_purchase_hint')}
    </div>
  );
}

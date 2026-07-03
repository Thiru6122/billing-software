import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { Form, Input, InputNumber, Button, Select, Divider, Row, Col } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { DatePicker } from 'antd';
import AutoCompleteAsync from '@/components/AutoCompleteAsync';
import InvoiceBarcodeScanner from '@/components/InvoiceBarcodeScanner';
import ItemRow from '@/modules/ErpPanelModule/ItemRow';
import MoneyInputFormItem from '@/components/MoneyInputFormItem';
import { selectFinanceSettings, selectCompanySettings } from '@/redux/settings/selectors';
import { useDate } from '@/settings';
import useLanguage from '@/locale/useLanguage';
import { useSelector } from 'react-redux';
import { request } from '@/request';
import { INDIAN_STATES, inferGstType, computeInvoiceGstFromItems } from '@/constants/indianStates';

export default function PurchaseForm({ current = null }) {
  const { last_purchase_number } = useSelector(selectFinanceSettings);
  if (last_purchase_number === undefined) return null;
  return <LoadPurchaseForm current={current} />;
}

function LoadPurchaseForm({ current = null }) {
  const translate = useLanguage();
  const form = Form.useFormInstance();
  const { dateFormat } = useDate();
  const { last_purchase_number } = useSelector(selectFinanceSettings);
  const companySettings = useSelector(selectCompanySettings) || {};
  const companyState = companySettings.company_state || 'Tamil Nadu';

  const [subTotal, setSubTotal] = useState(0);
  const [total, setTotal] = useState(0);
  const [taxTotal, setTaxTotal] = useState(0);
  const [cgstTotal, setCgstTotal] = useState(0);
  const [sgstTotal, setSgstTotal] = useState(0);
  const [igstTotal, setIgstTotal] = useState(0);
  const [gstType, setGstType] = useState('intra');
  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());
  const [lastNumber, setLastNumber] = useState(() => last_purchase_number + 1);

  const placeOfSupply = Form.useWatch('placeOfSupply', form);
  const supplierId = Form.useWatch('supplier', form);
  const items = Form.useWatch('items', form) || [];

  useEffect(() => {
    if (current) {
      setGstType(current.gstType || 'intra');
      setCurrentYear(current.year);
      setLastNumber(current.number);
    } else if (!form.getFieldValue('placeOfSupply')) {
      form.setFieldValue('placeOfSupply', companyState);
      form.setFieldValue('gstType', 'intra');
    }
  }, [current, companyState, form]);

  useEffect(() => {
    if (placeOfSupply) {
      const nextType = inferGstType(placeOfSupply, companyState);
      setGstType(nextType);
      form.setFieldValue('gstType', nextType);
    }
  }, [placeOfSupply, companyState, form]);

  useEffect(() => {
    if (!supplierId || typeof supplierId !== 'string') return;
    request.read({ entity: 'supplier', id: supplierId }).then((res) => {
      if (res?.success && res.result) {
        if (res.result.state) form.setFieldValue('placeOfSupply', res.result.state);
        if (res.result.gstin) form.setFieldValue('supplierGstin', res.result.gstin);
        if (res.result.name) form.setFieldValue('supplierName', res.result.name);
      }
    });
  }, [supplierId, form]);

  useEffect(() => {
    const totals = computeInvoiceGstFromItems(items, gstType);
    setSubTotal(totals.subTotal);
    setTaxTotal(totals.taxTotal);
    setCgstTotal(totals.cgstTotal);
    setSgstTotal(totals.sgstTotal);
    setIgstTotal(totals.igstTotal);
    setTotal(totals.total);
    form.setFieldValue('taxRate', totals.taxRate);
  }, [items, gstType, form]);

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
          <Form.Item name="supplierGstin" label="Supplier GSTIN">
            <Input placeholder="29ABCDE1234F1Z5" maxLength={15} style={{ textTransform: 'uppercase' }} />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="placeOfSupply" label="Place of supply" rules={[{ required: true }]}>
            <Select
              showSearch
              placeholder="Select state"
              options={INDIAN_STATES.map((s) => ({ value: s, label: s }))}
            />
          </Form.Item>
        </Col>
        <Col span={3}>
          <Form.Item label={translate('number')} name="number" initialValue={lastNumber} rules={[{ required: true }]}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
        </Col>
        <Col span={3}>
          <Form.Item label={translate('year')} name="year" initialValue={currentYear} rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
        </Col>
        <Col span={5}>
          <Form.Item label={translate('status')} name="status" initialValue="draft">
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
        <Col span={8}>
          <Form.Item name="date" label={translate('Date')} rules={[{ required: true, type: 'object' }]} initialValue={dayjs()}>
            <DatePicker style={{ width: '100%' }} format={dateFormat} />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="expectedDate" label={translate('expected_date')} initialValue={dayjs().add(7, 'days')}>
            <DatePicker style={{ width: '100%' }} format={dateFormat} />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label={translate('Note')} name="notes">
            <Input />
          </Form.Item>
        </Col>
      </Row>
      <AlertHint translate={translate} />
      <Divider dashed />
      <Row gutter={[12, 12]} className="invoice-items-header">
        <Col md={6}><p>{translate('Item')}</p></Col>
        <Col md={2}><p>HSN</p></Col>
        <Col md={3}><p>{translate('description')}</p></Col>
        <Col md={2}><p>{translate('Quantity')}</p></Col>
        <Col md={4}><p>{translate('cost')}</p></Col>
        <Col md={3}><p>GST</p></Col>
        <Col md={4}><p>{translate('line_total')}</p></Col>
      </Row>
      <Form.List name="items">
        {(fields, { add, remove }) => (
          <>
            <InvoiceBarcodeScanner add={add} />
            {fields.map((field) => (
              <ItemRow
                key={field.key}
                remove={remove}
                field={field}
                current={current}
                scanOnly={false}
                showHsn={true}
              />
            ))}
          </>
        )}
      </Form.List>
      <Divider dashed />
      <TotalsBlock
        translate={translate}
        subTotal={subTotal}
        taxTotal={taxTotal}
        cgstTotal={cgstTotal}
        sgstTotal={sgstTotal}
        igstTotal={igstTotal}
        total={total}
        gstType={gstType}
      />
    </>
  );
}

function AlertHint({ translate }) {
  return (
    <div style={{ marginBottom: 8, color: '#666', fontSize: 12 }}>
      {translate('purchase_stock_hint')}
    </div>
  );
}

function TotalsBlock({ translate, subTotal, taxTotal, cgstTotal, sgstTotal, igstTotal, total, gstType }) {
  return (
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
          <p style={{ textAlign: 'right', margin: 0, paddingTop: 5 }}>Product value (excl. GST) :</p>
        </Col>
        <Col span={5}>
          <MoneyInputFormItem readOnly value={subTotal} />
        </Col>
      </Row>
      <Form.Item name="taxRate" hidden rules={[{ required: true }]}>
        <InputNumber />
      </Form.Item>
      <Form.Item name="gstType" hidden>
        <Input />
      </Form.Item>
      <Row gutter={[12, -5]}>
        <Col span={4} offset={15}>
          <p style={{ textAlign: 'right', margin: 0, paddingTop: 5 }}>GST :</p>
        </Col>
        <Col span={5}>
          <MoneyInputFormItem readOnly value={taxTotal} />
        </Col>
      </Row>
      {gstType === 'intra' && taxTotal > 0 && (
        <>
          <Row gutter={[12, -5]}>
            <Col span={4} offset={15}><p style={{ textAlign: 'right', margin: 0, paddingTop: 5 }}>CGST :</p></Col>
            <Col span={5}><MoneyInputFormItem readOnly value={cgstTotal} /></Col>
          </Row>
          <Row gutter={[12, -5]}>
            <Col span={4} offset={15}><p style={{ textAlign: 'right', margin: 0, paddingTop: 5 }}>SGST :</p></Col>
            <Col span={5}><MoneyInputFormItem readOnly value={sgstTotal} /></Col>
          </Row>
        </>
      )}
      {gstType === 'inter' && taxTotal > 0 && (
        <Row gutter={[12, -5]}>
          <Col span={4} offset={15}><p style={{ textAlign: 'right', margin: 0, paddingTop: 5 }}>IGST :</p></Col>
          <Col span={5}><MoneyInputFormItem readOnly value={igstTotal} /></Col>
        </Row>
      )}
      <Row gutter={[12, -5]}>
        <Col span={4} offset={15}>
          <p style={{ textAlign: 'right', margin: 0, paddingTop: 5 }}>{translate('Total')} :</p>
        </Col>
        <Col span={5}>
          <MoneyInputFormItem readOnly value={total} />
        </Col>
      </Row>
    </div>
  );
}

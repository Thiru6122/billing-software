import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { Form, Input, InputNumber, Button, Select, Divider, Row, Col, Radio } from 'antd';

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
import { INDIAN_STATES, inferGstType, computeInvoiceGstFromItems } from '@/constants/indianStates';
import { request } from '@/request';

export default function InvoiceForm({ current = null }) {
  const { last_invoice_number } = useSelector(selectFinanceSettings);

  if (last_invoice_number === undefined) {
    return <></>;
  }

  return <LoadInvoiceForm current={current} />;
}

function LoadInvoiceForm({ current = null }) {
  const translate = useLanguage();
  const form = Form.useFormInstance();
  const { dateFormat } = useDate();
  const { last_invoice_number } = useSelector(selectFinanceSettings);
  const companySettings = useSelector(selectCompanySettings) || {};
  const companyState = companySettings.company_state || 'Tamil Nadu';

  const [subTotal, setSubTotal] = useState(0);
  const [total, setTotal] = useState(0);
  const [taxRate, setTaxRate] = useState(0);
  const [taxTotal, setTaxTotal] = useState(0);
  const [cgstTotal, setCgstTotal] = useState(0);
  const [sgstTotal, setSgstTotal] = useState(0);
  const [igstTotal, setIgstTotal] = useState(0);
  const [gstType, setGstType] = useState('intra');
  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());
  const [lastNumber, setLastNumber] = useState(() => last_invoice_number + 1);

  const placeOfSupply = Form.useWatch('placeOfSupply', form);
  const clientId = Form.useWatch('client', form);
  const items = Form.useWatch('items', form) || [];

  useEffect(() => {
    if (current) {
      const {
        taxRate: tr = 0,
        year,
        number,
        gstType: gt = 'intra',
        placeOfSupply: pos,
      } = current;
      setTaxRate(tr);
      setGstType(gt || inferGstType(pos, companyState));
      setCurrentYear(year);
      setLastNumber(number);
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
    if (!clientId || typeof clientId !== 'string') return;
    request.read({ entity: 'client', id: clientId }).then((res) => {
      if (res?.success && res.result) {
        if (res.result.state) form.setFieldValue('placeOfSupply', res.result.state);
        if (res.result.gstin) form.setFieldValue('customerGstin', res.result.gstin);
      }
    });
  }, [clientId, form]);

  useEffect(() => {
    const totals = computeInvoiceGstFromItems(items, gstType);
    setSubTotal(totals.subTotal);
    setTaxTotal(totals.taxTotal);
    setCgstTotal(totals.cgstTotal);
    setSgstTotal(totals.sgstTotal);
    setIgstTotal(totals.igstTotal);
    setTaxRate(totals.taxRate);
    setTotal(totals.total);
    form.setFieldValue('taxRate', totals.taxRate);
  }, [items, gstType, form]);

  return (
    <>
      <Row gutter={[12, 0]}>
        <Col className="gutter-row" span={8}>
          <Form.Item name="customerName" label={translate('customer_name')}>
            <Input placeholder={translate('customer_name_optional')} allowClear />
          </Form.Item>
        </Col>
        <Col className="gutter-row" span={8}>
          <Form.Item name="client" label={translate('saved_client_optional')}>
            <AutoCompleteAsync
              entity={'client'}
              displayLabels={['name']}
              searchFields={'name'}
              redirectLabel={'Add New Client'}
              withRedirect
              urlToRedirect={'/customer'}
            />
          </Form.Item>
        </Col>
        <Col className="gutter-row" span={8}>
          <Form.Item name="customerGstin" label="Customer GSTIN">
            <Input placeholder="29ABCDE1234F1Z5" maxLength={15} style={{ textTransform: 'uppercase' }} />
          </Form.Item>
        </Col>
        <Col className="gutter-row" span={8}>
          <Form.Item name="placeOfSupply" label="Place of supply" rules={[{ required: true }]}>
            <Select
              showSearch
              placeholder="Select state"
              options={INDIAN_STATES.map((s) => ({ value: s, label: s }))}
            />
          </Form.Item>
        </Col>
        <Col className="gutter-row" span={8}>
          <Form.Item name="gstType" label="GST type">
            <Radio.Group
              value={gstType}
              onChange={(e) => {
                setGstType(e.target.value);
                form.setFieldValue('gstType', e.target.value);
              }}
            >
              <Radio value="intra">Intra-state (CGST + SGST)</Radio>
              <Radio value="inter">Inter-state (IGST)</Radio>
            </Radio.Group>
          </Form.Item>
        </Col>
        <Col className="gutter-row" span={3}>
          <Form.Item
            label={translate('number')}
            name="number"
            initialValue={lastNumber}
            rules={[{ required: true }]}
          >
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
        </Col>
        <Col className="gutter-row" span={3}>
          <Form.Item
            label={translate('year')}
            name="year"
            initialValue={currentYear}
            rules={[{ required: true }]}
          >
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
        </Col>

        <Col className="gutter-row" span={5}>
          <Form.Item label={translate('status')} name="status" initialValue={'draft'}>
            <Select
              options={[
                { value: 'draft', label: translate('Draft') },
                { value: 'pending', label: translate('Pending') },
                { value: 'sent', label: translate('Sent') },
              ]}
            />
          </Form.Item>
        </Col>

        <Col className="gutter-row" span={8}>
          <Form.Item
            name="date"
            label={translate('Date')}
            rules={[{ required: true, type: 'object' }]}
            initialValue={dayjs()}
          >
            <DatePicker style={{ width: '100%' }} format={dateFormat} />
          </Form.Item>
        </Col>
        <Col className="gutter-row" span={6}>
          <Form.Item
            name="expiredDate"
            label={translate('Expire Date')}
            rules={[{ required: true, type: 'object' }]}
            initialValue={dayjs().add(30, 'days')}
          >
            <DatePicker style={{ width: '100%' }} format={dateFormat} />
          </Form.Item>
        </Col>
        <Col className="gutter-row" span={10}>
          <Form.Item label={translate('Note')} name="notes">
            <Input />
          </Form.Item>
        </Col>
      </Row>
      <div style={{ marginBottom: 8, color: '#666', fontSize: 12 }}>
        {translate('invoice_price_edit_hint')}
      </div>
      <Divider dashed />
      <Row gutter={[12, 12]} style={{ position: 'relative' }} className="invoice-items-header">
        <Col className="gutter-row" xs={24} sm={12} md={6}>
          <p>{translate('Item')}</p>
        </Col>
        <Col className="gutter-row" xs={8} sm={4} md={2}>
          <p>HSN</p>
        </Col>
        <Col className="gutter-row" xs={16} sm={8} md={3}>
          <p>{translate('description')}</p>
        </Col>
        <Col className="gutter-row" xs={8} sm={4} md={2}>
          <p>{translate('Quantity')}</p>
        </Col>
        <Col className="gutter-row" xs={16} sm={8} md={4}>
          <p>{translate('unit_price')}</p>
        </Col>
        <Col className="gutter-row" xs={12} sm={6} md={3}>
          <p>GST</p>
        </Col>
        <Col className="gutter-row" xs={12} sm={6} md={4}>
          <p>{translate('line_total')}</p>
        </Col>
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
                scanOnly={true}
                priceEditable={true}
                showHsn={true}
              />
            ))}
          </>
        )}
      </Form.List>
      <Divider dashed />
      <div style={{ position: 'relative', width: ' 100%', float: 'right' }}>
        <Row gutter={[12, -5]}>
          <Col className="gutter-row" span={5}>
            <Form.Item>
              <Button type="primary" htmlType="submit" icon={<PlusOutlined />} block>
                {translate('Save')}
              </Button>
            </Form.Item>
          </Col>
          <Col className="gutter-row" span={4} offset={10}>
            <p style={{ paddingLeft: '12px', paddingTop: '5px', margin: 0, textAlign: 'right' }}>
              Product value (excl. GST) :
            </p>
          </Col>
          <Col className="gutter-row" span={5}>
            <MoneyInputFormItem readOnly value={subTotal} />
          </Col>
        </Row>
        <Form.Item name="taxRate" hidden rules={[{ required: true }]}>
          <InputNumber />
        </Form.Item>
        <Row gutter={[12, -5]}>
          <Col className="gutter-row" span={4} offset={15}>
            <p style={{ paddingLeft: '12px', paddingTop: '5px', margin: 0, textAlign: 'right' }}>
              GST :
            </p>
          </Col>
          <Col className="gutter-row" span={5}>
            <MoneyInputFormItem readOnly value={taxTotal} />
          </Col>
        </Row>
        {gstType === 'intra' && taxTotal > 0 && (
          <>
            <Row gutter={[12, -5]}>
              <Col className="gutter-row" span={4} offset={15}>
                <p style={{ paddingLeft: '12px', paddingTop: '5px', margin: 0, textAlign: 'right' }}>
                  CGST :
                </p>
              </Col>
              <Col className="gutter-row" span={5}>
                <MoneyInputFormItem readOnly value={cgstTotal} />
              </Col>
            </Row>
            <Row gutter={[12, -5]}>
              <Col className="gutter-row" span={4} offset={15}>
                <p style={{ paddingLeft: '12px', paddingTop: '5px', margin: 0, textAlign: 'right' }}>
                  SGST :
                </p>
              </Col>
              <Col className="gutter-row" span={5}>
                <MoneyInputFormItem readOnly value={sgstTotal} />
              </Col>
            </Row>
          </>
        )}
        {gstType === 'inter' && taxTotal > 0 && (
          <Row gutter={[12, -5]}>
            <Col className="gutter-row" span={4} offset={15}>
              <p style={{ paddingLeft: '12px', paddingTop: '5px', margin: 0, textAlign: 'right' }}>
                IGST :
              </p>
            </Col>
            <Col className="gutter-row" span={5}>
              <MoneyInputFormItem readOnly value={igstTotal} />
            </Col>
          </Row>
        )}
        <Row gutter={[12, -5]}>
          <Col className="gutter-row" span={4} offset={15}>
            <p style={{ paddingLeft: '12px', paddingTop: '5px', margin: 0, textAlign: 'right' }}>
              {translate('Total')} :
            </p>
          </Col>
          <Col className="gutter-row" span={5}>
            <MoneyInputFormItem readOnly value={total} />
          </Col>
        </Row>
      </div>
    </>
  );
}

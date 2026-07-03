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
import { INDIAN_STATES } from '@/constants/indianStates';
import { request } from '@/request';
import calculate from '@/utils/calculate';

export default function QuoteForm({ subTotal: parentSubTotal = 0, current = null }) {
  const { last_quote_number } = useSelector(selectFinanceSettings);

  if (last_quote_number === undefined) {
    return null;
  }

  return <LoadQuoteForm current={current} />;
}

function LoadQuoteForm({ current = null }) {
  const translate = useLanguage();
  const form = Form.useFormInstance();
  const { dateFormat } = useDate();
  const { last_quote_number } = useSelector(selectFinanceSettings);
  const companySettings = useSelector(selectCompanySettings) || {};
  const companyState = companySettings.company_state || 'Tamil Nadu';

  const [subTotal, setSubTotal] = useState(0);
  const [total, setTotal] = useState(0);
  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());
  const [lastNumber, setLastNumber] = useState(() => last_quote_number + 1);

  const clientId = Form.useWatch('client', form);
  const items = Form.useWatch('items', form) || [];

  useEffect(() => {
    if (current) {
      setCurrentYear(current.year);
      setLastNumber(current.number);
    } else if (!form.getFieldValue('placeOfSupply')) {
      form.setFieldValue('placeOfSupply', companyState);
    }
  }, [current, companyState, form]);

  useEffect(() => {
    if (!clientId || typeof clientId !== 'string') return;
    request.read({ entity: 'client', id: clientId }).then((res) => {
      if (res?.success && res.result) {
        if (res.result.state) form.setFieldValue('placeOfSupply', res.result.state);
        if (res.result.gstin) form.setFieldValue('customerGstin', res.result.gstin);
        if (res.result.name) form.setFieldValue('customerName', res.result.name);
      }
    });
  }, [clientId, form]);

  useEffect(() => {
    let sum = 0;
    items.forEach((item) => {
      if (item?.quantity && item?.price) {
        sum = calculate.add(sum, calculate.multiply(item.quantity, item.price));
      }
    });
    setSubTotal(sum);
    setTotal(sum);
    form.setFieldValue('taxRate', 0);
  }, [items, form]);

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
              entity="client"
              displayLabels={['name']}
              searchFields="name"
              redirectLabel="Add New Client"
              withRedirect
              urlToRedirect="/customer"
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
        <Col className="gutter-row" span={3}>
          <Form.Item label={translate('number')} name="number" initialValue={lastNumber} rules={[{ required: true }]}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
        </Col>
        <Col className="gutter-row" span={3}>
          <Form.Item label={translate('year')} name="year" initialValue={currentYear} rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
        </Col>
        <Col className="gutter-row" span={5}>
          <Form.Item label={translate('status')} name="status" initialValue="draft">
            <Select
              options={[
                { value: 'draft', label: translate('Draft') },
                { value: 'pending', label: translate('Pending') },
                { value: 'sent', label: translate('Sent') },
                { value: 'accepted', label: translate('Accepted') },
                { value: 'declined', label: translate('Declined') },
              ]}
            />
          </Form.Item>
        </Col>
        <Col className="gutter-row" span={8}>
          <Form.Item name="date" label={translate('Date')} rules={[{ required: true, type: 'object' }]} initialValue={dayjs()}>
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
        <Col className="gutter-row" xs={16} sm={8} md={4}>
          <p>{translate('description')}</p>
        </Col>
        <Col className="gutter-row" xs={8} sm={4} md={3}>
          <p>{translate('Quantity')}</p>
        </Col>
        <Col className="gutter-row" xs={16} sm={8} md={4}>
          <p>{translate('unit_price')}</p>
        </Col>
        <Col className="gutter-row" xs={12} sm={6} md={5}>
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
                hideGst={true}
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
              {translate('Sub Total')} :
            </p>
          </Col>
          <Col className="gutter-row" span={5}>
            <MoneyInputFormItem readOnly value={subTotal} />
          </Col>
        </Row>
        <Form.Item name="taxRate" hidden initialValue={0}>
          <InputNumber />
        </Form.Item>
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

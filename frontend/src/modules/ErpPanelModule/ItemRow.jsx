import { useEffect } from 'react';
import { Form, Input, InputNumber, Row, Col } from 'antd';

import { DeleteOutlined } from '@ant-design/icons';
import { useMoney } from '@/settings';
import calculate from '@/utils/calculate';
import useLanguage from '@/locale/useLanguage';
import { splitGstInclusive } from '@/constants/indianStates';

export default function ItemRow({
  field,
  remove,
  current = null,
  scanOnly = false,
  priceEditable = false,
  showHsn = false,
}) {
  const translate = useLanguage();
  const form = Form.useFormInstance();
  const money = useMoney();

  const quantity = Form.useWatch(['items', field.name, 'quantity'], form);
  const price = Form.useWatch(['items', field.name, 'price'], form);
  const gstRate = Form.useWatch(['items', field.name, 'gstRate'], form);

  const lineInclusive = Number.parseFloat(
    calculate.multiply(Number(price) || 0, Number(quantity) || 0)
  );
  const { taxable: lineTaxable, gst: lineGst } = splitGstInclusive(lineInclusive, gstRate);

  useEffect(() => {
    if (current) {
      const { items, invoice } = current;
      const item = invoice ? invoice[field.fieldKey] : items?.[field.fieldKey];
      if (item) {
        form.setFieldValue(['items', field.name, 'quantity'], item.quantity);
        form.setFieldValue(['items', field.name, 'price'], item.price);
        if (item.gstRate != null) {
          form.setFieldValue(['items', field.name, 'gstRate'], item.gstRate);
        }
      }
    }
  }, [current, field.fieldKey, field.name, form]);

  const handleQuantityChange = (value) => {
    const q = value || 1;
    const p = form.getFieldValue(['items', field.name, 'price']) || 0;
    form.setFieldValue(['items', field.name, 'total'], calculate.multiply(p, q));
  };

  const priceReadOnly = scanOnly && !priceEditable;

  const moneyInputProps = {
    readOnly: true,
    className: 'moneyInput',
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

  const editablePriceInputProps = {
    className: 'moneyInput',
    min: 0,
    controls: false,
    style: { width: '100%' },
    addonAfter: money.currency_position === 'after' ? money.currency_symbol : undefined,
    addonBefore: money.currency_position === 'before' ? money.currency_symbol : undefined,
  };

  if (showHsn) {
    return (
      <Row gutter={[12, 12]} style={{ position: 'relative' }} className="invoice-item-row">
        <Form.Item name={[field.name, 'product']} hidden>
          <Input />
        </Form.Item>
        <Form.Item name={[field.name, 'total']} hidden>
          <Input />
        </Form.Item>
        <Form.Item name={[field.name, 'gstRate']} hidden>
          <InputNumber />
        </Form.Item>
        <Col className="gutter-row" xs={24} sm={12} md={6}>
          <Form.Item
            name={[field.name, 'itemName']}
            rules={[{ required: true, message: 'Missing item name' }]}
          >
            <Input placeholder={translate('name')} readOnly={scanOnly} />
          </Form.Item>
        </Col>
        <Col className="gutter-row" xs={8} sm={4} md={2}>
          <Form.Item name={[field.name, 'hsnCode']}>
            <Input placeholder="HSN" readOnly={scanOnly} />
          </Form.Item>
        </Col>
        <Col className="gutter-row" xs={16} sm={8} md={3}>
          <Form.Item name={[field.name, 'description']}>
            <Input placeholder={translate('description')} readOnly={scanOnly} />
          </Form.Item>
        </Col>
        <Col className="gutter-row" xs={8} sm={4} md={2}>
          <Form.Item name={[field.name, 'quantity']} rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} min={1} onChange={handleQuantityChange} />
          </Form.Item>
        </Col>
        <Col className="gutter-row" xs={16} sm={8} md={4}>
          <Form.Item name={[field.name, 'price']} rules={[{ required: true }]}>
            <InputNumber
              {...(priceReadOnly ? moneyInputProps : editablePriceInputProps)}
              readOnly={priceReadOnly}
              onChange={(value) => {
                const q = form.getFieldValue(['items', field.name, 'quantity']) || 1;
                form.setFieldValue(['items', field.name, 'total'], calculate.multiply(value || 0, q));
              }}
            />
          </Form.Item>
        </Col>
        <Col className="gutter-row" xs={12} sm={6} md={3}>
          <Form.Item label={false}>
            <InputNumber {...moneyInputProps} value={lineGst} />
          </Form.Item>
        </Col>
        <Col className="gutter-row" xs={12} sm={6} md={4}>
          <Form.Item label={false}>
            <InputNumber {...moneyInputProps} value={lineInclusive} />
          </Form.Item>
        </Col>
        <div className="invoice-item-row__delete">
          <DeleteOutlined onClick={() => remove(field.name)} />
        </div>
      </Row>
    );
  }

  return (
    <Row gutter={[12, 12]} style={{ position: 'relative' }}>
      <Form.Item name={[field.name, 'product']} hidden>
        <Input />
      </Form.Item>
      <Form.Item name={[field.name, 'total']} hidden>
        <Input />
      </Form.Item>
      <Form.Item name={[field.name, 'gstRate']} hidden>
        <InputNumber />
      </Form.Item>
      <Col className="gutter-row" span={showHsn ? 5 : scanOnly ? 6 : 4}>
        <Form.Item
          name={[field.name, 'itemName']}
          rules={[
            {
              required: true,
              message: 'Missing item name',
            },
          ]}
        >
          <Input placeholder={translate('name')} readOnly={scanOnly} />
        </Form.Item>
      </Col>
      {showHsn && (
        <Col className="gutter-row" span={3}>
          <Form.Item name={[field.name, 'hsnCode']}>
            <Input placeholder="HSN" readOnly={scanOnly} />
          </Form.Item>
        </Col>
      )}
      <Col className="gutter-row" span={showHsn ? 4 : scanOnly ? 6 : 5}>
        <Form.Item name={[field.name, 'description']}>
          <Input placeholder={translate('description')} readOnly={scanOnly} />
        </Form.Item>
      </Col>
      <Col className="gutter-row" span={showHsn ? 3 : scanOnly ? 4 : 3}>
        <Form.Item name={[field.name, 'quantity']} rules={[{ required: true }]}>
          <InputNumber style={{ width: '100%' }} min={1} onChange={handleQuantityChange} />
        </Form.Item>
      </Col>
      <Col className="gutter-row" span={showHsn ? 2 : scanOnly ? 3 : 3}>
        <InputNumber
          readOnly
          className="moneyInput"
          value={lineTaxable}
          min={0}
          controls={false}
          style={{ width: '100%' }}
          addonAfter={money.currency_position === 'after' ? money.currency_symbol : undefined}
          addonBefore={money.currency_position === 'before' ? money.currency_symbol : undefined}
          formatter={(value) =>
            money.amountFormatter({
              amount: value ?? 0,
              currency_code: money.currency_code,
            })
          }
        />
      </Col>
      {showHsn && (
        <Col className="gutter-row" span={2}>
          <InputNumber
            readOnly
            className="moneyInput"
            value={lineGst}
            min={0}
            controls={false}
            style={{ width: '100%' }}
            addonAfter={money.currency_position === 'after' ? money.currency_symbol : undefined}
            addonBefore={money.currency_position === 'before' ? money.currency_symbol : undefined}
            formatter={(value) =>
              money.amountFormatter({
                amount: value ?? 0,
                currency_code: money.currency_code,
              })
            }
          />
        </Col>
      )}
      <Col className="gutter-row" span={showHsn ? 2 : scanOnly ? 4 : 4}>
        <InputNumber
          readOnly
          className="moneyInput"
          value={lineInclusive}
          min={0}
          controls={false}
          style={{ width: '100%' }}
          addonAfter={money.currency_position === 'after' ? money.currency_symbol : undefined}
          addonBefore={money.currency_position === 'before' ? money.currency_symbol : undefined}
          formatter={(value) =>
            money.amountFormatter({
              amount: value ?? 0,
              currency_code: money.currency_code,
            })
          }
        />
      </Col>

      <Form.Item name={[field.name, 'price']} rules={[{ required: true }]} hidden={showHsn}>
        <InputNumber
          className="moneyInput"
          min={0}
          controls={false}
          readOnly={priceReadOnly}
          addonAfter={money.currency_position === 'after' ? money.currency_symbol : undefined}
          addonBefore={money.currency_position === 'before' ? money.currency_symbol : undefined}
          onChange={(value) => {
            const q = form.getFieldValue(['items', field.name, 'quantity']) || 1;
            form.setFieldValue(['items', field.name, 'total'], calculate.multiply(value || 0, q));
          }}
        />
      </Form.Item>

      <div style={{ position: 'absolute', right: '-20px', top: ' 5px' }}>
        <DeleteOutlined onClick={() => remove(field.name)} />
      </div>
    </Row>
  );
}

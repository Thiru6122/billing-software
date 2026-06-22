import { useEffect } from 'react';
import { Form, Input, InputNumber, Row, Col } from 'antd';

import { DeleteOutlined } from '@ant-design/icons';
import { useMoney } from '@/settings';
import calculate from '@/utils/calculate';
import useLanguage from '@/locale/useLanguage';

export default function ItemRow({ field, remove, current = null, scanOnly = false, showHsn = false }) {
  const translate = useLanguage();
  const form = Form.useFormInstance();
  const money = useMoney();

  const quantity = Form.useWatch(['items', field.name, 'quantity'], form);
  const price = Form.useWatch(['items', field.name, 'price'], form);

  const lineTotal = Number.parseFloat(
    calculate.multiply(Number(price) || 0, Number(quantity) || 0)
  );

  useEffect(() => {
    if (current) {
      const { items, invoice } = current;
      const item = invoice ? invoice[field.fieldKey] : items?.[field.fieldKey];
      if (item) {
        form.setFieldValue(['items', field.name, 'quantity'], item.quantity);
        form.setFieldValue(['items', field.name, 'price'], item.price);
      }
    }
  }, [current, field.fieldKey, field.name, form]);

  const handleQuantityChange = (value) => {
    const q = value || 1;
    const p = form.getFieldValue(['items', field.name, 'price']) || 0;
    form.setFieldValue(['items', field.name, 'total'], calculate.multiply(p, q));
  };

  return (
    <Row gutter={[12, 12]} style={{ position: 'relative' }}>
      <Form.Item name={[field.name, 'product']} hidden>
        <Input />
      </Form.Item>
      <Form.Item name={[field.name, 'total']} hidden>
        <Input />
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
      <Col className="gutter-row" span={3}>
        <Form.Item name={[field.name, 'quantity']} rules={[{ required: true }]}>
          <InputNumber style={{ width: '100%' }} min={1} onChange={handleQuantityChange} />
        </Form.Item>
      </Col>
      <Col className="gutter-row" span={scanOnly ? 4 : 3}>
        <Form.Item name={[field.name, 'price']} rules={[{ required: true }]}>
          <InputNumber
            className="moneyInput"
            min={0}
            controls={false}
            readOnly={scanOnly}
            addonAfter={money.currency_position === 'after' ? money.currency_symbol : undefined}
            addonBefore={money.currency_position === 'before' ? money.currency_symbol : undefined}
          />
        </Form.Item>
      </Col>
      <Col className="gutter-row" span={scanOnly ? 4 : 4}>
        <InputNumber
          readOnly
          className="moneyInput"
          value={lineTotal}
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

      <div style={{ position: 'absolute', right: '-20px', top: ' 5px' }}>
        <DeleteOutlined onClick={() => remove(field.name)} />
      </div>
    </Row>
  );
}

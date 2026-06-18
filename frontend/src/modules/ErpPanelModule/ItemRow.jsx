import { useState, useEffect } from 'react';
import { Form, Input, InputNumber, Row, Col } from 'antd';

import { DeleteOutlined } from '@ant-design/icons';
import { useMoney } from '@/settings';
import calculate from '@/utils/calculate';
import useLanguage from '@/locale/useLanguage';

export default function ItemRow({ field, remove, current = null, scanOnly = false }) {
  const translate = useLanguage();
  const form = Form.useFormInstance();
  const [totalState, setTotal] = useState(0);
  const lineItem = Form.useWatch(['items', field.name], form);
  const money = useMoney();

  useEffect(() => {
    if (current && !lineItem) {
      const { items, invoice } = current;
      const item = invoice ? invoice[field.fieldKey] : items?.[field.fieldKey];
      if (item) {
        syncLine(item.quantity, item.price);
      }
    }
  }, [current]);

  useEffect(() => {
    if (lineItem) {
      syncLine(lineItem.quantity, lineItem.price);
    }
  }, [lineItem?.quantity, lineItem?.price, lineItem?.itemName]);

  const syncLine = (quantity, price) => {
    const q = Number(quantity) || 0;
    const p = Number(price) || 0;
    const lineTotal = Number.parseFloat(calculate.multiply(p, q));
    setTotalState(lineTotal);

    const items = [...(form.getFieldValue('items') || [])];
    if (!items[field.name]) return;

    if (items[field.name].total === lineTotal && items[field.name].quantity === q) return;

    items[field.name] = {
      ...items[field.name],
      quantity: q || 1,
      price: p,
      total: lineTotal,
    };
    form.setFieldsValue({ items });
  };

  const handleQuantityChange = (value) => {
    const q = value || 1;
    const p = lineItem?.price || 0;
    syncLine(q, p);
  };

  return (
    <Row gutter={[12, 12]} style={{ position: 'relative' }}>
      <Form.Item name={[field.name, 'product']} hidden>
        <Input />
      </Form.Item>
      <Col className="gutter-row" span={scanOnly ? 6 : 4}>
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
      <Col className="gutter-row" span={scanOnly ? 6 : 5}>
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
        <Form.Item name={[field.name, 'total']}>
          <InputNumber
            readOnly
            className="moneyInput"
            value={totalState}
            min={0}
            controls={false}
            addonAfter={money.currency_position === 'after' ? money.currency_symbol : undefined}
            addonBefore={money.currency_position === 'before' ? money.currency_symbol : undefined}
            formatter={(value) =>
              money.amountFormatter({ amount: value, currency_code: money.currency_code })
            }
          />
        </Form.Item>
      </Col>

      <div style={{ position: 'absolute', right: '-20px', top: ' 5px' }}>
        <DeleteOutlined onClick={() => remove(field.name)} />
      </div>
    </Row>
  );
}

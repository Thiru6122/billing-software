import dayjs from 'dayjs';
import { Form, Input, Select, DatePicker, InputNumber } from 'antd';
import AutoCompleteAsync from '@/components/AutoCompleteAsync';
import useLanguage from '@/locale/useLanguage';
import { useDate, useMoney } from '@/settings';

export default function ExpenseForm() {
  const translate = useLanguage();
  const { dateFormat } = useDate();
  const { currency_symbol, cent_precision } = useMoney();

  return (
    <>
      <Form.Item
        name="date"
        label={translate('date')}
        rules={[{ required: true, message: translate('required') }]}
        getValueProps={(value) => ({ value: value ? dayjs(value) : undefined })}
        normalize={(value) => (value ? value.toISOString() : value)}
        initialValue={dayjs()}
      >
        <DatePicker style={{ width: '100%' }} format={dateFormat} />
      </Form.Item>

      <Form.Item
        name="amount"
        label={translate('Amount')}
        rules={[
          { required: true, message: translate('required') },
          { type: 'number', min: 0.01, message: translate('required') },
        ]}
      >
        <InputNumber
          min={0}
          precision={cent_precision ?? 2}
          style={{ width: '100%' }}
          addonBefore={currency_symbol}
        />
      </Form.Item>

      <Form.Item name="categoryName" label={translate('expense_category')}>
        <Input placeholder={translate('category')} allowClear />
      </Form.Item>

      <Form.Item name="category" label={translate('saved_category_optional')}>
        <AutoCompleteAsync
          entity="expensecategory"
          displayLabels={['name']}
          searchFields="name"
          redirectLabel={translate('add_new_expense_category')}
          withRedirect
          urlToRedirect="/expense-categories"
        />
      </Form.Item>

      <Form.Item name="paymentMode" label={translate('Payment Mode')}>
        <AutoCompleteAsync
          entity="paymentMode"
          displayLabels={['name']}
          searchFields="name"
          redirectLabel={translate('add_new_payment_mode')}
          withRedirect
          urlToRedirect="/payment/mode"
        />
      </Form.Item>

      <Form.Item name="ref" label={translate('reference')}>
        <Input placeholder={translate('reference')} allowClear />
      </Form.Item>

      <Form.Item name="description" label={translate('description')}>
        <Input.TextArea rows={3} />
      </Form.Item>

      <Form.Item
        name="status"
        label={translate('Status')}
        initialValue="paid"
        rules={[{ required: true }]}
      >
        <Select>
          <Select.Option value="pending">{translate('pending')}</Select.Option>
          <Select.Option value="paid">{translate('paid')}</Select.Option>
          <Select.Option value="cancelled">{translate('cancelled')}</Select.Option>
        </Select>
      </Form.Item>
    </>
  );
}

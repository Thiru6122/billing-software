import dayjs from 'dayjs';
import CrudModule from '@/modules/CrudModule/CrudModule';
import ExpenseForm from '@/forms/ExpenseForm';
import useLanguage from '@/locale/useLanguage';
import { useMoney, useDate } from '@/settings';
import { Tag } from 'antd';

export default function Expense() {
  const translate = useLanguage();
  const { moneyFormatter } = useMoney();
  const { dateFormat } = useDate();
  const entity = 'expense';

  const dataTableColumns = [
    {
      title: translate('Number'),
      dataIndex: 'number',
      render: (number, record) => `${number}/${record.year}`,
    },
    {
      title: translate('date'),
      dataIndex: 'date',
      render: (date) => dayjs(date).format(dateFormat),
    },
    {
      title: translate('expense_category'),
      dataIndex: 'categoryName',
      render: (_, record) => record.categoryName || record.category?.name || '—',
    },
    {
      title: translate('Amount'),
      dataIndex: 'amount',
      onCell: () => ({
        style: { textAlign: 'right', whiteSpace: 'nowrap', direction: 'ltr' },
      }),
      render: (amount, record) =>
        moneyFormatter({ amount, currency_code: record.currency }),
    },
    {
      title: translate('Payment Mode'),
      dataIndex: ['paymentMode', 'name'],
      render: (_, record) => record.paymentMode?.name || '—',
    },
    {
      title: translate('Status'),
      dataIndex: 'status',
      render: (status) => {
        const color =
          status === 'paid' ? 'green' : status === 'pending' ? 'orange' : 'default';
        return <Tag color={color}>{status}</Tag>;
      },
    },
  ];

  const readColumns = [
    { title: translate('Number'), dataIndex: 'number' },
    { title: translate('year'), dataIndex: 'year' },
    {
      title: translate('date'),
      dataIndex: 'date',
      render: (date) => dayjs(date).format(dateFormat),
    },
    {
      title: translate('expense_category'),
      dataIndex: 'categoryName',
    },
    { title: translate('Amount'), dataIndex: 'amount' },
    { title: translate('Payment Mode'), dataIndex: ['paymentMode', 'name'] },
    { title: translate('reference'), dataIndex: 'ref' },
    { title: translate('description'), dataIndex: 'description' },
    { title: translate('Status'), dataIndex: 'status' },
  ];

  return (
    <CrudModule
      createForm={<ExpenseForm />}
      updateForm={<ExpenseForm />}
      config={{
        entity,
        PANEL_TITLE: translate('expenses'),
        DATATABLE_TITLE: translate('expense_list'),
        ADD_NEW_ENTITY: translate('add_new_expense'),
        ENTITY_NAME: translate('expense'),
        dataTableColumns,
        readColumns,
        searchConfig: {
          displayLabels: ['categoryName', 'description', 'ref'],
          searchFields: 'categoryName,description,ref',
        },
        deleteModalLabels: ['number', 'categoryName'],
      }}
    />
  );
}

import { Table } from 'antd';
import dayjs from 'dayjs';
import { request } from '@/request';
import useFetch from '@/hooks/useFetch';
import useLanguage from '@/locale/useLanguage';
import { useMoney, useDate } from '@/settings';

export default function RecentExpensesTable({ columns }) {
  const translate = useLanguage();
  const { moneyFormatter } = useMoney();
  const { dateFormat } = useDate();

  const defaultColumns = [
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
      align: 'right',
      render: (amount, record) =>
        moneyFormatter({ amount, currency_code: record.currency }),
    },
  ];

  const { result, isLoading, isSuccess } = useFetch(() =>
    request.list({ entity: 'expense', options: { page: 1, items: 5, sortBy: 'date', sortValue: -1 } })
  );

  return (
    <Table
      columns={columns || defaultColumns}
      rowKey="_id"
      dataSource={isSuccess ? result || [] : []}
      pagination={false}
      loading={isLoading}
      scroll={{ x: true }}
      size="small"
    />
  );
}

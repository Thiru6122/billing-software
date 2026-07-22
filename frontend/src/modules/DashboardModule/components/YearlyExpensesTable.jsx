import { Table } from 'antd';
import useLanguage from '@/locale/useLanguage';
import { useMoney } from '@/settings';
import { useSelector } from 'react-redux';
import { selectMoneyFormat } from '@/redux/settings/selectors';

export default function YearlyExpensesTable({ data = [], isLoading = false }) {
  const translate = useLanguage();
  const { moneyFormatter } = useMoney();
  const money_format_settings = useSelector(selectMoneyFormat);
  const currency = money_format_settings?.default_currency_code;

  const columns = [
    {
      title: translate('year'),
      dataIndex: 'year',
    },
    {
      title: translate('expenses'),
      dataIndex: 'count',
      align: 'right',
    },
    {
      title: translate('total'),
      dataIndex: 'total',
      align: 'right',
      render: (total) => moneyFormatter({ amount: total, currency_code: currency }),
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={data}
      rowKey="year"
      loading={isLoading}
      pagination={false}
      size="small"
      scroll={{ x: true }}
      summary={() => {
        const totals = data.reduce(
          (acc, row) => ({
            count: acc.count + (row.count || 0),
            total: acc.total + (row.total || 0),
          }),
          { count: 0, total: 0 }
        );

        return (
          <Table.Summary fixed>
            <Table.Summary.Row>
              <Table.Summary.Cell index={0}>
                <strong>{translate('total')}</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={1} align="right">
                <strong>{totals.count}</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={2} align="right">
                <strong>{moneyFormatter({ amount: totals.total, currency_code: currency })}</strong>
              </Table.Summary.Cell>
            </Table.Summary.Row>
          </Table.Summary>
        );
      }}
    />
  );
}

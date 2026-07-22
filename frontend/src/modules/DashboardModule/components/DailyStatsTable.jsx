import dayjs from 'dayjs';
import { Table } from 'antd';
import useLanguage from '@/locale/useLanguage';
import { useDate } from '@/settings';

export default function DailyStatsTable({ data = [], isLoading = false }) {
  const translate = useLanguage();
  const { dateFormat } = useDate();

  const columns = [
    {
      title: translate('date'),
      dataIndex: 'date',
      render: (date) => dayjs(date).format(dateFormat),
    },
    {
      title: translate('Invoices'),
      dataIndex: 'invoices',
      align: 'right',
    },
    {
      title: translate('Customer'),
      dataIndex: 'customers',
      align: 'right',
    },
    {
      title: translate('supplier'),
      dataIndex: 'suppliers',
      align: 'right',
    },
    {
      title: translate('expenses'),
      dataIndex: 'expenses',
      align: 'right',
    },
  ];

  const reversed = [...data].reverse();

  return (
    <Table
      columns={columns}
      dataSource={reversed}
      rowKey="date"
      loading={isLoading}
      pagination={{ pageSize: 10, showSizeChanger: false }}
      size="small"
      scroll={{ x: true, y: 320 }}
      summary={() => {
        const totals = data.reduce(
          (acc, row) => ({
            invoices: acc.invoices + (row.invoices || 0),
            customers: acc.customers + (row.customers || 0),
            suppliers: acc.suppliers + (row.suppliers || 0),
            expenses: acc.expenses + (row.expenses || 0),
          }),
          { invoices: 0, customers: 0, suppliers: 0, expenses: 0 }
        );

        return (
          <Table.Summary fixed>
            <Table.Summary.Row>
              <Table.Summary.Cell index={0}>
                <strong>{translate('total')}</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={1} align="right">
                <strong>{totals.invoices}</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={2} align="right">
                <strong>{totals.customers}</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={3} align="right">
                <strong>{totals.suppliers}</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={4} align="right">
                <strong>{totals.expenses}</strong>
              </Table.Summary.Cell>
            </Table.Summary.Row>
          </Table.Summary>
        );
      }}
    />
  );
}

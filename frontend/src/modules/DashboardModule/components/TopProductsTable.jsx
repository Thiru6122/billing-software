import { Table } from 'antd';
import useLanguage from '@/locale/useLanguage';
import { useMoney } from '@/settings';
import { useSelector } from 'react-redux';
import { selectMoneyFormat } from '@/redux/settings/selectors';

export default function TopProductsTable({ data = [], isLoading = false }) {
  const translate = useLanguage();
  const { moneyFormatter } = useMoney();
  const money_format_settings = useSelector(selectMoneyFormat);
  const currency = money_format_settings?.default_currency_code;

  const columns = [
    {
      title: translate('Product'),
      dataIndex: 'productName',
      render: (_, record) => record.productName || record.itemName,
    },
    {
      title: translate('quantity'),
      dataIndex: 'quantitySold',
      align: 'right',
    },
    {
      title: translate('total'),
      dataIndex: 'revenue',
      align: 'right',
      render: (revenue) => moneyFormatter({ amount: revenue, currency_code: currency }),
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={data}
      rowKey={(record) => record.productId || record.itemName}
      loading={isLoading}
      pagination={false}
      size="small"
      scroll={{ x: true }}
      summary={() => {
        const totals = data.reduce(
          (acc, row) => ({
            quantitySold: acc.quantitySold + (row.quantitySold || 0),
            revenue: acc.revenue + (row.revenue || 0),
          }),
          { quantitySold: 0, revenue: 0 }
        );

        return (
          <Table.Summary fixed>
            <Table.Summary.Row>
              <Table.Summary.Cell index={0}>
                <strong>{translate('total')}</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={1} align="right">
                <strong>{totals.quantitySold}</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={2} align="right">
                <strong>{moneyFormatter({ amount: totals.revenue, currency_code: currency })}</strong>
              </Table.Summary.Cell>
            </Table.Summary.Row>
          </Table.Summary>
        );
      }}
    />
  );
}

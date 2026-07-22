import { Table } from 'antd';

const MONEY_FIELDS = new Set([
  'total',
  'amount',
  'credit',
  'subTotal',
  'taxTotal',
  'cgstTotal',
  'sgstTotal',
  'igstTotal',
  'price',
  'cost',
  'discount',
]);

function getColumnKey(column) {
  if (typeof column.dataIndex === 'string') return column.dataIndex;
  return null;
}

export function buildTableSummary({
  columns,
  aggregates,
  translate,
  moneyFormatter,
  defaultCurrency,
}) {
  if (!aggregates || !Object.keys(aggregates).length) {
    return undefined;
  }

  const hasAggregate = columns.some((col) => {
    const key = getColumnKey(col);
    return key && aggregates[key] !== undefined;
  });

  if (!hasAggregate) return undefined;

  return () => (
    <Table.Summary fixed>
      <Table.Summary.Row>
        {columns.map((col, index) => {
          const key = getColumnKey(col);
          const value = key ? aggregates[key] : undefined;

          if (col.key === 'action') {
            return <Table.Summary.Cell key={col.key || index} index={index} />;
          }

          if (index === 0 || (!key && value === undefined)) {
            const label = index === 0 ? translate('total') : '';
            return (
              <Table.Summary.Cell key={col.key || col.dataIndex || index} index={index}>
                {label ? <strong>{label}</strong> : null}
              </Table.Summary.Cell>
            );
          }

          if (value !== undefined) {
            const isMoney = MONEY_FIELDS.has(key);
            const display = isMoney
              ? moneyFormatter({ amount: value, currency_code: defaultCurrency })
              : value;

            return (
              <Table.Summary.Cell
                key={col.key || key || index}
                index={index}
                align={isMoney || key === 'quantity' ? 'right' : undefined}
              >
                <strong>{display}</strong>
              </Table.Summary.Cell>
            );
          }

          return <Table.Summary.Cell key={col.key || index} index={index} />;
        })}
      </Table.Summary.Row>
    </Table.Summary>
  );
}

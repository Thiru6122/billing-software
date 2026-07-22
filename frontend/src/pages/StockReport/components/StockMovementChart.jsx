import dayjs from 'dayjs';
import { Spin } from 'antd';
import useLanguage from '@/locale/useLanguage';
import { useDate } from '@/settings';

const SERIES = [
  { key: 'totalIn', color: '#52c41a', labelKey: 'stock_in' },
  { key: 'totalOut', color: '#ff4d4f', labelKey: 'stock_out' },
  { key: 'netChange', color: '#1677ff', labelKey: 'net_change' },
];

export default function StockMovementChart({ data = [], isLoading = false, groupBy = 'day' }) {
  const translate = useLanguage();
  const { dateFormat } = useDate();

  const chartData = data.filter((row) => row.count > 0).slice(-31);
  const maxValue = Math.max(
    1,
    ...chartData.flatMap((row) =>
      SERIES.map((series) => Math.abs(row[series.key] || 0))
    )
  );

  if (isLoading) {
    return (
      <div style={{ minHeight: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin />
      </div>
    );
  }

  if (!chartData.length) {
    return <div style={{ minHeight: 280, color: '#999' }}>{translate('no_movements')}</div>;
  }

  const formatLabel = (period) => {
    if (groupBy === 'month') {
      return dayjs(`${period}-01`).format('MMM YY');
    }
    return dayjs(period).format(dateFormat === 'DD/MM/YYYY' ? 'DD/MM' : 'MM/DD');
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        {SERIES.map((series) => (
          <div key={series.key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: 2,
                background: series.color,
                display: 'inline-block',
              }}
            />
            {translate(series.labelKey)}
          </div>
        ))}
      </div>

      <div style={{ overflowX: 'auto', paddingBottom: 8 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: 10,
            minWidth: chartData.length * 56,
            height: 260,
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          {chartData.map((row) => (
            <div
              key={row.period}
              style={{
                flex: '0 0 46px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  gap: 2,
                  height: 220,
                  width: '100%',
                }}
              >
                {SERIES.map((series) => {
                  const rawValue = row[series.key] || 0;
                  const value = Math.abs(rawValue);
                  const height = Math.max(4, Math.round((value / maxValue) * 200));
                  return (
                    <div
                      key={series.key}
                      title={`${translate(series.labelKey)}: ${rawValue}`}
                      style={{
                        flex: 1,
                        height,
                        background: series.color,
                        borderRadius: '3px 3px 0 0',
                        opacity: value > 0 ? 1 : 0.25,
                      }}
                    />
                  );
                })}
              </div>
              <span style={{ fontSize: 10, color: '#666', whiteSpace: 'nowrap' }}>
                {formatLabel(row.period)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

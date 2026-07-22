import dayjs from 'dayjs';
import { Spin } from 'antd';
import useLanguage from '@/locale/useLanguage';
import { useDate } from '@/settings';

const SERIES = [
  { key: 'invoices', color: '#597ef7', labelKey: 'Invoices' },
  { key: 'customers', color: '#13c2c2', labelKey: 'Customer' },
  { key: 'suppliers', color: '#9254de', labelKey: 'supplier' },
  { key: 'expenses', color: '#ff7875', labelKey: 'expenses' },
];

export default function DailyActivityChart({ data = [], isLoading = false }) {
  const translate = useLanguage();
  const { dateFormat } = useDate();

  const chartData = data.slice(-14);
  const maxValue = Math.max(
    1,
    ...chartData.flatMap((row) => SERIES.map((s) => row[s.key] || 0))
  );

  if (isLoading) {
    return (
      <div style={{ minHeight: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin />
      </div>
    );
  }

  if (!chartData.length) {
    return <div style={{ minHeight: 280, color: '#999' }}>{translate('no_data')}</div>;
  }

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
              key={row.date}
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
                  const value = row[series.key] || 0;
                  const height = Math.max(4, Math.round((value / maxValue) * 200));
                  return (
                    <div
                      key={series.key}
                      title={`${translate(series.labelKey)}: ${value}`}
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
                {dayjs(row.date).format(dateFormat === 'DD/MM/YYYY' ? 'DD/MM' : 'MM/DD')}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Col,
  DatePicker,
  Row,
  Segmented,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  BarChartOutlined,
  DownloadOutlined,
  ReloadOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import useLanguage from '@/locale/useLanguage';
import { request } from '@/request';
import { useMoney, useDate } from '@/settings';
import { enhanceColumnsWithSort } from '@/utils/tableColumns';
import StockMovementChart from './components/StockMovementChart';

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

const PERIOD_OPTIONS = [
  { value: 'month', labelKey: 'this_month' },
  { value: 'year', labelKey: 'this_year' },
  { value: 'range', labelKey: 'custom_range' },
];

const MOVEMENT_TYPE_OPTIONS = ['sale', 'return'];

const TYPE_COLORS = {
  sale: 'volcano',
  return: 'cyan',
};

function buildQueryString(params) {
  return Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
}

function exportMovementsCsv(movements, translate) {
  const headers = [
    translate('date'),
    translate('Invoices'),
    translate('status'),
    translate('customer_name'),
    translate('product'),
    'SKU',
    translate('type'),
    translate('quantity'),
    translate('Price'),
    translate('total'),
    translate('value_change'),
    translate('note'),
    translate('created_by'),
  ];

  const rows = movements.map((row) => [
    row.created ? new Date(row.created).toISOString() : '',
    row.invoiceNumber != null ? `${row.invoiceNumber}/${row.invoiceYear || ''}` : '',
    row.invoiceStatus || '',
    row.customerName || '',
    row.product?.name || row.itemName || '',
    row.product?.sku || '',
    row.movementType || '',
    row.quantityChange ?? '',
    row.itemPrice ?? '',
    row.itemTotal ?? '',
    row.valueChange ?? '',
    (row.note || '').replace(/"/g, '""'),
    row.createdByName || '',
  ]);

  const csv = [headers, ...rows]
    .map((line) => line.map((cell) => `"${cell}"`).join(','))
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `invoice-stock-report-${dayjs().format('YYYY-MM-DD')}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function StockReport() {
  const translate = useLanguage();
  const { moneyFormatter } = useMoney();
  const { dateFormat } = useDate();

  const [periodType, setPeriodType] = useState('month');
  const [selectedMonth, setSelectedMonth] = useState(dayjs());
  const [selectedYear, setSelectedYear] = useState(dayjs());
  const [dateRange, setDateRange] = useState([dayjs().startOf('month'), dayjs()]);
  const [productId, setProductId] = useState(undefined);
  const [movementType, setMovementType] = useState(undefined);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [products, setProducts] = useState([]);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    request.listAll({ entity: 'product' }).then((res) => {
      if (res?.success) setProducts(res.result || []);
    });
  }, []);

  const queryParams = useMemo(() => {
    const params = {
      period: periodType,
      page,
      limit: pageSize,
    };

    if (productId) params.productId = productId;
    if (movementType) params.movementType = movementType;

    if (periodType === 'month') {
      params.month = selectedMonth.month() + 1;
      params.year = selectedMonth.year();
    } else if (periodType === 'year') {
      params.year = selectedYear.year();
    } else if (periodType === 'range' && dateRange?.[0] && dateRange?.[1]) {
      params.startDate = dateRange[0].format('YYYY-MM-DD');
      params.endDate = dateRange[1].format('YYYY-MM-DD');
    }

    return params;
  }, [periodType, selectedMonth, selectedYear, dateRange, productId, movementType, page, pageSize]);

  const loadReport = useCallback(async () => {
    if (periodType === 'range' && (!dateRange?.[0] || !dateRange?.[1])) return;

    setLoading(true);
    try {
      const query = buildQueryString(queryParams);
      const response = await request.get({ entity: `product/stockMovementReport?${query}` });
      if (response?.success) setReport(response.result);
    } finally {
      setLoading(false);
    }
  }, [queryParams, periodType, dateRange]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const handlePeriodChange = (value) => {
    setPeriodType(value);
    setPage(1);
  };

  const handleFilterChange = (setter) => (value) => {
    setter(value || undefined);
    setPage(1);
  };

  const summary = report?.summary || {};
  const periodStats = report?.periodStats || [];
  const isMonthlyView = report?.period?.groupBy === 'month';

  const periodColumns = enhanceColumnsWithSort([
    {
      title: isMonthlyView ? translate('month') : translate('date'),
      dataIndex: 'period',
      render: (value) =>
        isMonthlyView ? dayjs(`${value}-01`).format('MMMM YYYY') : dayjs(value).format(dateFormat),
    },
    {
      title: translate('stock_in'),
      dataIndex: 'totalIn',
      align: 'right',
      render: (value) => <Text type="success">+{value || 0}</Text>,
    },
    {
      title: translate('stock_out'),
      dataIndex: 'totalOut',
      align: 'right',
      render: (value) => <Text type="danger">-{value || 0}</Text>,
    },
    {
      title: translate('net_change'),
      dataIndex: 'netChange',
      align: 'right',
      render: (value) => (
        <Text type={value >= 0 ? 'success' : 'danger'}>
          {value >= 0 ? '+' : ''}
          {value || 0}
        </Text>
      ),
    },
    {
      title: translate('value_in'),
      dataIndex: 'valueIn',
      align: 'right',
      render: (value) => moneyFormatter({ amount: value || 0 }),
    },
    {
      title: translate('value_out'),
      dataIndex: 'valueOut',
      align: 'right',
      render: (value) => moneyFormatter({ amount: value || 0 }),
    },
    {
      title: translate('movement_count'),
      dataIndex: 'count',
      align: 'right',
    },
  ]);

  const productColumns = enhanceColumnsWithSort([
    {
      title: translate('product'),
      dataIndex: 'productName',
      render: (_, record) => (
        <div>
          <div>{record.productName}</div>
          {record.productSku ? (
            <Text type="secondary" style={{ fontSize: 12 }}>
              SKU: {record.productSku}
            </Text>
          ) : null}
        </div>
      ),
    },
    {
      title: translate('stock_in'),
      dataIndex: 'totalIn',
      align: 'right',
      render: (value) => <Text type="success">+{value || 0}</Text>,
    },
    {
      title: translate('stock_out'),
      dataIndex: 'totalOut',
      align: 'right',
      render: (value) => <Text type="danger">-{value || 0}</Text>,
    },
    {
      title: translate('net_change'),
      dataIndex: 'netChange',
      align: 'right',
      render: (value) => (
        <Text type={value >= 0 ? 'success' : 'danger'}>
          {value >= 0 ? '+' : ''}
          {value || 0}
        </Text>
      ),
    },
    {
      title: translate('value_change'),
      dataIndex: 'valueChange',
      align: 'right',
      render: (value) => moneyFormatter({ amount: value || 0 }),
    },
    {
      title: translate('revenue'),
      dataIndex: 'revenue',
      align: 'right',
      render: (value) => moneyFormatter({ amount: value || 0 }),
    },
    {
      title: translate('movement_count'),
      dataIndex: 'movementCount',
      align: 'right',
    },
  ]);

  const typeColumns = enhanceColumnsWithSort([
    {
      title: translate('type'),
      dataIndex: 'movementType',
      render: (type) => (
        <Tag color={TYPE_COLORS[type] || 'default'}>{translate(type) || type}</Tag>
      ),
    },
    {
      title: translate('movement_count'),
      dataIndex: 'count',
      align: 'right',
    },
    {
      title: translate('stock_in'),
      dataIndex: 'totalIn',
      align: 'right',
    },
    {
      title: translate('stock_out'),
      dataIndex: 'totalOut',
      align: 'right',
    },
    {
      title: translate('net_change'),
      dataIndex: 'quantityTotal',
      align: 'right',
      render: (value) => (
        <Text type={value >= 0 ? 'success' : 'danger'}>
          {value >= 0 ? '+' : ''}
          {value || 0}
        </Text>
      ),
    },
    {
      title: translate('revenue'),
      dataIndex: 'revenue',
      align: 'right',
      render: (value) => moneyFormatter({ amount: value || 0 }),
    },
  ]);

  const movementColumns = enhanceColumnsWithSort([
    {
      title: translate('date'),
      dataIndex: 'created',
      width: 120,
      render: (date) => (date ? dayjs(date).format(dateFormat) : '-'),
    },
    {
      title: translate('Invoices'),
      dataIndex: 'invoiceNumber',
      width: 110,
      render: (_, record) =>
        record.invoiceNumber != null ? `${record.invoiceNumber}/${record.invoiceYear || ''}` : '-',
    },
    {
      title: translate('status'),
      dataIndex: 'invoiceStatus',
      width: 100,
      render: (status) => (status ? <Tag>{status}</Tag> : '-'),
    },
    {
      title: translate('customer_name'),
      dataIndex: 'customerName',
      width: 140,
      ellipsis: true,
      render: (name) => name || '-',
    },
    {
      title: translate('product'),
      dataIndex: ['product', 'name'],
      render: (_, record) => (
        <div>
          <div>{record.product?.name || record.itemName || '-'}</div>
          {record.product?.sku ? (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.product.sku}
            </Text>
          ) : null}
        </div>
      ),
    },
    {
      title: translate('type'),
      dataIndex: 'movementType',
      width: 90,
      render: (type) => (
        <Tag color={TYPE_COLORS[type] || 'default'}>{translate(type) || type}</Tag>
      ),
    },
    {
      title: translate('quantity'),
      dataIndex: 'quantityChange',
      align: 'right',
      width: 80,
      render: (value) => (
        <Text type={value >= 0 ? 'success' : 'danger'}>
          {value >= 0 ? '+' : ''}
          {value}
        </Text>
      ),
    },
    {
      title: translate('Price'),
      dataIndex: 'itemPrice',
      align: 'right',
      width: 90,
      render: (value) => moneyFormatter({ amount: value || 0 }),
    },
    {
      title: translate('total'),
      dataIndex: 'itemTotal',
      align: 'right',
      width: 100,
      render: (value) => moneyFormatter({ amount: value || 0 }),
    },
    {
      title: translate('value_change'),
      dataIndex: 'valueChange',
      align: 'right',
      width: 100,
      render: (value) => moneyFormatter({ amount: value || 0 }),
    },
    {
      title: translate('created_by'),
      dataIndex: 'createdByName',
      width: 110,
      render: (name) => name || '-',
    },
  ]);

  const yearlyColumns = enhanceColumnsWithSort([
    { title: translate('year'), dataIndex: 'year' },
    {
      title: translate('stock_in'),
      dataIndex: 'totalIn',
      align: 'right',
      render: (value) => <Text type="success">+{value || 0}</Text>,
    },
    {
      title: translate('stock_out'),
      dataIndex: 'totalOut',
      align: 'right',
      render: (value) => <Text type="danger">-{value || 0}</Text>,
    },
    {
      title: translate('net_change'),
      dataIndex: 'netChange',
      align: 'right',
      render: (value) => (
        <Text type={value >= 0 ? 'success' : 'danger'}>
          {value >= 0 ? '+' : ''}
          {value || 0}
        </Text>
      ),
    },
    {
      title: translate('value_in'),
      dataIndex: 'valueIn',
      align: 'right',
      render: (value) => moneyFormatter({ amount: value || 0 }),
    },
    {
      title: translate('value_out'),
      dataIndex: 'valueOut',
      align: 'right',
      render: (value) => moneyFormatter({ amount: value || 0 }),
    },
    {
      title: translate('revenue'),
      dataIndex: 'revenue',
      align: 'right',
      render: (value) => moneyFormatter({ amount: value || 0 }),
    },
    {
      title: translate('movement_count'),
      dataIndex: 'count',
      align: 'right',
    },
  ]);

  const expandedPeriodRow = (record) => {
    const types = record.byType || {};
    const entries = MOVEMENT_TYPE_OPTIONS.filter(
      (type) => types[type] !== undefined && types[type] !== 0
    );
    if (!entries.length) {
      return <Text type="secondary">{translate('no_movements')}</Text>;
    }

    return (
      <Row gutter={[12, 8]}>
        {entries.map((type) => (
          <Col key={type} xs={12} sm={8} md={6} lg={4}>
            <Tag color={TYPE_COLORS[type]}>
              {translate(type)}: {types[type] >= 0 ? '+' : ''}
              {types[type]}
            </Tag>
          </Col>
        ))}
      </Row>
    );
  };

  return (
    <div className="pad20">
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }} gutter={[16, 16]}>
        <Col>
          <Title level={3} style={{ margin: 0 }}>
            <BarChartOutlined style={{ marginRight: 8 }} />
            {translate('stock_movement_report')}
          </Title>
          <Text type="secondary">{translate('stock_report_invoice_subtitle')}</Text>
        </Col>
        <Col>
          <Space wrap>
            <Button icon={<ReloadOutlined />} onClick={loadReport} loading={loading}>
              {translate('refresh')}
            </Button>
            <Button
              icon={<DownloadOutlined />}
              onClick={() => exportMovementsCsv(report?.movements || [], translate)}
              disabled={!report?.movements?.length}
            >
              {translate('export_csv')}
            </Button>
          </Space>
        </Col>
      </Row>

      <Card style={{ marginBottom: 16 }}>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Segmented
            value={periodType}
            onChange={handlePeriodChange}
            options={PERIOD_OPTIONS.map((option) => ({
              value: option.value,
              label: translate(option.labelKey),
            }))}
          />

          <Row gutter={[16, 16]} align="middle">
            <Col xs={24} md={8}>
              {periodType === 'month' && (
                <DatePicker
                  picker="month"
                  value={selectedMonth}
                  onChange={(value) => {
                    setSelectedMonth(value || dayjs());
                    setPage(1);
                  }}
                  style={{ width: '100%' }}
                  allowClear={false}
                />
              )}
              {periodType === 'year' && (
                <DatePicker
                  picker="year"
                  value={selectedYear}
                  onChange={(value) => {
                    setSelectedYear(value || dayjs());
                    setPage(1);
                  }}
                  style={{ width: '100%' }}
                  allowClear={false}
                />
              )}
              {periodType === 'range' && (
                <RangePicker
                  value={dateRange}
                  onChange={(values) => {
                    setDateRange(values || [dayjs().startOf('month'), dayjs()]);
                    setPage(1);
                  }}
                  style={{ width: '100%' }}
                  format={dateFormat}
                />
              )}
            </Col>
            <Col xs={24} md={8}>
              <Select
                allowClear
                showSearch
                placeholder={translate('filter_by_product')}
                style={{ width: '100%' }}
                value={productId}
                onChange={handleFilterChange(setProductId)}
                optionFilterProp="label"
                options={[
                  { value: '', label: translate('all_products') },
                  ...products.map((product) => ({
                    value: product._id,
                    label: `${product.name}${product.sku ? ` (${product.sku})` : ''}`,
                  })),
                ]}
              />
            </Col>
            <Col xs={24} md={8}>
              <Select
                allowClear
                placeholder={translate('filter_by_type')}
                style={{ width: '100%' }}
                value={movementType}
                onChange={handleFilterChange(setMovementType)}
                options={[
                  { value: '', label: translate('all_types') },
                  ...MOVEMENT_TYPE_OPTIONS.map((type) => ({
                    value: type,
                    label: translate(type) || type,
                  })),
                ]}
              />
            </Col>
          </Row>

          {report?.period?.label ? (
            <Text type="secondary">
              {translate('report_period')}: <strong>{report.period.label}</strong>
            </Text>
          ) : null}
        </Space>
      </Card>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={6}>
          <Card loading={loading}>
            <Statistic
              title={translate('stock_in')}
              value={summary.totalIn || 0}
              prefix={<ArrowUpOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card loading={loading}>
            <Statistic
              title={translate('stock_out')}
              value={summary.totalOut || 0}
              prefix={<ArrowDownOutlined />}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card loading={loading}>
            <Statistic
              title={translate('net_change')}
              value={summary.netChange || 0}
              prefix={<SwapOutlined />}
              valueStyle={{ color: (summary.netChange || 0) >= 0 ? '#3f8600' : '#cf1322' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card loading={loading}>
            <Statistic title={translate('movement_count')} value={summary.movementCount || 0} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12}>
          <Card loading={loading} size="small">
            <Statistic
              title={translate('value_in')}
              value={moneyFormatter({ amount: summary.valueIn || 0 })}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card loading={loading} size="small">
            <Statistic
              title={translate('value_out')}
              value={moneyFormatter({ amount: summary.valueOut || 0 })}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title={translate('stock_movement_chart')}
        style={{ marginBottom: 16 }}
        loading={loading}
      >
        <StockMovementChart data={periodStats} isLoading={loading} groupBy={report?.period?.groupBy} />
      </Card>

      <Card
        title={isMonthlyView ? translate('monthly_summary') : translate('daily_summary')}
        style={{ marginBottom: 16 }}
      >
        <Table
          rowKey="period"
          loading={loading}
          dataSource={[...periodStats].reverse()}
          columns={periodColumns}
          pagination={{ pageSize: 15, showSizeChanger: true }}
          size="small"
          scroll={{ x: true }}
          expandable={{
            expandedRowRender: expandedPeriodRow,
            rowExpandable: (record) => (record.count || 0) > 0,
          }}
          summary={() => (
            <Table.Summary fixed>
              <Table.Summary.Row>
                <Table.Summary.Cell index={0}>
                  <strong>{translate('total')}</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1} align="right">
                  <strong>+{summary.totalIn || 0}</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2} align="right">
                  <strong>-{summary.totalOut || 0}</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={3} align="right">
                  <strong>{summary.netChange || 0}</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={4} align="right">
                  <strong>{moneyFormatter({ amount: summary.valueIn || 0 })}</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={5} align="right">
                  <strong>{moneyFormatter({ amount: summary.valueOut || 0 })}</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={6} align="right">
                  <strong>{summary.movementCount || 0}</strong>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            </Table.Summary>
          )}
        />
      </Card>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={12}>
          <Card title={translate('product_breakdown')}>
            <Table
              rowKey="productId"
              loading={loading}
              dataSource={report?.productBreakdown || []}
              columns={productColumns}
              pagination={{ pageSize: 10 }}
              size="small"
              scroll={{ x: true }}
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title={translate('type_breakdown')}>
            <Table
              rowKey="movementType"
              loading={loading}
              dataSource={report?.typeBreakdown || []}
              columns={typeColumns}
              pagination={false}
              size="small"
              scroll={{ x: true }}
            />
          </Card>
        </Col>
      </Row>

      <Card title={translate('yearly_summary')} style={{ marginBottom: 16 }}>
        <Table
          rowKey="year"
          loading={loading}
          dataSource={report?.yearlyRollup || []}
          columns={yearlyColumns}
          pagination={false}
          size="small"
          scroll={{ x: true }}
        />
      </Card>

      <Card title={translate('invoice_line_details')}>
        <Table
          rowKey="_id"
          loading={loading}
          dataSource={report?.movements || []}
          columns={movementColumns}
          pagination={{
            current: page,
            pageSize,
            total: report?.pagination?.total || 0,
            showSizeChanger: true,
            pageSizeOptions: ['10', '25', '50', '100'],
            onChange: (nextPage, nextSize) => {
              setPage(nextPage);
              setPageSize(nextSize);
            },
          }}
          size="small"
          scroll={{ x: 1200 }}
        />
      </Card>
    </div>
  );
}

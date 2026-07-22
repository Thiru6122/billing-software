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
  BarChartOutlined,
  DownloadOutlined,
  FileTextOutlined,
  ReloadOutlined,
  ShoppingOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import useLanguage from '@/locale/useLanguage';
import { request } from '@/request';
import { useMoney, useDate } from '@/settings';
import { enhanceColumnsWithSort } from '@/utils/tableColumns';
import SalesActivityChart from './components/SalesActivityChart';

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

const PERIOD_OPTIONS = [
  { value: 'month', labelKey: 'this_month' },
  { value: 'year', labelKey: 'this_year' },
  { value: 'range', labelKey: 'custom_range' },
];

const SOURCE_OPTIONS = [
  { value: '', labelKey: 'all_sources' },
  { value: 'invoice', labelKey: 'Invoices' },
  { value: 'quote', labelKey: 'quote' },
];

const SOURCE_COLORS = {
  invoice: 'blue',
  quote: 'cyan',
};

function buildQueryString(params) {
  return Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
}

function exportSalesCsv(lines, translate) {
  const headers = [
    translate('date'),
    translate('source'),
    translate('number'),
    translate('status'),
    translate('payment_status'),
    translate('customer_name'),
    translate('product'),
    'SKU',
    translate('quantity'),
    translate('Price'),
    translate('total'),
    translate('hsn_code'),
    translate('gst_rate'),
    translate('taxable_value'),
    translate('gst_amount'),
    translate('document_total'),
    translate('created_by'),
  ];

  const rows = lines.map((row) => [
    row.lineDate ? new Date(row.lineDate).toISOString() : '',
    row.source || '',
    row.documentNumber != null ? `${row.documentNumber}/${row.documentYear || ''}` : '',
    row.documentStatus || '',
    row.paymentStatus || '',
    row.customerName || '',
    row.product?.name || row.itemName || '',
    row.product?.sku || '',
    row.quantity ?? '',
    row.itemPrice ?? '',
    row.itemTotal ?? '',
    row.hsnCode || '',
    row.gstRate ?? '',
    row.taxableValue ?? '',
    row.gstAmount ?? '',
    row.documentTotal ?? '',
    row.createdByName || '',
  ]);

  const csv = [headers, ...rows]
    .map((line) => line.map((cell) => `"${cell}"`).join(','))
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `sales-report-${dayjs().format('YYYY-MM-DD')}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function SalesReport() {
  const translate = useLanguage();
  const { moneyFormatter } = useMoney();
  const { dateFormat } = useDate();

  const [periodType, setPeriodType] = useState('month');
  const [selectedMonth, setSelectedMonth] = useState(dayjs());
  const [selectedYear, setSelectedYear] = useState(dayjs());
  const [dateRange, setDateRange] = useState([dayjs().startOf('month'), dayjs()]);
  const [source, setSource] = useState(undefined);
  const [productId, setProductId] = useState(undefined);
  const [status, setStatus] = useState(undefined);
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
    const params = { period: periodType, page, limit: pageSize };
    if (source) params.source = source;
    if (productId) params.productId = productId;
    if (status) params.status = status;

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
  }, [periodType, selectedMonth, selectedYear, dateRange, source, productId, status, page, pageSize]);

  const loadReport = useCallback(async () => {
    if (periodType === 'range' && (!dateRange?.[0] || !dateRange?.[1])) return;

    setLoading(true);
    try {
      const query = buildQueryString(queryParams);
      const response = await request.get({ entity: `sales/report?${query}` });
      if (response?.success) setReport(response.result);
    } finally {
      setLoading(false);
    }
  }, [queryParams, periodType, dateRange]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

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
      title: translate('Invoices'),
      dataIndex: 'invoiceRevenue',
      align: 'right',
      render: (value) => moneyFormatter({ amount: value || 0 }),
    },
    {
      title: translate('quote'),
      dataIndex: 'quoteRevenue',
      align: 'right',
      render: (value) => moneyFormatter({ amount: value || 0 }),
    },
    {
      title: translate('total'),
      dataIndex: 'totalRevenue',
      align: 'right',
      render: (value) => <Text strong>{moneyFormatter({ amount: value || 0 })}</Text>,
    },
    {
      title: translate('quantity'),
      dataIndex: 'totalQuantity',
      align: 'right',
    },
    {
      title: translate('invoice_documents'),
      dataIndex: 'invoiceDocuments',
      align: 'right',
    },
    {
      title: translate('quote_documents'),
      dataIndex: 'quoteDocuments',
      align: 'right',
    },
    {
      title: translate('line_items'),
      dataIndex: 'totalLines',
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
      title: translate('Invoices'),
      dataIndex: 'invoiceRevenue',
      align: 'right',
      render: (value) => moneyFormatter({ amount: value || 0 }),
    },
    {
      title: translate('quote'),
      dataIndex: 'quoteRevenue',
      align: 'right',
      render: (value) => moneyFormatter({ amount: value || 0 }),
    },
    {
      title: translate('total'),
      dataIndex: 'totalRevenue',
      align: 'right',
      render: (value) => moneyFormatter({ amount: value || 0 }),
    },
    {
      title: translate('quantity'),
      dataIndex: 'totalQuantity',
      align: 'right',
    },
    {
      title: translate('line_items'),
      dataIndex: 'lineCount',
      align: 'right',
    },
  ]);

  const customerColumns = enhanceColumnsWithSort([
    { title: translate('customer_name'), dataIndex: 'customerName' },
    {
      title: translate('Invoices'),
      dataIndex: 'invoiceRevenue',
      align: 'right',
      render: (value) => moneyFormatter({ amount: value || 0 }),
    },
    {
      title: translate('quote'),
      dataIndex: 'quoteRevenue',
      align: 'right',
      render: (value) => moneyFormatter({ amount: value || 0 }),
    },
    {
      title: translate('total'),
      dataIndex: 'totalRevenue',
      align: 'right',
      render: (value) => moneyFormatter({ amount: value || 0 }),
    },
    {
      title: translate('documents'),
      dataIndex: 'documentCount',
      align: 'right',
    },
    {
      title: translate('line_items'),
      dataIndex: 'lineCount',
      align: 'right',
    },
  ]);

  const sourceColumns = enhanceColumnsWithSort([
    {
      title: translate('source'),
      dataIndex: 'source',
      render: (value) => (
        <Tag color={SOURCE_COLORS[value] || 'default'}>{translate(value) || value}</Tag>
      ),
    },
    {
      title: translate('documents'),
      dataIndex: 'documentCount',
      align: 'right',
    },
    {
      title: translate('line_items'),
      dataIndex: 'lineCount',
      align: 'right',
    },
    {
      title: translate('quantity'),
      dataIndex: 'quantity',
      align: 'right',
    },
    {
      title: translate('revenue'),
      dataIndex: 'revenue',
      align: 'right',
      render: (value) => moneyFormatter({ amount: value || 0 }),
    },
  ]);

  const statusColumns = enhanceColumnsWithSort([
    {
      title: translate('source'),
      dataIndex: 'source',
      render: (value) => (
        <Tag color={SOURCE_COLORS[value] || 'default'}>{translate(value) || value}</Tag>
      ),
    },
    {
      title: translate('status'),
      dataIndex: 'status',
      render: (value) => <Tag>{value}</Tag>,
    },
    {
      title: translate('documents'),
      dataIndex: 'documentCount',
      align: 'right',
    },
    {
      title: translate('line_items'),
      dataIndex: 'lineCount',
      align: 'right',
    },
    {
      title: translate('quantity'),
      dataIndex: 'quantity',
      align: 'right',
    },
    {
      title: translate('revenue'),
      dataIndex: 'revenue',
      align: 'right',
      render: (value) => moneyFormatter({ amount: value || 0 }),
    },
  ]);

  const yearlyColumns = enhanceColumnsWithSort([
    { title: translate('year'), dataIndex: 'year' },
    {
      title: translate('Invoices'),
      dataIndex: 'invoiceRevenue',
      align: 'right',
      render: (value) => moneyFormatter({ amount: value || 0 }),
    },
    {
      title: translate('quote'),
      dataIndex: 'quoteRevenue',
      align: 'right',
      render: (value) => moneyFormatter({ amount: value || 0 }),
    },
    {
      title: translate('total'),
      dataIndex: 'totalRevenue',
      align: 'right',
      render: (value) => moneyFormatter({ amount: value || 0 }),
    },
    {
      title: translate('quantity'),
      dataIndex: 'totalQuantity',
      align: 'right',
    },
    {
      title: translate('invoice_documents'),
      dataIndex: 'invoiceDocuments',
      align: 'right',
    },
    {
      title: translate('quote_documents'),
      dataIndex: 'quoteDocuments',
      align: 'right',
    },
    {
      title: translate('line_items'),
      dataIndex: 'totalLines',
      align: 'right',
    },
  ]);

  const lineColumns = enhanceColumnsWithSort([
    {
      title: translate('date'),
      dataIndex: 'lineDate',
      width: 110,
      render: (date) => (date ? dayjs(date).format(dateFormat) : '-'),
    },
    {
      title: translate('source'),
      dataIndex: 'source',
      width: 90,
      render: (value) => (
        <Tag color={SOURCE_COLORS[value] || 'default'}>{translate(value) || value}</Tag>
      ),
    },
    {
      title: translate('number'),
      dataIndex: 'documentNumber',
      width: 100,
      render: (_, record) =>
        record.documentNumber != null ? `${record.documentNumber}/${record.documentYear || ''}` : '-',
    },
    {
      title: translate('status'),
      dataIndex: 'documentStatus',
      width: 100,
      render: (value) => <Tag>{value}</Tag>,
    },
    {
      title: translate('payment_status'),
      dataIndex: 'paymentStatus',
      width: 100,
      render: (value) => (value ? <Tag color="gold">{value}</Tag> : '-'),
    },
    {
      title: translate('customer_name'),
      dataIndex: 'customerName',
      width: 130,
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
      title: translate('quantity'),
      dataIndex: 'quantity',
      align: 'right',
      width: 70,
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
      render: (value, record) => (
        <Text type={record.isActive ? undefined : 'secondary'}>
          {moneyFormatter({ amount: value || 0 })}
        </Text>
      ),
    },
    {
      title: translate('hsn_code'),
      dataIndex: 'hsnCode',
      width: 90,
      render: (value) => value || '-',
    },
    {
      title: translate('gst_rate'),
      dataIndex: 'gstRate',
      width: 80,
      align: 'right',
      render: (value) => (value != null ? `${value}%` : '-'),
    },
    {
      title: translate('created_by'),
      dataIndex: 'createdByName',
      width: 110,
      render: (name) => name || '-',
    },
  ]);

  return (
    <div className="pad20">
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }} gutter={[16, 16]}>
        <Col>
          <Title level={3} style={{ margin: 0 }}>
            <BarChartOutlined style={{ marginRight: 8 }} />
            {translate('sales_report')}
          </Title>
          <Text type="secondary">{translate('sales_report_subtitle')}</Text>
        </Col>
        <Col>
          <Space wrap>
            <Button icon={<ReloadOutlined />} onClick={loadReport} loading={loading}>
              {translate('refresh')}
            </Button>
            <Button
              icon={<DownloadOutlined />}
              onClick={() => exportSalesCsv(report?.lines || [], translate)}
              disabled={!report?.lines?.length}
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
            onChange={(value) => {
              setPeriodType(value);
              setPage(1);
            }}
            options={PERIOD_OPTIONS.map((option) => ({
              value: option.value,
              label: translate(option.labelKey),
            }))}
          />

          <Row gutter={[16, 16]} align="middle">
            <Col xs={24} md={6}>
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
            <Col xs={24} md={6}>
              <Select
                placeholder={translate('filter_by_source')}
                style={{ width: '100%' }}
                value={source}
                onChange={(value) => {
                  setSource(value || undefined);
                  setPage(1);
                }}
                allowClear
                options={SOURCE_OPTIONS.map((option) => ({
                  value: option.value,
                  label: translate(option.labelKey),
                }))}
              />
            </Col>
            <Col xs={24} md={6}>
              <Select
                allowClear
                showSearch
                placeholder={translate('filter_by_product')}
                style={{ width: '100%' }}
                value={productId}
                onChange={(value) => {
                  setProductId(value || undefined);
                  setPage(1);
                }}
                optionFilterProp="label"
                options={products.map((product) => ({
                  value: product._id,
                  label: `${product.name}${product.sku ? ` (${product.sku})` : ''}`,
                }))}
              />
            </Col>
            <Col xs={24} md={6}>
              <Select
                allowClear
                placeholder={translate('filter_by_status')}
                style={{ width: '100%' }}
                value={status}
                onChange={(value) => {
                  setStatus(value || undefined);
                  setPage(1);
                }}
                options={[
                  'pending',
                  'sent',
                  'accepted',
                  'declined',
                  'cancelled',
                  'refunded',
                  'on hold',
                ].map((item) => ({ value: item, label: item }))}
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
              title={translate('invoice_revenue')}
              value={moneyFormatter({ amount: summary.invoiceRevenue || 0 })}
              prefix={<ShoppingOutlined />}
              valueStyle={{ color: '#597ef7' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card loading={loading}>
            <Statistic
              title={translate('quote_revenue')}
              value={moneyFormatter({ amount: summary.quoteRevenue || 0 })}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#13c2c2' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card loading={loading}>
            <Statistic
              title={translate('total_revenue')}
              value={moneyFormatter({ amount: summary.totalRevenue || 0 })}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card loading={loading}>
            <Statistic title={translate('total_quantity_sold')} value={summary.totalQuantity || 0} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={8}>
          <Card loading={loading} size="small">
            <Statistic title={translate('invoice_documents')} value={summary.invoiceDocuments || 0} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card loading={loading} size="small">
            <Statistic title={translate('quote_documents')} value={summary.quoteDocuments || 0} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card loading={loading} size="small">
            <Statistic title={translate('line_items')} value={summary.totalLines || 0} />
          </Card>
        </Col>
      </Row>

      <Card title={translate('sales_chart')} style={{ marginBottom: 16 }} loading={loading}>
        <SalesActivityChart
          data={periodStats}
          isLoading={loading}
          groupBy={report?.period?.groupBy}
        />
      </Card>

      <Card
        title={isMonthlyView ? translate('monthly_sales_summary') : translate('daily_sales_summary')}
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
          summary={() => (
            <Table.Summary fixed>
              <Table.Summary.Row>
                <Table.Summary.Cell index={0}>
                  <strong>{translate('total')}</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1} align="right">
                  <strong>{moneyFormatter({ amount: summary.invoiceRevenue || 0 })}</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2} align="right">
                  <strong>{moneyFormatter({ amount: summary.quoteRevenue || 0 })}</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={3} align="right">
                  <strong>{moneyFormatter({ amount: summary.totalRevenue || 0 })}</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={4} align="right">
                  <strong>{summary.totalQuantity || 0}</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={5} align="right">
                  <strong>{summary.invoiceDocuments || 0}</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={6} align="right">
                  <strong>{summary.quoteDocuments || 0}</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={7} align="right">
                  <strong>{summary.totalLines || 0}</strong>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            </Table.Summary>
          )}
        />
      </Card>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={12}>
          <Card title={translate('product_sales_breakdown')}>
            <Table
              rowKey={(row) => row.productId || row.productName}
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
          <Card title={translate('customer_sales_breakdown')}>
            <Table
              rowKey={(row) => row.clientId || row.customerName}
              loading={loading}
              dataSource={report?.customerBreakdown || []}
              columns={customerColumns}
              pagination={{ pageSize: 10 }}
              size="small"
              scroll={{ x: true }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={12}>
          <Card title={translate('source_breakdown')}>
            <Table
              rowKey="source"
              loading={loading}
              dataSource={report?.sourceBreakdown || []}
              columns={sourceColumns}
              pagination={false}
              size="small"
              scroll={{ x: true }}
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title={translate('status_breakdown')}>
            <Table
              rowKey={(row) => `${row.source}-${row.status}`}
              loading={loading}
              dataSource={report?.statusBreakdown || []}
              columns={statusColumns}
              pagination={{ pageSize: 10 }}
              size="small"
              scroll={{ x: true }}
            />
          </Card>
        </Col>
      </Row>

      <Card title={translate('yearly_sales_summary')} style={{ marginBottom: 16 }}>
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

      <Card title={translate('detailed_sales_lines')}>
        <Table
          rowKey="_id"
          loading={loading}
          dataSource={report?.lines || []}
          columns={lineColumns}
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
          scroll={{ x: 1400 }}
        />
      </Card>
    </div>
  );
}

import { useEffect, useState } from 'react';
import {
  Upload,
  Button,
  Table,
  Card,
  Row,
  Col,
  Modal,
  Form,
  InputNumber,
  Input,
  Select,
  Statistic,
  message,
} from 'antd';
import { UploadOutlined, PlusOutlined } from '@ant-design/icons';
import useLanguage from '@/locale/useLanguage';
import { request } from '@/request';
import { useMoney } from '@/settings';

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
  return lines.slice(1).map((line) => {
    const values = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ?? '';
    });
    return row;
  });
}

export default function Inventory() {
  const translate = useLanguage();
  const { moneyFormatter } = useMoney();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [form] = Form.useForm();

  const loadData = async () => {
    setLoading(true);
    try {
      const [summaryRes, productsRes] = await Promise.all([
        request.get({ entity: 'product/inventorySummary' }),
        request.listAll({ entity: 'product' }),
      ]);
      if (summaryRes?.success) setSummary(summaryRes.result);
      if (productsRes?.success) setProducts(productsRes.result || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCsvUpload = (file) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      setImporting(true);
      try {
        const rows = parseCsv(e.target.result);
        if (!rows.length) {
          message.error(translate('csv_empty'));
          return;
        }
        const response = await request.post({
          entity: 'product/import',
          jsonData: { products: rows },
        });
        if (response?.success) {
          message.success(response.message);
          loadData();
        }
      } finally {
        setImporting(false);
      }
    };
    reader.readAsText(file);
    return false;
  };

  const handleAdjustStock = async (values) => {
    const response = await request.post({
      entity: 'product/adjustStock',
      jsonData: values,
    });
    if (response?.success) {
      setAdjustOpen(false);
      form.resetFields();
      loadData();
    }
  };

  const lowStockColumns = [
    { title: translate('name'), dataIndex: 'name' },
    { title: 'SKU', dataIndex: 'sku' },
    { title: translate('quantity'), dataIndex: 'quantity' },
    { title: translate('min_quantity'), dataIndex: 'minQuantity' },
    { title: translate('Price'), dataIndex: 'price' },
  ];

  const movementColumns = [
    {
      title: translate('product'),
      dataIndex: ['product', 'name'],
      render: (_, record) => record.product?.name || '-',
    },
    { title: translate('type'), dataIndex: 'movementType' },
    { title: translate('quantity'), dataIndex: 'quantityChange' },
    { title: translate('note'), dataIndex: 'note' },
    {
      title: translate('date'),
      dataIndex: 'created',
      render: (date) => (date ? new Date(date).toLocaleString() : '-'),
    },
  ];

  return (
    <div className="pad20">
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card loading={loading}>
            <Statistic title={translate('total_products')} value={summary?.totalProducts || 0} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card loading={loading}>
            <Statistic
              title={translate('low_stock_items')}
              value={summary?.lowStockCount || 0}
              valueStyle={{ color: summary?.lowStockCount ? '#cf1322' : undefined }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card loading={loading}>
            <Statistic
              title={translate('stock_value')}
              value={moneyFormatter({ amount: summary?.totalStockValue || 0 })}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card loading={loading}>
            <Statistic
              title={translate('retail_value')}
              value={moneyFormatter({ amount: summary?.totalRetailValue || 0 })}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col>
          <Upload accept=".csv" showUploadList={false} beforeUpload={handleCsvUpload}>
            <Button icon={<UploadOutlined />} loading={importing}>
              {translate('import_csv')}
            </Button>
          </Upload>
        </Col>
        <Col>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setAdjustOpen(true)}>
            {translate('adjust_stock')}
          </Button>
        </Col>
      </Row>

      <p style={{ color: '#666', marginBottom: 16 }}>{translate('csv_format_hint')}</p>

      <Card title={translate('low_stock_items')} style={{ marginBottom: 24 }}>
        <Table
          rowKey="_id"
          loading={loading}
          dataSource={summary?.lowStockItems || []}
          columns={lowStockColumns}
          pagination={{ pageSize: 10 }}
          size="small"
        />
      </Card>

      <Card title={translate('recent_movements')}>
        <Table
          rowKey="_id"
          loading={loading}
          dataSource={summary?.recentMovements || []}
          columns={movementColumns}
          pagination={{ pageSize: 10 }}
          size="small"
        />
      </Card>

      <Modal
        title={translate('adjust_stock')}
        open={adjustOpen}
        onCancel={() => setAdjustOpen(false)}
        onOk={() => form.submit()}
        okText={translate('save')}
      >
        <Form form={form} layout="vertical" onFinish={handleAdjustStock}>
          <Form.Item
            name="productId"
            label={translate('product')}
            rules={[{ required: true }]}
          >
            <Select
              showSearch
              optionFilterProp="label"
              options={products.map((p) => ({
                value: p._id,
                label: `${p.name}${p.sku ? ` (${p.sku})` : ''} — ${translate('quantity')}: ${p.quantity || 0}`,
              }))}
            />
          </Form.Item>
          <Form.Item
            name="quantityChange"
            label={translate('quantity_change')}
            rules={[{ required: true, type: 'number' }]}
            extra={translate('quantity_change_hint')}
          >
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="movementType" label={translate('type')} initialValue="in">
            <Select
              options={[
                { value: 'in', label: translate('stock_in') },
                { value: 'out', label: translate('stock_out') },
                { value: 'adjust', label: translate('adjustment') },
              ]}
            />
          </Form.Item>
          <Form.Item name="note" label={translate('note')}>
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

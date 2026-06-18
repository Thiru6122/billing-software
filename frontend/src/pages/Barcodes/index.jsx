import { useEffect, useState } from 'react';
import {
  Table,
  Button,
  Card,
  Space,
  InputNumber,
  message,
  Typography,
  Divider,
} from 'antd';
import { PrinterOutlined, BarcodeOutlined, ReloadOutlined } from '@ant-design/icons';
import { PageHeader } from '@ant-design/pro-layout';
import { request } from '@/request';
import useLanguage from '@/locale/useLanguage';
import { useMoney } from '@/settings';
import {
  printBarcodeLabels,
  buildProductLabels,
  buildBlankLabels,
  generateBarcodeValue,
} from '@/utils/barcodePrint';

export default function Barcodes() {
  const translate = useLanguage();
  const { moneyFormatter } = useMoney();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [blankCount, setBlankCount] = useState(30);
  const [generating, setGenerating] = useState(false);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const res = await request.listAll({ entity: 'product' });
      if (res?.success) setProducts(res.result || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const selectedProducts = products.filter((p) => selectedRowKeys.includes(p._id));
  const productsWithBarcode = selectedProducts.filter((p) => p.barcode);
  const productsMissingBarcode = selectedProducts.filter((p) => !p.barcode);

  const handleGenerateSelected = async () => {
    if (!selectedRowKeys.length) {
      message.warning(translate('select_products_first'));
      return;
    }
    setGenerating(true);
    try {
      const res = await request.post({
        entity: 'product/generateBarcodes',
        jsonData: { productIds: selectedRowKeys },
      });
      if (res?.success) {
        message.success(res.message);
        await loadProducts();
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateAllMissing = async () => {
    setGenerating(true);
    try {
      const res = await request.post({
        entity: 'product/generateBarcodes',
        jsonData: {},
      });
      if (res?.success) {
        message.success(res.message);
        await loadProducts();
      }
    } finally {
      setGenerating(false);
    }
  };

  const handlePrintSelected = () => {
    const toPrint =
      productsWithBarcode.length > 0
        ? productsWithBarcode
        : selectedProducts.filter((p) => p.barcode);

    if (!toPrint.length) {
      message.warning(translate('generate_barcode_before_print'));
      return;
    }

    printBarcodeLabels(
      buildProductLabels(toPrint, {
        useMoneyFormatter: (opts) => moneyFormatter({ amount: opts.amount }),
      }),
      translate('barcode_labels')
    );
  };

  const handlePrintAll = () => {
    const withBarcode = products.filter((p) => p.barcode);
    if (!withBarcode.length) {
      message.warning(translate('no_products_with_barcode'));
      return;
    }
    printBarcodeLabels(
      buildProductLabels(withBarcode, {
        useMoneyFormatter: (opts) => moneyFormatter({ amount: opts.amount }),
      }),
      translate('barcode_labels')
    );
  };

  const handlePrintBlankSheet = () => {
    const count = Math.max(1, Math.min(blankCount || 1, 200));
    const codes = Array.from({ length: count }, () => generateBarcodeValue());
    printBarcodeLabels(buildBlankLabels(codes), translate('blank_barcode_labels'));
    message.info(translate('blank_barcode_print_hint'));
  };

  const columns = [
    { title: translate('name'), dataIndex: 'name' },
    { title: 'SKU', dataIndex: 'sku' },
    {
      title: translate('barcode'),
      dataIndex: 'barcode',
      render: (code) => code || '—',
    },
    {
      title: translate('price'),
      dataIndex: 'price',
      render: (price) => moneyFormatter({ amount: price }),
    },
  ];

  return (
    <div className="pad20">
      <PageHeader
        title={translate('bulk_barcode_print')}
        subTitle={translate('bulk_barcode_print_subtitle')}
        extra={[
          <Button key="refresh" icon={<ReloadOutlined />} onClick={loadProducts}>
            {translate('Refresh')}
          </Button>,
        ]}
      />

      <Card title={translate('print_product_labels')} style={{ marginBottom: 16 }}>
        <Typography.Paragraph type="secondary">
          {translate('bulk_barcode_workflow')}
        </Typography.Paragraph>
        <Space wrap style={{ marginBottom: 16 }}>
          <Button
            type="primary"
            icon={<BarcodeOutlined />}
            loading={generating}
            onClick={handleGenerateSelected}
            disabled={!selectedRowKeys.length}
          >
            {translate('generate_barcode_selected')}
          </Button>
          <Button icon={<BarcodeOutlined />} loading={generating} onClick={handleGenerateAllMissing}>
            {translate('generate_barcode_all_missing')}
          </Button>
          <Button
            icon={<PrinterOutlined />}
            onClick={handlePrintSelected}
            disabled={!selectedRowKeys.length}
          >
            {translate('print_selected_labels')}
          </Button>
          <Button icon={<PrinterOutlined />} onClick={handlePrintAll}>
            {translate('print_all_labels')}
          </Button>
        </Space>
        {productsMissingBarcode.length > 0 && selectedRowKeys.length > 0 && (
          <Typography.Text type="warning">
            {productsMissingBarcode.length} {translate('selected_without_barcode')}
          </Typography.Text>
        )}
        <Table
          rowKey="_id"
          loading={loading}
          rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
          dataSource={products}
          columns={columns}
          pagination={{ pageSize: 10 }}
          size="small"
        />
      </Card>

      <Card title={translate('print_blank_label_sheet')}>
        <Typography.Paragraph type="secondary">
          {translate('blank_label_sheet_hint')}
        </Typography.Paragraph>
        <Space>
          <span>{translate('label_count')}:</span>
          <InputNumber min={1} max={200} value={blankCount} onChange={setBlankCount} />
          <Button icon={<PrinterOutlined />} onClick={handlePrintBlankSheet}>
            {translate('print_blank_labels')}
          </Button>
        </Space>
      </Card>
    </div>
  );
}

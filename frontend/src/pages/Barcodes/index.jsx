import { useEffect, useState } from 'react';
import { Button, Card, Space, InputNumber, message, Typography, Table, Tag, Steps } from 'antd';
import { PrinterOutlined, BarcodeOutlined, ReloadOutlined } from '@ant-design/icons';
import { PageHeader } from '@ant-design/pro-layout';
import { request } from '@/request';
import useLanguage from '@/locale/useLanguage';
import { printBarcodeLabels, buildBlankLabels } from '@/utils/barcodePrint';

export default function Barcodes() {
  const translate = useLanguage();
  const [labelCount, setLabelCount] = useState(30);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pool, setPool] = useState({ unassigned: 0, assigned: 0, recentUnassigned: [] });

  const loadPool = async () => {
    setLoading(true);
    try {
      const res = await request.get({ entity: 'product/labelPool' });
      if (res?.success) setPool(res.result || {});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPool();
  }, []);

  const handleGenerateAndPrint = async () => {
    setGenerating(true);
    try {
      const res = await request.post({
        entity: 'product/generateLabelBatch',
        jsonData: { count: labelCount },
      });

      if (!res?.success || !res.result?.length) return;

      message.success(res.message);

      printBarcodeLabels(
        buildBlankLabels(res.result.map((l) => l.code)),
        translate('barcode_labels')
      );

      await loadPool();
    } finally {
      setGenerating(false);
    }
  };

  const handleReprintUnassigned = () => {
    const codes = pool.recentUnassigned || [];
    if (!codes.length) {
      message.warning(translate('no_unassigned_labels'));
      return;
    }
    printBarcodeLabels(
      buildBlankLabels(codes.map((l) => l.code)),
      translate('barcode_labels')
    );
  };

  const columns = [
    {
      title: translate('barcode'),
      dataIndex: 'code',
    },
    {
      title: translate('status'),
      dataIndex: 'assigned',
      render: (assigned) =>
        assigned ? (
          <Tag color="green">{translate('mapped')}</Tag>
        ) : (
          <Tag color="blue">{translate('ready_to_paste')}</Tag>
        ),
    },
  ];

  return (
    <div className="pad20">
      <PageHeader
        title={translate('bulk_barcode_print')}
        subTitle={translate('bulk_barcode_print_subtitle')}
        extra={[
          <Button key="refresh" icon={<ReloadOutlined />} onClick={loadPool}>
            {translate('Refresh')}
          </Button>,
        ]}
      />

      <Card style={{ marginBottom: 16 }}>
        <Steps
          direction="vertical"
          size="small"
          current={-1}
          items={[
            { title: translate('step_print_labels'), description: translate('step_print_labels_desc') },
            { title: translate('step_paste_labels'), description: translate('step_paste_labels_desc') },
            { title: translate('step_scan_product'), description: translate('step_scan_product_desc') },
            { title: translate('step_scan_invoice'), description: translate('step_scan_invoice_desc') },
          ]}
        />
      </Card>

      <Card title={translate('step_print_labels')} style={{ marginBottom: 16 }}>
        <Typography.Paragraph type="secondary">
          {translate('print_labels_before_products_hint')}
        </Typography.Paragraph>
        <Space wrap align="center">
          <span>{translate('label_count')}:</span>
          <InputNumber min={1} max={200} value={labelCount} onChange={setLabelCount} />
          <Button
            type="primary"
            size="large"
            icon={<PrinterOutlined />}
            loading={generating}
            onClick={handleGenerateAndPrint}
          >
            {translate('generate_and_print_labels')}
          </Button>
          <Button icon={<PrinterOutlined />} onClick={handleReprintUnassigned}>
            {translate('reprint_unassigned')}
          </Button>
        </Space>
        <div style={{ marginTop: 16 }}>
          <Tag color="blue">
            {translate('unassigned')}: {pool.unassigned || 0}
          </Tag>
          <Tag color="green" style={{ marginLeft: 8 }}>
            {translate('mapped')}: {pool.assigned || 0}
          </Tag>
        </div>
      </Card>

      <Card title={translate('unassigned_label_pool')}>
        <Typography.Paragraph type="secondary">
          {translate('unassigned_pool_hint')}
        </Typography.Paragraph>
        <Table
          rowKey="_id"
          loading={loading}
          dataSource={pool.recentUnassigned || []}
          columns={columns}
          pagination={{ pageSize: 10 }}
          size="small"
        />
      </Card>
    </div>
  );
}

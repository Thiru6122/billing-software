import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Space,
  InputNumber,
  message,
  Typography,
  Table,
  Tag,
  Steps,
  Form,
  Input,
  Row,
  Col,
  Alert,
  Select,
} from 'antd';
import { PrinterOutlined, ReloadOutlined, EyeOutlined } from '@ant-design/icons';
import { PageHeader } from '@ant-design/pro-layout';
import { useSelector } from 'react-redux';
import { request } from '@/request';
import useLanguage from '@/locale/useLanguage';
import { selectCompanySettings } from '@/redux/settings/selectors';
import {
  printBarcodeLabels,
  buildRetailLabels,
  loadLabelTemplate,
  saveLabelTemplate,
  generateBarcodeValue,
  renderLabelPreviewHtml,
  getLabelLayout,
  LABEL_PRESETS,
  loadLabelPresetId,
  saveLabelPresetId,
  getPreviewScaleStyle,
  getPreviewContainerStyle,
} from '@/utils/barcodePrint';

export default function Barcodes() {
  const translate = useLanguage();
  const companySettings = useSelector(selectCompanySettings) || {};
  const [form] = Form.useForm();
  const [labelCount, setLabelCount] = useState(30);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pool, setPool] = useState({ unassigned: 0, assigned: 0, recentUnassigned: [] });
  const [previewCode, setPreviewCode] = useState(() => generateBarcodeValue());
  const [labelPreset, setLabelPreset] = useState(() => loadLabelPresetId());

  const layout = useMemo(() => getLabelLayout(labelPreset), [labelPreset]);
  const templateValues = Form.useWatch([], form);

  useEffect(() => {
    const template = loadLabelTemplate(companySettings.company_name);
    form.setFieldsValue(template);
  }, [companySettings.company_name, form]);

  const previewLabel = useMemo(() => {
    const values = templateValues || form.getFieldsValue();
    return buildRetailLabels([previewCode], values)[0];
  }, [templateValues, previewCode, form]);

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

  const getTemplateFromForm = () => {
    const values = form.getFieldsValue();
    saveLabelTemplate(values);
    return values;
  };

  const printLabels = (codes) => {
    const template = getTemplateFromForm();
    const labels = buildRetailLabels(codes, template);
    printBarcodeLabels(labels, translate('barcode_labels'), { presetId: labelPreset });
  };

  const handlePresetChange = (value) => {
    setLabelPreset(value);
    saveLabelPresetId(value);
  };

  const handleGenerateAndPrint = async () => {
    try {
      await form.validateFields();
    } catch {
      return;
    }

    if (labelCount % layout.columns !== 0) {
      message.warning(translate('label_count_multiple_of_3'));
    }

    setGenerating(true);
    try {
      const res = await request.post({
        entity: 'product/generateLabelBatch',
        jsonData: { count: labelCount },
      });

      if (!res?.success || !res.result?.length) return;

      message.success(res.message);
      printLabels(res.result.map((l) => l.code));
      setPreviewCode(res.result[0]?.code || previewCode);
      await loadPool();
    } finally {
      setGenerating(false);
    }
  };

  const handleReprintUnassigned = async () => {
    try {
      await form.validateFields();
    } catch {
      return;
    }

    const codes = pool.recentUnassigned || [];
    if (!codes.length) {
      message.warning(translate('no_unassigned_labels'));
      return;
    }

    if (codes.length % layout.columns !== 0) {
      message.warning(translate('label_count_multiple_of_3'));
    }

    printLabels(codes.map((l) => l.code));
  };

  const handlePreviewPrint = async () => {
    try {
      await form.validateFields();
    } catch {
      return;
    }
    printLabels([previewCode, previewCode, previewCode]);
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

      <Card title={translate('label_details')} style={{ marginBottom: 16 }}>
        <Typography.Paragraph type="secondary">
          {translate('label_details_hint')}
        </Typography.Paragraph>

        <Form form={form} layout="vertical" requiredMark="optional">
          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item
                name="companyName"
                label={translate('company_name')}
                rules={[{ required: true, message: translate('required') }]}
              >
                <Input placeholder="PURE" />
              </Form.Item>
            </Col>
            <Col xs={24} md={16}>
              <Form.Item
                name="productDescription"
                label={translate('product_description')}
                rules={[{ required: true, message: translate('required') }]}
              >
                <Input placeholder="CASTOR OIL 100ML" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                name="mrp"
                label={translate('mrp_rs')}
                rules={[{ required: true, message: translate('required') }]}
              >
                <Input placeholder="39" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                name="packDate"
                label={translate('pack_date')}
                rules={[{ required: true, message: translate('required') }]}
              >
                <Input placeholder="jan 26" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                name="expiryText"
                label={translate('expiry_text')}
                rules={[{ required: true, message: translate('required') }]}
              >
                <Input placeholder="12 MONTHS" />
              </Form.Item>
            </Col>
          </Row>
        </Form>

        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col xs={24} md={12}>
            <Typography.Text>{translate('label_printer_preset')}</Typography.Text>
            <Select
              style={{ width: '100%', marginTop: 8 }}
              value={labelPreset}
              onChange={handlePresetChange}
              options={Object.values(LABEL_PRESETS).map((p) => ({
                value: p.id,
                label: p.name,
              }))}
            />
          </Col>
        </Row>

        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message={translate('tvs_neo46_print_hint')}
        />

        <Row gutter={24} align="middle">
          <Col xs={24} md={12}>
            <Typography.Text strong>{translate('label_preview')}</Typography.Text>
            <Typography.Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
              {translate('label_preview_row_hint')}
            </Typography.Text>
            <div style={{ marginTop: 8, ...getPreviewContainerStyle(labelPreset) }}>
              <div
                style={{
                  border: '1px solid #d9d9d9',
                  background: '#fff',
                  overflow: 'hidden',
                  ...getPreviewScaleStyle(labelPreset),
                }}
                dangerouslySetInnerHTML={{
                  __html: renderLabelPreviewHtml(previewLabel, labelPreset),
                }}
              />
            </div>
            <Button
              type="link"
              size="small"
              style={{ paddingLeft: 0, marginTop: 8 }}
              icon={<EyeOutlined />}
              onClick={handlePreviewPrint}
            >
              {translate('print_preview_label')}
            </Button>
          </Col>
          <Col xs={24} md={12}>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <div>
                <span>{translate('label_count')}: </span>
                <InputNumber
                  min={3}
                  max={200}
                  step={3}
                  value={labelCount}
                  onChange={setLabelCount}
                />
              </div>
              <Space wrap>
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
              <div>
                <Tag color="blue">
                  {translate('unassigned')}: {pool.unassigned || 0}
                </Tag>
                <Tag color="green" style={{ marginLeft: 8 }}>
                  {translate('mapped')}: {pool.assigned || 0}
                </Tag>
              </div>
            </Space>
          </Col>
        </Row>
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

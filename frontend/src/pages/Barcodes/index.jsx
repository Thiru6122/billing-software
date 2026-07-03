import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Space,
  InputNumber,
  message,
  Modal,
  Typography,
  Table,
  Tag,
  Steps,
  Row,
  Col,
  Alert,
  Select,
  Input,
} from 'antd';
import { PrinterOutlined, ReloadOutlined, FilePdfOutlined, BarcodeOutlined } from '@ant-design/icons';
import { PageHeader } from '@ant-design/pro-layout';
import { request } from '@/request';
import useLanguage from '@/locale/useLanguage';
import useMoney from '@/settings/useMoney';
import {
  deliverBarcodeLabelPdf,
  buildProductLabels,
  renderLabelPreviewHtml,
  getLabelLayout,
  LABEL_PRESETS,
  loadLabelPresetId,
  saveLabelPresetId,
  getPreviewScaleStyle,
  getPreviewContainerStyle,
} from '@/utils/barcodePrint';

function expandProductLabels(products, qtyById, moneyFormatter) {
  const labels = [];
  products.forEach((product) => {
    if (!product.barcode) return;
    const qty = Math.max(1, qtyById[product._id] || 1);
    const [label] = buildProductLabels([product], { useMoneyFormatter: moneyFormatter });
    for (let i = 0; i < qty; i++) labels.push(label);
  });
  return labels;
}

export default function Barcodes() {
  const translate = useLanguage();
  const { moneyFormatter } = useMoney();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [labelQtyByProductId, setLabelQtyByProductId] = useState({});
  const [labelPreset, setLabelPreset] = useState(() => loadLabelPresetId());
  const [pdfLoading, setPdfLoading] = useState(false);
  const [assigningBarcodes, setAssigningBarcodes] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const layout = useMemo(() => getLabelLayout(labelPreset), [labelPreset]);

  const productsWithBarcode = useMemo(
    () => products.filter((p) => p.barcode && String(p.barcode).trim()),
    [products]
  );
  const productsWithoutBarcode = useMemo(
    () => products.filter((p) => !p.barcode || !String(p.barcode).trim()),
    [products]
  );

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return products;

    return products.filter((product) => {
      const searchable = [
        product.name,
        product.sku,
        product.barcode,
        product.companyName,
        product.category,
        product.enterpriseLine1,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchable.includes(query);
    });
  }, [products, searchQuery]);

  const selectedProducts = useMemo(
    () => products.filter((p) => selectedRowKeys.includes(p._id)),
    [products, selectedRowKeys]
  );

  const previewProduct = useMemo(() => {
    const withBarcode = selectedProducts.find((p) => p.barcode);
    return withBarcode || productsWithBarcode[0] || null;
  }, [selectedProducts, productsWithBarcode]);

  const previewLabel = useMemo(() => {
    if (!previewProduct) return null;
    return buildProductLabels([previewProduct], { useMoneyFormatter: moneyFormatter })[0];
  }, [previewProduct, moneyFormatter]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const res = await request.listAll({ entity: 'product' });
      if (res?.success) {
        const list = res.result || [];
        setProducts(list);
        setLabelQtyByProductId((prev) => {
          const next = { ...prev };
          list.forEach((p) => {
            if (!next[p._id]) next[p._id] = 1;
          });
          return next;
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const showAdobePrintInstructions = () => {
    Modal.info({
      title: translate('label_adobe_print_title'),
      width: 520,
      okText: translate('close'),
      content: (
        <div style={{ lineHeight: 1.7 }}>
          <Typography.Paragraph style={{ marginBottom: 12 }}>
            {translate('label_adobe_print_intro')}
          </Typography.Paragraph>
          <ol style={{ paddingLeft: 20, margin: 0 }}>
            <li>{translate('label_adobe_step_printer')}</li>
            <li>{translate('label_adobe_step_media')}</li>
            <li>{translate('label_adobe_step_driver_size')}</li>
            <li>{translate('label_adobe_step_preview')}</li>
            <li>{translate('label_adobe_step_range')}</li>
            <li>{translate('label_adobe_step_scale')}</li>
            <li>{translate('label_adobe_step_orientation')}</li>
            <li>{translate('label_adobe_step_rotate')}</li>
            <li>{translate('label_adobe_step_paper_source')}</li>
          </ol>
        </div>
      ),
    });
  };

  const deliverPdf = async (labels, { mode = 'download', filename } = {}) => {
    if (!labels?.length) {
      message.warning(translate('no_products_selected_for_labels'));
      return null;
    }

    if (labels.length % layout.columns !== 0) {
      message.warning(translate('label_count_multiple_of_3'));
    }

    setPdfLoading(true);
    try {
      const result = await deliverBarcodeLabelPdf(labels, translate('barcode_labels'), {
        presetId: labelPreset,
        mode,
        filename,
      });

      if (!result.success) {
        message.error(result.message || translate('label_print_failed'));
        return null;
      }

      if (mode === 'download') {
        message.success(
          `${translate('label_pdf_downloaded')} (${result.labelCount} labels, ${result.rowCount} row(s))`
        );
      } else if (result.mode === 'download' && result.message) {
        message.warning(result.message);
      } else {
        message.success(translate('label_pdf_opened'));
        showAdobePrintInstructions();
      }
      return result;
    } finally {
      setPdfLoading(false);
    }
  };

  const handlePresetChange = (value) => {
    setLabelPreset(value);
    saveLabelPresetId(value);
  };

  const handleAssignMissingBarcodes = async () => {
    const ids = productsWithoutBarcode.map((p) => p._id);
    if (!ids.length) {
      message.info(translate('all_products_have_barcode'));
      return;
    }

    setAssigningBarcodes(true);
    try {
      const res = await request.post({
        entity: 'product/generateBarcodes',
        jsonData: { productIds: ids },
      });
      if (res?.success) {
        message.success(res.message);
        await loadProducts();
      }
    } finally {
      setAssigningBarcodes(false);
    }
  };

  const handleDownloadSelected = async () => {
    const printable = selectedProducts.filter((p) => p.barcode);
    if (!printable.length) {
      message.warning(translate('no_products_selected_for_labels'));
      return;
    }

    const labels = expandProductLabels(printable, labelQtyByProductId, moneyFormatter);
    await deliverPdf(labels, { mode: 'download' });
  };

  const handlePrintOneRow = async () => {
    if (!previewLabel) {
      message.warning(translate('no_products_with_barcode'));
      return;
    }
    const labels = [previewLabel, previewLabel, previewLabel];
    const result = await deliverPdf(labels, {
      mode: 'download',
      filename: 'barcode-labels-1-row.pdf',
    });
    if (result?.success) showAdobePrintInstructions();
  };

  const handleLabelQtyChange = (productId, value) => {
    setLabelQtyByProductId((prev) => ({
      ...prev,
      [productId]: Math.max(1, value || 1),
    }));
  };

  const totalSelectedLabels = useMemo(() => {
    return selectedProducts.reduce((sum, p) => {
      if (!p.barcode) return sum;
      return sum + (labelQtyByProductId[p._id] || 1);
    }, 0);
  }, [selectedProducts, labelQtyByProductId]);

  const columns = [
    {
      title: translate('name'),
      dataIndex: 'name',
      ellipsis: true,
    },
    {
      title: translate('barcode'),
      dataIndex: 'barcode',
      width: 140,
      render: (barcode) =>
        barcode ? (
          <Typography.Text code>{barcode}</Typography.Text>
        ) : (
          <Tag color="orange">{translate('missing_barcode')}</Tag>
        ),
    },
    {
      title: translate('company_name'),
      dataIndex: 'companyName',
      width: 100,
      ellipsis: true,
    },
    {
      title: translate('pack_date'),
      dataIndex: 'packDate',
      width: 90,
    },
    {
      title: translate('price'),
      dataIndex: 'price',
      width: 100,
      render: (price) => moneyFormatter({ amount: price }),
    },
    {
      title: translate('label_qty_per_product'),
      key: 'labelQty',
      width: 120,
      render: (_, record) => (
        <InputNumber
          min={1}
          max={99}
          value={labelQtyByProductId[record._id] || 1}
          disabled={!record.barcode}
          onChange={(value) => handleLabelQtyChange(record._id, value)}
        />
      ),
    },
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: setSelectedRowKeys,
    getCheckboxProps: (record) => ({
      disabled: !record.barcode,
    }),
  };

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

      <Card style={{ marginBottom: 16 }}>
        <Steps
          direction="vertical"
          size="small"
          current={-1}
          items={[
            { title: translate('step_add_product'), description: translate('step_add_product_desc') },
            { title: translate('step_select_products'), description: translate('step_select_products_desc') },
            { title: translate('step_print_labels'), description: translate('step_print_labels_desc') },
            { title: translate('step_scan_invoice'), description: translate('step_scan_invoice_desc') },
          ]}
        />
      </Card>

      <Card title={translate('label_print_actions')} style={{ marginBottom: 16 }}>
        <Typography.Paragraph type="secondary">
          {translate('label_details_from_product_hint')}
        </Typography.Paragraph>

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
          type="warning"
          showIcon
          style={{ marginBottom: 8 }}
          message={translate('label_print_letter_warning')}
        />
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
              {previewProduct
                ? `${translate('preview_for')}: ${previewProduct.name}`
                : translate('label_preview_row_hint')}
            </Typography.Text>
            <div style={{ marginTop: 8, ...getPreviewContainerStyle(labelPreset) }}>
              {previewLabel ? (
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
              ) : (
                <Alert type="info" message={translate('no_products_with_barcode')} showIcon />
              )}
            </div>
            <Button
              type="link"
              size="small"
              style={{ paddingLeft: 0, marginTop: 8 }}
              icon={<PrinterOutlined />}
              loading={pdfLoading}
              disabled={!previewLabel}
              onClick={handlePrintOneRow}
            >
              {translate('print_one_row_pdf')}
            </Button>
          </Col>
          <Col xs={24} md={12}>
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <Typography.Paragraph type="secondary" style={{ fontSize: 12 }}>
                {translate('label_print_pdf_hint')}
              </Typography.Paragraph>
              <Button
                type="primary"
                size="large"
                icon={<FilePdfOutlined />}
                loading={pdfLoading}
                disabled={!selectedRowKeys.length}
                onClick={handleDownloadSelected}
              >
                {translate('download_selected_labels_pdf')}
              </Button>
              {selectedRowKeys.length > 0 && (
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {`${translate('selected_labels_count')}: ${totalSelectedLabels}`}
                </Typography.Text>
              )}
            </Space>
          </Col>
        </Row>
      </Card>

      <Card
        title={translate('products_for_barcode_print')}
        extra={
          productsWithoutBarcode.length > 0 ? (
            <Button
              icon={<BarcodeOutlined />}
              loading={assigningBarcodes}
              onClick={handleAssignMissingBarcodes}
            >
              {translate('assign_missing_barcodes')} ({productsWithoutBarcode.length})
            </Button>
          ) : null
        }
      >
        <Typography.Paragraph type="secondary">
          {translate('products_for_barcode_print_hint')}
        </Typography.Paragraph>
        <Input.Search
          allowClear
          size="large"
          placeholder={translate('search_product_for_labels')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ marginBottom: 16, maxWidth: 480 }}
        />
        {searchQuery.trim() ? (
          <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 12, fontSize: 12 }}>
            {`${filteredProducts.length} / ${products.length} ${translate('products').toLowerCase()}`}
          </Typography.Text>
        ) : null}
        <Table
          rowKey="_id"
          loading={loading}
          dataSource={filteredProducts}
          columns={columns}
          rowSelection={rowSelection}
          pagination={{ pageSize: 15 }}
          size="small"
          locale={{
            emptyText: searchQuery.trim()
              ? translate('no_products_match_search')
              : translate('no_products_with_barcode'),
          }}
        />
      </Card>
    </div>
  );
}

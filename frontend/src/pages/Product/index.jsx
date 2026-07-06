import { useState } from 'react';
import { Button, Modal, message, Tag } from 'antd';
import { SyncOutlined } from '@ant-design/icons';
import { useDispatch } from 'react-redux';
import CrudModule from '@/modules/CrudModule/CrudModule';
import ProductForm from '@/forms/ProductForm';
import useLanguage from '@/locale/useLanguage';
import { request } from '@/request';
import { crud } from '@/redux/crud/actions';

export default function Product() {
  const translate = useLanguage();
  const dispatch = useDispatch();
  const entity = 'product';
  const [backfillLoading, setBackfillLoading] = useState(false);

  const searchConfig = {
    displayLabels: ['name', 'sku'],
    searchFields: 'name,sku,barcode',
  };
  const deleteModalLabels = ['name'];

  const handleBackfillHsn = () => {
    Modal.confirm({
      title: translate('backfill_hsn_confirm_title'),
      content: translate('backfill_hsn_confirm_message'),
      okText: translate('backfill_hsn_codes'),
      onOk: async () => {
        setBackfillLoading(true);
        try {
          const res = await request.post({
            entity: 'product/backfillHsn',
            jsonData: {},
          });
          if (res?.success) {
            message.success(res.message);
            dispatch(crud.list({ entity }));
          }
        } finally {
          setBackfillLoading(false);
        }
      },
    });
  };

  const dataTableColumns = [
    {
      title: translate('name'),
      dataIndex: 'name',
    },
    {
      title: 'SKU',
      dataIndex: 'sku',
    },
    {
      title: translate('hsn_code'),
      dataIndex: 'hsnCode',
      render: (hsnCode) => hsnCode || <Tag color="orange">—</Tag>,
    },
    {
      title: translate('barcode'),
      dataIndex: 'barcode',
    },
    {
      title: translate('category'),
      dataIndex: 'category',
    },
    {
      title: translate('quantity'),
      dataIndex: 'quantity',
      render: (qty, record) => {
        const low = (qty || 0) <= (record.minQuantity || 0);
        return low ? <Tag color="red">{qty}</Tag> : qty;
      },
    },
    {
      title: translate('price'),
      dataIndex: 'price',
    },
    {
      title: translate('enabled'),
      dataIndex: 'enabled',
      render: (enabled) => (enabled ? '✓' : '—'),
    },
  ];

  const readColumns = [
    { title: translate('name'), dataIndex: 'name' },
    { title: 'SKU', dataIndex: 'sku' },
    { title: translate('barcode'), dataIndex: 'barcode' },
    { title: translate('label_enterprise_line1'), dataIndex: 'enterpriseLine1' },
    { title: translate('company_name'), dataIndex: 'companyName' },
    { title: translate('pack_date'), dataIndex: 'packDate' },
    { title: translate('expiry_text'), dataIndex: 'expiryText' },
    { title: translate('category'), dataIndex: 'category' },
    { title: translate('hsn_code'), dataIndex: 'hsnCode' },
    { title: translate('unit'), dataIndex: 'unit' },
    { title: translate('quantity'), dataIndex: 'quantity' },
    { title: translate('price'), dataIndex: 'price' },
    { title: translate('cost'), dataIndex: 'cost' },
    { title: translate('min_quantity'), dataIndex: 'minQuantity' },
    { title: translate('description'), dataIndex: 'description' },
    { title: translate('enabled'), dataIndex: 'enabled' },
  ];

  const Labels = {
    PANEL_TITLE: translate('products'),
    DATATABLE_TITLE: translate('product_list'),
    ADD_NEW_ENTITY: translate('add_new_product'),
    ENTITY_NAME: translate('product'),
  };

  const config = {
    entity,
    ...Labels,
    dataTableColumns,
    readColumns,
    searchConfig,
    deleteModalLabels,
  };

  return (
    <>
      <div style={{ marginBottom: 12, textAlign: 'right' }}>
        <Button
          icon={<SyncOutlined />}
          loading={backfillLoading}
          onClick={handleBackfillHsn}
        >
          {translate('backfill_hsn_codes')}
        </Button>
      </div>
      <CrudModule
        createForm={<ProductForm />}
        updateForm={<ProductForm isUpdateForm={true} />}
        config={config}
      />
    </>
  );
}

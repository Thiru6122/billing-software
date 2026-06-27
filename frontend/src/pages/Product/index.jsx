import CrudModule from '@/modules/CrudModule/CrudModule';
import ProductForm from '@/forms/ProductForm';
import useLanguage from '@/locale/useLanguage';
import { Tag } from 'antd';

export default function Product() {
  const translate = useLanguage();
  const entity = 'product';
  const searchConfig = {
    displayLabels: ['name', 'sku'],
    searchFields: 'name,sku,barcode',
  };
  const deleteModalLabels = ['name'];

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
    { title: translate('category'), dataIndex: 'category' },
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
    <CrudModule
      createForm={<ProductForm />}
      updateForm={<ProductForm isUpdateForm={true} />}
      config={config}
    />
  );
}

import CrudModule from '@/modules/CrudModule/CrudModule';
import ProductCategoryForm from '@/forms/ProductCategoryForm';
import useLanguage from '@/locale/useLanguage';

export default function ProductCategory() {
  const translate = useLanguage();
  const entity = 'productcategory';

  const dataTableColumns = [
    { title: translate('category'), dataIndex: 'name' },
    { title: translate('hsn_code'), dataIndex: 'hsnCode' },
    {
      title: 'GST %',
      dataIndex: 'taxRate',
      render: (value) => `${value || 0}%`,
    },
    {
      title: translate('enabled'),
      dataIndex: 'enabled',
      render: (enabled) => (enabled ? '✓' : '—'),
    },
  ];

  const readColumns = [
    { title: translate('category'), dataIndex: 'name' },
    { title: translate('hsn_code'), dataIndex: 'hsnCode' },
    { title: 'GST %', dataIndex: 'taxRate' },
    { title: translate('description'), dataIndex: 'description' },
    { title: translate('enabled'), dataIndex: 'enabled' },
  ];

  return (
    <CrudModule
      createForm={<ProductCategoryForm />}
      updateForm={<ProductCategoryForm />}
      config={{
        entity,
        PANEL_TITLE: translate('product_categories'),
        DATATABLE_TITLE: translate('product_category_list'),
        ADD_NEW_ENTITY: translate('add_product_category'),
        ENTITY_NAME: translate('category'),
        dataTableColumns,
        readColumns,
        searchConfig: {
          displayLabels: ['name', 'hsnCode'],
          searchFields: 'name,hsnCode',
        },
        deleteModalLabels: ['name'],
      }}
    />
  );
}

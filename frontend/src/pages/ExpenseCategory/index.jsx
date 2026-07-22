import CrudModule from '@/modules/CrudModule/CrudModule';
import ExpenseCategoryForm from '@/forms/ExpenseCategoryForm';
import useLanguage from '@/locale/useLanguage';

export default function ExpenseCategory() {
  const translate = useLanguage();
  const entity = 'expensecategory';

  const dataTableColumns = [
    { title: translate('category'), dataIndex: 'name' },
    {
      title: translate('enabled'),
      dataIndex: 'enabled',
      render: (enabled) => (enabled ? '✓' : '—'),
    },
  ];

  const readColumns = [
    { title: translate('category'), dataIndex: 'name' },
    { title: translate('description'), dataIndex: 'description' },
    { title: translate('enabled'), dataIndex: 'enabled' },
  ];

  return (
    <CrudModule
      createForm={<ExpenseCategoryForm />}
      updateForm={<ExpenseCategoryForm />}
      config={{
        entity,
        PANEL_TITLE: translate('expenses_category'),
        DATATABLE_TITLE: translate('expense_category_list'),
        ADD_NEW_ENTITY: translate('add_new_expense_category'),
        ENTITY_NAME: translate('expense_category'),
        dataTableColumns,
        readColumns,
        searchConfig: {
          displayLabels: ['name'],
          searchFields: 'name',
        },
        deleteModalLabels: ['name'],
      }}
    />
  );
}

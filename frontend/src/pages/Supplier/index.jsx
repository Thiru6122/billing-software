import CrudModule from '@/modules/CrudModule/CrudModule';
import DynamicForm from '@/forms/DynamicForm';
import { fields } from '@/pages/Customer/config';
import useLanguage from '@/locale/useLanguage';

export default function Supplier() {
  const translate = useLanguage();
  const entity = 'supplier';

  return (
    <CrudModule
      createForm={<DynamicForm fields={fields} />}
      updateForm={<DynamicForm fields={fields} />}
      config={{
        entity,
        PANEL_TITLE: translate('suppliers'),
        DATATABLE_TITLE: translate('supplier_list'),
        ADD_NEW_ENTITY: translate('add_new_supplier'),
        ENTITY_NAME: translate('supplier'),
        fields,
        searchConfig: { displayLabels: ['name'], searchFields: 'name' },
        deleteModalLabels: ['name'],
      }}
    />
  );
}

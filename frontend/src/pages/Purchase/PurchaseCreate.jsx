import useLanguage from '@/locale/useLanguage';
import CreatePurchaseModule from '@/modules/PurchaseModule/CreatePurchaseModule';

export default function PurchaseCreate() {
  const translate = useLanguage();
  return (
    <CreatePurchaseModule
      config={{
        entity: 'purchase',
        PANEL_TITLE: translate('purchases'),
        DATATABLE_TITLE: translate('purchase_list'),
        ADD_NEW_ENTITY: translate('add_new_purchase'),
        ENTITY_NAME: translate('purchase'),
      }}
    />
  );
}

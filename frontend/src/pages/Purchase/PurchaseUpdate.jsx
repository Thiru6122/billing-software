import useLanguage from '@/locale/useLanguage';
import UpdatePurchaseModule from '@/modules/PurchaseModule/UpdatePurchaseModule';

export default function PurchaseUpdate() {
  const translate = useLanguage();
  return (
    <UpdatePurchaseModule
      config={{
        entity: 'purchase',
        ENTITY_NAME: translate('purchase'),
      }}
    />
  );
}

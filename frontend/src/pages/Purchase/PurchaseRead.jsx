import useLanguage from '@/locale/useLanguage';
import ReadPurchaseModule from '@/modules/PurchaseModule/ReadPurchaseModule';

export default function PurchaseRead() {
  const translate = useLanguage();
  return (
    <ReadPurchaseModule
      config={{
        entity: 'purchase',
        ENTITY_NAME: translate('purchase'),
      }}
    />
  );
}

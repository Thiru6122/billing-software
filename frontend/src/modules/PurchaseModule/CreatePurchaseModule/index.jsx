import { ErpLayout } from '@/layout';
import CreateItem from '@/modules/ErpPanelModule/CreateItem';
import PurchaseForm from '@/modules/PurchaseModule/Forms/PurchaseForm';

export default function CreatePurchaseModule({ config }) {
  return (
    <ErpLayout>
      <CreateItem config={config} CreateForm={PurchaseForm} />
    </ErpLayout>
  );
}

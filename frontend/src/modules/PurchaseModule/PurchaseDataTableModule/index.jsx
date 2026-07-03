import { ErpLayout } from '@/layout';
import ErpPanel from '@/modules/ErpPanelModule';

export default function PurchaseDataTableModule({ config }) {
  return (
    <ErpLayout>
      <ErpPanel config={config} />
    </ErpLayout>
  );
}

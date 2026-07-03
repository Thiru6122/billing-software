import dayjs from 'dayjs';
import useLanguage from '@/locale/useLanguage';
import { useMoney, useDate } from '@/settings';
import PurchaseDataTableModule from '@/modules/PurchaseModule/PurchaseDataTableModule';

export default function Purchase() {
  const translate = useLanguage();
  const { dateFormat } = useDate();
  const entity = 'purchase';
  const { moneyFormatter } = useMoney();

  const dataTableColumns = [
    { title: translate('Number'), dataIndex: 'number' },
    {
      title: translate('supplier'),
      dataIndex: 'supplierName',
      render: (_, record) => record.supplierName || record.supplier?.name || '—',
    },
    {
      title: translate('Date'),
      dataIndex: 'date',
      render: (date) => dayjs(date).format(dateFormat),
    },
    {
      title: translate('status'),
      dataIndex: 'status',
    },
    {
      title: translate('Total'),
      dataIndex: 'total',
      render: (total, record) => moneyFormatter({ amount: total, currency_code: record.currency }),
    },
  ];

  return (
    <PurchaseDataTableModule
      config={{
        entity,
        PANEL_TITLE: translate('purchases'),
        DATATABLE_TITLE: translate('purchase_list'),
        ADD_NEW_ENTITY: translate('add_new_purchase'),
        ENTITY_NAME: translate('purchase'),
        dataTableColumns,
        searchConfig: {
          entity: 'supplier',
          displayLabels: ['name'],
          searchFields: 'name',
        },
        deleteModalLabels: ['number', 'supplier.name'],
      }}
    />
  );
}

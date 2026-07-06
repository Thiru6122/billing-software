import { useEffect } from 'react';

import {
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  EllipsisOutlined,
  RedoOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import { Dropdown, Table, Button, Input } from 'antd';
import { PageHeader } from '@ant-design/pro-layout';

import { useSelector, useDispatch } from 'react-redux';
import { crud } from '@/redux/crud/actions';
import { selectListItems } from '@/redux/crud/selectors';
import useLanguage from '@/locale/useLanguage';
import { dataForTable } from '@/utils/dataStructure';
import { useMoney, useDate } from '@/settings';
import { enhanceColumnsWithSort } from '@/utils/tableColumns';
import { useTableListLoader } from '@/utils/useTableListLoader';

import { generate as uniqueId } from 'shortid';

import { useCrudContext } from '@/context/crud';

function AddNewItem({ config }) {
  const { crudContextAction } = useCrudContext();
  const { collapsedBox, panel } = crudContextAction;
  const { ADD_NEW_ENTITY } = config;

  const handelClick = () => {
    panel.open();
    collapsedBox.close();
  };

  return (
    <Button onClick={handelClick} type="primary">
      {ADD_NEW_ENTITY}
    </Button>
  );
}
export default function DataTable({ config, extra = [] }) {
  let { entity, dataTableColumns, DATATABLE_TITLE, fields, searchConfig } = config;
  const { crudContextAction } = useCrudContext();
  const { panel, collapsedBox, modal, readBox, editBox, advancedBox } = crudContextAction;
  const translate = useLanguage();
  const { moneyFormatter } = useMoney();
  const { dateFormat } = useDate();

  const items = [
    {
      label: translate('Show'),
      key: 'read',
      icon: <EyeOutlined />,
    },
    {
      label: translate('Edit'),
      key: 'edit',
      icon: <EditOutlined />,
    },
    ...extra,
    {
      type: 'divider',
    },

    {
      label: translate('Delete'),
      key: 'delete',
      icon: <DeleteOutlined />,
    },
  ];

  const dispatch = useDispatch();
  const { loadList, handleTableChange, listParamsRef, sortState } = useTableListLoader(
    dispatch,
    entity,
    crud
  );

  const handleRead = (record) => {
    dispatch(crud.currentItem({ data: record }));
    panel.open();
    collapsedBox.open();
    readBox.open();
  };
  function handleEdit(record) {
    dispatch(crud.currentItem({ data: record }));
    dispatch(crud.currentAction({ actionType: 'update', data: record }));
    editBox.open();
    panel.open();
    collapsedBox.open();
  }
  function handleDelete(record) {
    dispatch(crud.currentAction({ actionType: 'delete', data: record }));
    modal.open();
  }

  function handleUpdatePassword(record) {
    dispatch(crud.currentItem({ data: record }));
    dispatch(crud.currentAction({ actionType: 'update', data: record }));
    advancedBox.open();
    panel.open();
    collapsedBox.open();
  }

  let dispatchColumns = [];
  if (fields) {
    dispatchColumns = [...dataForTable({ fields, translate, moneyFormatter, dateFormat })];
  } else {
    dispatchColumns = [...dataTableColumns];
  }

  dataTableColumns = enhanceColumnsWithSort(
    [
      ...dispatchColumns,
      {
        title: '',
        key: 'action',
        fixed: 'right',
        render: (_, record) => (
          <Dropdown
            menu={{
              items,
              onClick: ({ key }) => {
                switch (key) {
                  case 'read':
                    handleRead(record);
                    break;
                  case 'edit':
                    handleEdit(record);
                    break;

                  case 'delete':
                    handleDelete(record);
                    break;
                  case 'updatePassword':
                    handleUpdatePassword(record);
                    break;

                  default:
                    break;
                }
              },
            }}
            trigger={['click']}
          >
            <EllipsisOutlined
              style={{ cursor: 'pointer', fontSize: '24px' }}
              onClick={(e) => e.preventDefault()}
            />
          </Dropdown>
        ),
      },
    ],
    sortState
  );

  const { result: listResult, isLoading: listIsLoading } = useSelector(selectListItems);

  const { pagination, items: dataSource } = listResult;

  const filterTable = (e) => {
    const value = e.target.value;
    const options = {
      page: 1,
      items: listParamsRef.current.items || 10,
    };

    if (value) {
      options.q = value;
      options.fields = searchConfig?.searchFields || '';
    } else {
      delete options.q;
      delete options.fields;
    }

    loadList(options);
  };

  useEffect(() => {
    const controller = new AbortController();
    loadList();
    return () => {
      controller.abort();
    };
  }, [loadList]);

  return (
    <>
      <PageHeader
        onBack={() => window.history.back()}
        backIcon={<ArrowLeftOutlined />}
        title={DATATABLE_TITLE}
        ghost={false}
        extra={[
          <Input
            key={`searchFilterDataTable}`}
            onChange={filterTable}
            placeholder={translate('search')}
            allowClear
          />,
          <Button onClick={() => loadList()} key={`${uniqueId()}`} icon={<RedoOutlined />}>
            {translate('Refresh')}
          </Button>,

          <AddNewItem key={`${uniqueId()}`} config={config} />,
        ]}
        style={{
          padding: '20px 0px',
        }}
      ></PageHeader>

      <Table
        columns={dataTableColumns}
        rowKey={(item) => item._id}
        dataSource={dataSource}
        pagination={pagination}
        loading={listIsLoading}
        onChange={handleTableChange}
        scroll={{ x: true }}
      />
    </>
  );
}

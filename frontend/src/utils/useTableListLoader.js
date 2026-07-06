import { useCallback, useRef, useState } from 'react';

function getSorterField(sorter) {
  const active = Array.isArray(sorter) ? sorter[0] : sorter;
  if (!active) return null;
  const field = active.columnKey || active.field;
  if (!field) return null;
  return Array.isArray(field) ? field[0] : field;
}

function getSorterOrder(sorter) {
  const active = Array.isArray(sorter) ? sorter[0] : sorter;
  return active?.order;
}

export function useTableListLoader(dispatch, entity, listAction) {
  const listParamsRef = useRef({ page: 1, items: 10 });
  const [sortState, setSortState] = useState(null);

  const loadList = useCallback(
    (overrides = {}) => {
      const options = { ...listParamsRef.current, ...overrides };
      listParamsRef.current = options;
      dispatch(listAction.list({ entity, options }));
    },
    [dispatch, entity, listAction]
  );

  const handleTableChange = useCallback(
    (pagination, _filters, sorter) => {
      const options = {
        ...listParamsRef.current,
        page: pagination?.current || 1,
        items: pagination?.pageSize || listParamsRef.current.items || 10,
      };

      const field = getSorterField(sorter);
      const order = getSorterOrder(sorter);
      if (field && order) {
        options.sortBy = field;
        options.sortValue = order === 'ascend' ? 1 : -1;
        setSortState({ field, order });
      } else {
        delete options.sortBy;
        delete options.sortValue;
        setSortState(null);
      }

      loadList(options);
    },
    [loadList]
  );

  return {
    loadList,
    handleTableChange,
    listParamsRef,
    sortState,
  };
}

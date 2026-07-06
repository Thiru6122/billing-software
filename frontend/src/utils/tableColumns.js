const NON_SORTABLE_KEYS = new Set(['action', '', 'labelQty']);

function getColumnField(column) {
  if (column.dataIndex) {
    return Array.isArray(column.dataIndex) ? column.dataIndex[0] : column.dataIndex;
  }
  return column.key;
}

export function enhanceColumnsWithSort(columns, sortState = null) {
  return columns.map((column) => {
    if (column.sorter !== undefined || column.children) return column;

    const field = getColumnField(column);
    if (!field || NON_SORTABLE_KEYS.has(field) || typeof field !== 'string') {
      return column;
    }

    const next = {
      ...column,
      sorter: true,
      showSorterTooltip: true,
    };

    if (sortState?.field === field) {
      next.sortOrder = sortState.order;
    }

    return next;
  });
}

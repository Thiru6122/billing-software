import { PRINT_BASE_URL } from '@/config/serverApiConfig';

/** Open the same HTML template used for PDF download, then print it. */
export function openDocumentPrint(entity, id) {
  if (!entity || !id) return false;
  const directory = String(entity).toLowerCase();
  const url = `${PRINT_BASE_URL}${directory}/${id}`;
  window.open(url, '_blank', 'noopener,noreferrer');
  return true;
}

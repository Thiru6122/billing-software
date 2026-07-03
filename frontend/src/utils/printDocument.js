import { PRINT_BASE_URL } from '@/config/serverApiConfig';

/** Open the same HTML template used for PDF download, then print it. */
export function openDocumentPrint(entity, id, paper = 'A4') {
  if (!entity || !id) return false;
  const directory = String(entity).toLowerCase();
  const format = String(paper).toUpperCase() === 'A5' ? 'A5' : 'A4';
  const url = `${PRINT_BASE_URL}${directory}/${id}?paper=${format}`;
  window.open(url, '_blank', 'noopener,noreferrer');
  return true;
}

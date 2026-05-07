import type { ContextSheetData } from '../types';

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function getValueAtPath(value: unknown, path: string) {
  return path.split('.').reduce<unknown>((currentValue, segment) => {
    if (typeof currentValue !== 'object' || currentValue === null) {
      return '';
    }

    if (!(segment in currentValue)) {
      return '';
    }

    return (currentValue as Record<string, unknown>)[segment];
  }, value);
}

function stringifyTemplateValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value
      .map((entry) => stringifyTemplateValue(entry))
      .filter(Boolean)
      .join(', ');
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  if (typeof value === 'number') {
    return String(value);
  }

  if (typeof value === 'string') {
    return value;
  }

  if (!value) {
    return '';
  }

  return JSON.stringify(value);
}

export function renderContextSheetHtml(
  templateHtml: string | null,
  data: ContextSheetData
) {
  if (!templateHtml?.trim()) {
    return null;
  }

  const renderedTemplate = templateHtml.replace(
    /\{\{\s*([^}]+?)\s*\}\}/g,
    (_match, rawPath: string) => {
      const path = rawPath.trim();
      const value = getValueAtPath(data, path);

      return escapeHtml(stringifyTemplateValue(value));
    }
  );

  const viewportMeta =
    '<meta name="viewport" content="width=device-width, initial-scale=0.58, minimum-scale=0.25, maximum-scale=5, user-scalable=yes" />';

  if (renderedTemplate.includes('name="viewport"')) {
    return renderedTemplate;
  }

  if (renderedTemplate.includes('<head>')) {
    return renderedTemplate.replace('<head>', `<head>${viewportMeta}`);
  }

  return `${viewportMeta}${renderedTemplate}`;
}

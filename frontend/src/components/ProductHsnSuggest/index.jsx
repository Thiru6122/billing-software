import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Form, Select, Space, Typography, message } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { request } from '@/request';
import useLanguage from '@/locale/useLanguage';
import useDebounce from '@/hooks/useDebounce';

function normalizeCategoryValue(category) {
  if (category == null || category === '') return '';
  if (typeof category === 'string') return category;
  if (typeof category === 'object') {
    return category.name || category.label || '';
  }
  return String(category);
}

export default function ProductHsnSuggest() {
  const translate = useLanguage();
  const form = Form.useFormInstance();
  const productName = Form.useWatch('name', form);
  const category = Form.useWatch('category', form);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [lastMatch, setLastMatch] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const manualHsnRef = useRef(false);

  const [, cancelDebounce] = useDebounce(() => setDebouncedSearch(searchText), 500, [searchText]);

  useEffect(() => {
    setSearchText(productName || '');
  }, [productName]);

  const applySuggestion = (item) => {
    if (!item?.hsnCode) return false;

    form.setFieldValue('hsnCode', item.hsnCode);
    setLastMatch(item);
    manualHsnRef.current = false;
    return true;
  };

  const lookupHsn = async (name, cat, { autoApply = false, forceApply = false } = {}) => {
    const query = String(name || '').trim();
    if (!query) {
      message.warning(translate('product_name_required') || 'Enter a product name first.');
      return;
    }

    const categoryLabel = normalizeCategoryValue(cat);
    setLoading(true);

    try {
      const response = await request.get({
        entity: `product/suggestHsn?name=${encodeURIComponent(query)}&category=${encodeURIComponent(categoryLabel)}`,
      });

      if (!response?.success) {
        message.error(response?.message || 'HSN lookup failed.');
        return;
      }

      const { best, suggestions: list } = response.result || {};
      setSuggestions(list || []);

      if (best?.hsnCode) {
        setLastMatch(best);
      }

      const shouldApply =
        best?.hsnCode && (forceApply || (autoApply && !manualHsnRef.current));

      if (shouldApply && applySuggestion(best)) {
        message.success(`HSN ${best.hsnCode} applied.`);
      } else if (!best?.hsnCode) {
        message.info('No HSN match found for this product name.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const query = debouncedSearch.trim();
    if (query.length < 3) return undefined;

    let cancelled = false;
    lookupHsn(query, category, { autoApply: true }).finally(() => {
      if (cancelled) return;
    });

    return () => {
      cancelled = true;
      cancelDebounce();
    };
  }, [debouncedSearch, category]);

  const handleManualLookup = () => {
    manualHsnRef.current = false;
    lookupHsn(productName, category, { autoApply: true, forceApply: true });
  };

  return (
    <div style={{ marginBottom: 16 }}>
      <Alert
        type="info"
        showIcon
        message={translate('hsn_auto_lookup_title')}
        description={translate('hsn_auto_lookup_hint')}
        style={{ marginBottom: 12 }}
      />
      <Space direction="vertical" style={{ width: '100%' }} size="small">
        <Button icon={<SearchOutlined />} loading={loading} onClick={handleManualLookup}>
          {translate('lookup_hsn_from_name')}
        </Button>

        {lastMatch?.hsnCode ? (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {`${translate('hsn_suggested')}: ${lastMatch.hsnCode} — ${lastMatch.description}`}
            {lastMatch.taxRate != null && lastMatch.taxRate !== ''
              ? ` (${translate('reference_gst')}: ${lastMatch.taxRate}%)`
              : ''}
          </Typography.Text>
        ) : null}

        {suggestions.length > 1 ? (
          <Select
            allowClear
            showSearch
            placeholder={translate('choose_hsn_match')}
            loading={loading}
            style={{ width: '100%' }}
            options={suggestions.map((item) => ({
              value: item.hsnCode,
              label: item.taxRate != null && item.taxRate !== ''
                ? `${item.hsnCode} — ${item.description} (ref. GST ${item.taxRate}%)`
                : `${item.hsnCode} — ${item.description}`,
            }))}
            onChange={(value) => {
              const item = suggestions.find((row) => row.hsnCode === value);
              if (item) {
                manualHsnRef.current = true;
                applySuggestion(item);
              }
            }}
          />
        ) : null}
      </Space>
    </div>
  );
}

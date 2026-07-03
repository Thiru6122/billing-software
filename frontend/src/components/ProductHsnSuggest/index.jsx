import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Form, Select, Space, Typography } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { request } from '@/request';
import useLanguage from '@/locale/useLanguage';
import useDebounce from '@/hooks/useDebounce';

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
    if (!item?.hsnCode) return;
    form.setFieldValue('hsnCode', item.hsnCode);
    form.setFieldValue('taxRate', Number(item.taxRate) || 0);
    setLastMatch(item);
    manualHsnRef.current = false;
  };

  const lookupHsn = async (name, cat, { autoApply = false } = {}) => {
    const query = String(name || '').trim();
    if (!query) return;

    setLoading(true);
    try {
      const response = await request.get({
        entity: `product/suggestHsn?name=${encodeURIComponent(query)}&category=${encodeURIComponent(cat || '')}`,
      });

      if (!response?.success) return;

      const { best, suggestions: list } = response.result || {};
      setSuggestions(list || []);

      if (autoApply && best?.hsnCode && !manualHsnRef.current) {
        applySuggestion(best);
      } else if (best) {
        setLastMatch(best);
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

  const handleManualLookup = () => lookupHsn(productName, category, { autoApply: true });

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
            {`${translate('hsn_suggested')}: ${lastMatch.hsnCode} (${lastMatch.taxRate || 0}% GST) — ${lastMatch.description}`}
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
              label: `${item.hsnCode} — ${item.description} (${item.taxRate || 0}%)`,
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

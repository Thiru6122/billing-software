import { useEffect, useState } from 'react';
import { Form, Select } from 'antd';
import { request } from '@/request';
import useLanguage from '@/locale/useLanguage';

export default function ProductCategorySelect() {
  const translate = useLanguage();
  const form = Form.useFormInstance();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    request
      .listAll({ entity: 'productcategory' })
      .then((res) => {
        if (res?.success) setCategories(res.result || []);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (categoryName) => {
    const match = categories.find(
      (item) => String(item.name).toLowerCase() === String(categoryName).toLowerCase()
    );

    form.setFieldValue('category', categoryName || '');

    if (match) {
      form.setFieldValue('hsnCode', match.hsnCode || '');
      form.setFieldValue('taxRate', Number(match.taxRate) || 0);
    }
  };

  const options = categories.map((item) => ({
    value: item.name,
    label: `${item.name} (HSN ${item.hsnCode}, GST ${item.taxRate || 0}%)`,
  }));

  return (
    <Form.Item
      label={translate('category')}
      name="category"
      extra={translate('category_hsn_hint')}
    >
      <Select
        showSearch
        allowClear
        loading={loading}
        placeholder={translate('select_product_category')}
        options={options}
        onChange={handleChange}
        filterOption={(input, option) =>
          String(option?.label || '').toLowerCase().includes(input.toLowerCase())
        }
      />
    </Form.Item>
  );
}

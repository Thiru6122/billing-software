import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Form, Input, Button, message } from 'antd';
import { ShopOutlined, UserOutlined, MailOutlined, LockOutlined } from '@ant-design/icons';
import { API_BASE_URL } from '@/config/serverApiConfig';
import axios from 'axios';
import AuthModule from '@/modules/AuthModule';

export default function RegisterStore() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const { data } = await axios.post(API_BASE_URL + 'register-store', {
        storeName: values.storeName,
        storeSlug: values.storeSlug?.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        email: values.email,
        name: values.name,
        surname: values.surname || '',
        password: values.password,
      });
      if (data.success) {
        message.success(data.message || 'Store created! You can now sign in.');
        navigate('/login');
      } else {
        message.error(data.message || 'Registration failed');
      }
    } catch (err) {
      message.error(err.response?.data?.message || err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthModule AUTH_TITLE="Create your store" isForRegistre>
      <Form layout="vertical" onFinish={onFinish} initialValues={{ storeSlug: '' }}>
        <Form.Item
          label="Store name"
          name="storeName"
          rules={[{ required: true, message: 'Enter your store or company name' }]}
        >
          <Input prefix={<ShopOutlined />} placeholder="My Company" size="large" />
        </Form.Item>
        <Form.Item
          label="Store URL (letters, numbers, hyphens)"
          name="storeSlug"
          rules={[
            { required: true, message: 'Choose a short name for login (e.g. mycompany)' },
            { pattern: /^[a-z0-9-]+$/, message: 'Only lowercase letters, numbers, and hyphens' },
          ]}
        >
          <Input prefix={<ShopOutlined />} placeholder="mycompany" size="large" />
        </Form.Item>
        <Form.Item label="Your name" name="name" rules={[{ required: true }]}>
          <Input prefix={<UserOutlined />} placeholder="John" size="large" />
        </Form.Item>
        <Form.Item name="surname">
          <Input prefix={<UserOutlined />} placeholder="Doe" size="large" />
        </Form.Item>
        <Form.Item
          label="Email"
          name="email"
          rules={[{ required: true, type: 'email' }]}
        >
          <Input prefix={<MailOutlined />} placeholder="you@company.com" size="large" />
        </Form.Item>
        <Form.Item
          label="Password"
          name="password"
          rules={[{ required: true, min: 6, message: 'At least 6 characters' }]}
        >
          <Input.Password prefix={<LockOutlined />} placeholder="••••••••" size="large" />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} size="large" block>
            Create store
          </Button>
        </Form.Item>
        <div style={{ textAlign: 'center' }}>
          <Link to="/login">Already have a store? Sign in</Link>
        </div>
      </Form>
    </AuthModule>
  );
}

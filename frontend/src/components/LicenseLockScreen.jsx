import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { Button, Card, Input, Space, Typography, message } from 'antd';
import { LockOutlined, MailOutlined } from '@ant-design/icons';
import { API_BASE_URL } from '@/config/serverApiConfig';

const { Title, Paragraph, Text } = Typography;

export default function LicenseLockScreen({ onUnlocked }) {
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState('');
  const [lockInfo, setLockInfo] = useState(null);

  const refreshStatus = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API_BASE_URL}license/status`);
      if (data?.result) setLockInfo(data.result);
      if (!data?.result?.locked) onUnlocked?.();
    } catch {
      // ignore
    }
  }, [onUnlocked]);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  const requestOtp = async () => {
    setLoading(true);
    try {
      const { data } = await axios.post(`${API_BASE_URL}license/request-otp`);
      if (data.success) {
        message.success(data.message);
      } else {
        message.error(data.message || 'Could not send OTP');
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'Could not send OTP');
    } finally {
      setLoading(false);
    }
  };

  const unlockOtp = async () => {
    setLoading(true);
    try {
      const { data } = await axios.post(`${API_BASE_URL}license/unlock-otp`, { otp });
      if (data.success) {
        message.success(data.message);
        onUnlocked?.();
      } else {
        message.error(data.message || 'Invalid OTP');
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const lockDays = lockInfo?.lockDays?.join(' & ') || '1 & 2';

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f0f2f5',
        padding: 24,
      }}
    >
      <Card style={{ maxWidth: 480, width: '100%' }}>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div style={{ textAlign: 'center' }}>
            <LockOutlined style={{ fontSize: 48, color: '#cf1322' }} />
            <Title level={3} style={{ marginTop: 16, marginBottom: 8 }}>
              Subscription verification required
            </Title>
            <Paragraph type="secondary">
              Saltum billing is locked on day {lockDays} of each month until your monthly
              subscription is confirmed. Contact Saltum support if you have already paid.
            </Paragraph>
          </div>

          <div>
            <Text strong>
              <MailOutlined /> Unlock with OTP
            </Text>
            <Paragraph type="secondary" style={{ marginBottom: 8 }}>
              Request an OTP — it is sent to{' '}
              <Text code>{lockInfo?.licensorEmail || 'thiru6122@gmail.com'}</Text>. After payment
              is confirmed, Saltum will share the code with you.
            </Paragraph>
            <Button type="primary" block loading={loading} onClick={requestOtp}>
              Send OTP to vendor
            </Button>
            <Input
              placeholder="Enter 6-digit OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              maxLength={6}
              style={{ marginTop: 8 }}
              onPressEnter={unlockOtp}
            />
            <Button block style={{ marginTop: 8 }} loading={loading} onClick={unlockOtp}>
              Verify OTP & unlock
            </Button>
          </div>
        </Space>
      </Card>
    </div>
  );
}

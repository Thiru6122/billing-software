import { useLayoutEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { useDispatch, useSelector } from 'react-redux';

import { Layout } from 'antd';

import Navigation from '@/apps/Navigation/NavigationContainer';

import HeaderContent from '@/apps/Header/HeaderContainer';
import PageLoader from '@/components/PageLoader';
import LicenseLockScreen from '@/components/LicenseLockScreen';

import { settingsAction } from '@/redux/settings/actions';

import { selectSettings } from '@/redux/settings/selectors';

import AppRouter from '@/router/AppRouter';

import useResponsive from '@/hooks/useResponsive';

import { API_BASE_URL } from '@/config/serverApiConfig';

export default function ErpCrmApp() {
  const { Content } = Layout;

  const { isMobile } = useResponsive();
  const dispatch = useDispatch();
  const [licenseLocked, setLicenseLocked] = useState(null);

  const checkLicense = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API_BASE_URL}license/status`);
      setLicenseLocked(Boolean(data?.result?.locked));
    } catch {
      setLicenseLocked(false);
    }
  }, []);

  const handleUnlocked = useCallback(() => {
    setLicenseLocked(false);
    dispatch(settingsAction.list({ entity: 'setting' }));
  }, [dispatch]);

  useLayoutEffect(() => {
    dispatch(settingsAction.list({ entity: 'setting' }));
    checkLicense();
  }, [checkLicense, dispatch]);

  const { isSuccess: settingIsloaded } = useSelector(selectSettings);

  if (licenseLocked === null) return <PageLoader />;

  if (licenseLocked) {
    return <LicenseLockScreen onUnlocked={handleUnlocked} />;
  }

  if (!settingIsloaded) return <PageLoader />;

  return (
      <Layout hasSider>
        <Navigation />

        {isMobile ? (
          <Layout style={{ marginLeft: 0 }}>
            <HeaderContent />
            <Content
              style={{
                margin: '40px auto 30px',
                overflow: 'initial',
                width: '100%',
                padding: '0 25px',
                maxWidth: 'none',
              }}
            >
              <AppRouter />
            </Content>
          </Layout>
        ) : (
          <Layout>
            <HeaderContent />
            <Content
              style={{
                margin: '40px auto 30px',
                overflow: 'initial',
                width: '100%',
                padding: '0 50px',
                maxWidth: 1400,
              }}
            >
              <AppRouter />
            </Content>
          </Layout>
        )}
      </Layout>
    );
}

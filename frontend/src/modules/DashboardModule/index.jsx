import { useEffect } from 'react';

import { Row, Col, Statistic, Divider } from 'antd';
import useLanguage from '@/locale/useLanguage';

import { useMoney } from '@/settings';

import { request } from '@/request';
import useFetch from '@/hooks/useFetch';
import useOnFetch from '@/hooks/useOnFetch';

import RecentTable from './components/RecentTable';

import SummaryCard from './components/SummaryCard';
import CountSummaryCard from './components/CountSummaryCard';
import PreviewCard from './components/PreviewCard';
import CustomerPreviewCard from './components/CustomerPreviewCard';
import DailyStatsTable from './components/DailyStatsTable';
import DailyActivityChart from './components/DailyActivityChart';
import YearlyExpensesTable from './components/YearlyExpensesTable';
import TopProductsTable from './components/TopProductsTable';
import RecentExpensesTable from './components/RecentExpensesTable';

import { selectMoneyFormat } from '@/redux/settings/selectors';
import { useSelector } from 'react-redux';

export default function DashboardModule() {
  const translate = useLanguage();
  const { moneyFormatter } = useMoney();
  const money_format_settings = useSelector(selectMoneyFormat);

  const getStatsData = async ({ entity, currency }) => {
    return await request.summary({
      entity,
      options: { currency },
    });
  };

  const {
    result: invoiceResult,
    isLoading: invoiceLoading,
    onFetch: fetchInvoicesStats,
  } = useOnFetch();

  const { result: quoteResult, isLoading: quoteLoading, onFetch: fetchQuotesStats } = useOnFetch();

  const {
    result: paymentResult,
    isLoading: paymentLoading,
    onFetch: fetchPayemntsStats,
  } = useOnFetch();

  const {
    result: purchaseResult,
    isLoading: purchaseLoading,
    onFetch: fetchPurchasesStats,
  } = useOnFetch();

  const { result: clientResult, isLoading: clientLoading } = useFetch(() =>
    request.summary({ entity: 'client' })
  );

  const { result: productResult, isLoading: productLoading } = useFetch(() =>
    request.summary({ entity: 'product' })
  );

  const {
    result: expenseResult,
    isLoading: expenseLoading,
    onFetch: fetchExpensesStats,
  } = useOnFetch();

  const {
    result: analyticsResult,
    isLoading: analyticsLoading,
    onFetch: fetchAnalytics,
  } = useOnFetch();

  useEffect(() => {
    const currency = money_format_settings.default_currency_code || null;

    if (currency) {
      fetchInvoicesStats(getStatsData({ entity: 'invoice', currency }));
      fetchQuotesStats(getStatsData({ entity: 'quote', currency }));
      fetchPayemntsStats(getStatsData({ entity: 'payment', currency }));
      fetchPurchasesStats(getStatsData({ entity: 'purchase', currency }));
      fetchExpensesStats(getStatsData({ entity: 'expense', currency }));
      fetchAnalytics(request.get({ entity: 'dashboard/analytics?days=30' }));
    }
  }, [money_format_settings.default_currency_code]);

  const dataTableColumns = [
    {
      title: translate('number'),
      dataIndex: 'number',
    },
    {
      title: translate('Client'),
      dataIndex: ['client', 'name'],
    },
    {
      title: translate('Total'),
      dataIndex: 'total',
      onCell: () => ({
        style: { textAlign: 'right', whiteSpace: 'nowrap', direction: 'ltr' },
      }),
      render: (total, record) => moneyFormatter({ amount: total, currency_code: record.currency }),
    },
    {
      title: translate('Status'),
      dataIndex: 'status',
    },
  ];

  const purchaseTableColumns = [
    { title: translate('number'), dataIndex: 'number' },
    {
      title: translate('supplier'),
      dataIndex: 'supplierName',
      render: (_, record) => record.supplierName || record.supplier?.name || '—',
    },
    {
      title: translate('Total'),
      dataIndex: 'total',
      onCell: () => ({
        style: { textAlign: 'right', whiteSpace: 'nowrap', direction: 'ltr' },
      }),
      render: (total, record) => moneyFormatter({ amount: total, currency_code: record.currency }),
    },
    { title: translate('Status'), dataIndex: 'status' },
  ];

  const entityData = [
    {
      result: invoiceResult,
      isLoading: invoiceLoading,
      entity: 'invoice',
      title: translate('Invoices'),
    },
    {
      result: quoteResult,
      isLoading: quoteLoading,
      entity: 'quote',
      title: translate('quote'),
    },
    {
      result: expenseResult,
      isLoading: expenseLoading,
      entity: 'expense',
      title: translate('expenses'),
    },
  ];

  const statisticCards = entityData.map((data, index) => {
    const { result, entity, isLoading, title } = data;

    return (
      <PreviewCard
        key={index}
        title={title}
        isLoading={isLoading}
        entity={entity}
        colSpan={8}
        statistics={
          !isLoading &&
          result?.performance?.map((item) => ({
            tag: item?.status,
            color: 'blue',
            value: item?.percentage,
          }))
        }
      />
    );
  });

  const analytics = analyticsResult?.result;

  if (money_format_settings) {
    return (
      <>
        <Row gutter={[32, 32]}>
          <SummaryCard
            title={translate('Invoices')}
            prefix={translate('This month')}
            isLoading={invoiceLoading}
            data={invoiceResult?.total}
          />
          <SummaryCard
            title={translate('Quote')}
            prefix={translate('This month')}
            isLoading={quoteLoading}
            data={quoteResult?.total}
          />
          <SummaryCard
            title={translate('expenses')}
            prefix={translate('This month')}
            isLoading={expenseLoading}
            data={expenseResult?.total}
            tagColor="volcano"
          />
          <SummaryCard
            title={translate('paid')}
            prefix={translate('This month')}
            isLoading={paymentLoading}
            data={paymentResult?.total}
          />
          <SummaryCard
            title={translate('Unpaid')}
            prefix={translate('Not Paid')}
            isLoading={invoiceLoading}
            data={invoiceResult?.total_undue}
          />
          <SummaryCard
            title={translate('low_stock_items')}
            prefix={translate('inventory')}
            isLoading={productLoading}
            data={productResult?.lowStock}
          />
        </Row>
        <div className="space30"></div>
        <Row gutter={[32, 32]}>
          <CountSummaryCard
            title={translate('Invoices')}
            prefix={translate('today')}
            isLoading={analyticsLoading}
            data={analytics?.today?.invoices}
            tagColor="geekblue"
          />
          <CountSummaryCard
            title={translate('Customer')}
            prefix={translate('today')}
            isLoading={analyticsLoading}
            data={analytics?.today?.customers}
            tagColor="cyan"
          />
          <CountSummaryCard
            title={translate('supplier')}
            prefix={translate('today')}
            isLoading={analyticsLoading}
            data={analytics?.today?.suppliers}
            tagColor="purple"
          />
          <CountSummaryCard
            title={translate('expenses')}
            prefix={translate('today')}
            isLoading={analyticsLoading}
            data={analytics?.today?.expenses}
            tagColor="red"
          />
          <SummaryCard
            title={translate('yearly_expenses')}
            prefix={translate('This year')}
            isLoading={analyticsLoading}
            data={analytics?.thisYear?.expenseTotal}
            tagColor="volcano"
          />
        </Row>
        <div className="space30"></div>
        <Row gutter={[32, 32]}>
          <CountSummaryCard
            title={translate('Invoices')}
            prefix={translate('This month')}
            isLoading={analyticsLoading}
            data={analytics?.thisMonth?.invoices}
            tagColor="blue"
          />
          <CountSummaryCard
            title={translate('Customer')}
            prefix={translate('This month')}
            isLoading={analyticsLoading}
            data={analytics?.thisMonth?.customers}
            tagColor="green"
          />
          <CountSummaryCard
            title={translate('supplier')}
            prefix={translate('This month')}
            isLoading={analyticsLoading}
            data={analytics?.thisMonth?.suppliers}
            tagColor="gold"
          />
          <CountSummaryCard
            title={translate('total_customers')}
            prefix={translate('all_time')}
            isLoading={analyticsLoading}
            data={analytics?.totals?.customers}
            tagColor="lime"
          />
        </Row>
        <div className="space30"></div>
        <Row gutter={[32, 32]}>
          <Col className="gutter-row w-full" sm={{ span: 24 }} lg={{ span: 14 }}>
            <div className="whiteBox shadow pad20" style={{ height: '100%' }}>
              <h3 style={{ color: '#22075e', marginBottom: 16 }}>
                {translate('activity_chart')} ({translate('last_14_days')})
              </h3>
              <DailyActivityChart data={analytics?.dailyStats || []} isLoading={analyticsLoading} />
            </div>
          </Col>
          <Col className="gutter-row w-full" sm={{ span: 24 }} lg={{ span: 10 }}>
            <div className="whiteBox shadow pad20" style={{ height: '100%' }}>
              <h3 style={{ color: '#22075e', marginBottom: 16 }}>{translate('yearly_expenses')}</h3>
              <YearlyExpensesTable
                data={analytics?.yearlyExpenses || []}
                isLoading={analyticsLoading}
              />
            </div>
          </Col>
        </Row>
        <div className="space30"></div>
        <Row gutter={[32, 32]}>
          <Col className="gutter-row w-full" sm={{ span: 24 }} lg={{ span: 14 }}>
            <div className="whiteBox shadow pad20" style={{ height: '100%' }}>
              <h3 style={{ color: '#22075e', marginBottom: 16 }}>
                {translate('daily_activity')} ({translate('last_30_days')})
              </h3>
              <DailyStatsTable data={analytics?.dailyStats || []} isLoading={analyticsLoading} />
            </div>
          </Col>
          <Col className="gutter-row w-full" sm={{ span: 24 }} lg={{ span: 10 }}>
            <div className="whiteBox shadow pad20" style={{ height: '100%' }}>
              <h3 style={{ color: '#22075e', marginBottom: 16 }}>{translate('recent_expenses')}</h3>
              <RecentExpensesTable />
            </div>
          </Col>
        </Row>
        <div className="space30"></div>
        <Row gutter={[32, 32]}>
          <Col className="gutter-row w-full" sm={{ span: 24 }} lg={{ span: 18 }}>
            <div className="whiteBox shadow pad20" style={{ height: '100%' }}>
              <h3 style={{ color: '#22075e', marginBottom: 16 }}>{translate('top_sold_products')}</h3>
              <TopProductsTable data={analytics?.topProducts || []} isLoading={analyticsLoading} />
            </div>
          </Col>
          <Col className="gutter-row w-full" sm={{ span: 24 }} lg={{ span: 6 }}>
            <CustomerPreviewCard
              isLoading={clientLoading}
              activeCustomer={clientResult?.active}
              newCustomer={clientResult?.new}
            />
          </Col>
        </Row>
        <div className="space30"></div>
        <Row gutter={[32, 32]}>
          <Col className="gutter-row w-full" sm={{ span: 24 }} md={{ span: 24 }} lg={{ span: 18 }}>
            <div className="whiteBox shadow" style={{ height: 458 }}>
              <Row className="pad20" gutter={[0, 0]}>
                {statisticCards}
              </Row>
            </div>
          </Col>
          <Col className="gutter-row w-full" sm={{ span: 24 }} md={{ span: 24 }} lg={{ span: 6 }}>
            <div className="whiteBox shadow pad20" style={{ minHeight: 458 }}>
              <h3 style={{ color: '#22075e', marginBottom: 16 }}>{translate('overview')}</h3>
              <Statistic
                title={translate('Invoices')}
                value={analytics?.totals?.invoices ?? 0}
                loading={analyticsLoading}
              />
              <Divider style={{ margin: '12px 0' }} />
              <Statistic
                title={translate('total_customers')}
                value={analytics?.totals?.customers ?? 0}
                loading={analyticsLoading}
              />
              <Divider style={{ margin: '12px 0' }} />
              <Statistic
                title={translate('supplier')}
                value={analytics?.totals?.suppliers ?? 0}
                loading={analyticsLoading}
              />
              <Divider style={{ margin: '12px 0' }} />
              <Statistic
                title={translate('expense_total')}
                value={moneyFormatter({
                  amount: analytics?.totals?.expenseTotal ?? 0,
                  currency_code: money_format_settings?.default_currency_code,
                })}
                loading={analyticsLoading}
              />
            </div>
          </Col>
        </Row>
        <div className="space30"></div>
        <Row gutter={[32, 32]}>
          <Col className="gutter-row w-full" sm={{ span: 24 }} lg={{ span: 8 }}>
            <div className="whiteBox shadow pad20" style={{ height: '100%' }}>
              <h3 style={{ color: '#22075e', marginBottom: 5, padding: '0 20px 20px' }}>
                {translate('Recent Invoices')}
              </h3>
              <RecentTable entity={'invoice'} dataTableColumns={dataTableColumns} />
            </div>
          </Col>
          <Col className="gutter-row w-full" sm={{ span: 24 }} lg={{ span: 8 }}>
            <div className="whiteBox shadow pad20" style={{ height: '100%' }}>
              <h3 style={{ color: '#22075e', marginBottom: 5, padding: '0 20px 20px' }}>
                {translate('Recent Quotes')}
              </h3>
              <RecentTable entity={'quote'} dataTableColumns={dataTableColumns} />
            </div>
          </Col>
          <Col className="gutter-row w-full" sm={{ span: 24 }} lg={{ span: 8 }}>
            <div className="whiteBox shadow pad20" style={{ height: '100%' }}>
              <h3 style={{ color: '#22075e', marginBottom: 5, padding: '0 20px 20px' }}>
                {translate('recent_purchases')}
              </h3>
              <RecentTable entity={'purchase'} dataTableColumns={purchaseTableColumns} />
            </div>
          </Col>
        </Row>
      </>
    );
  }

  return <></>;
}

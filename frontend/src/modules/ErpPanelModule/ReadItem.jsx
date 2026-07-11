import { useState, useEffect } from 'react';
import { Divider } from 'antd';

import { Button, Row, Col, Descriptions, Statistic, Tag, Dropdown } from 'antd';
import { PageHeader } from '@ant-design/pro-layout';
import {
  EditOutlined,
  FilePdfOutlined,
  CloseCircleOutlined,
  RetweetOutlined,
  MailOutlined,
  PrinterOutlined,
} from '@ant-design/icons';

import { useSelector, useDispatch } from 'react-redux';
import useLanguage from '@/locale/useLanguage';
import { erp } from '@/redux/erp/actions';

import { generate as uniqueId } from 'shortid';

import { selectCurrentItem } from '@/redux/erp/selectors';

import { DOWNLOAD_BASE_URL } from '@/config/serverApiConfig';
import { openDocumentPrint } from '@/utils/printDocument';
import { useMoney, useDate } from '@/settings';
import useMail from '@/hooks/useMail';
import { useNavigate } from 'react-router-dom';
import { splitGstInclusive, computeGstExclusiveLine } from '@/constants/indianStates';

const Item = ({ item, currentErp, isPurchase = false, isQuote = false }) => {
  const { moneyFormatter } = useMoney();
  const lineInclusive = Number(item.total) || 0;
  const gstRate = Number(item.gstRate) || 0;
  const { taxable: lineTaxable, gst: lineGst } = splitGstInclusive(lineInclusive, gstRate);

  if (isPurchase) {
    const gstRate = Number(item.gstRate) || 0;
    const { gstAmount: lineGst, total: lineTotal } = computeGstExclusiveLine(
      item.quantity,
      item.price,
      gstRate
    );
    const gstPerUnit = Math.round(((Number(item.price) || 0) * gstRate) / 100 * 100) / 100;
    const totalPerUnit = Math.round(((Number(item.price) || 0) + gstPerUnit) * 100) / 100;

    return (
      <Row gutter={[12, 0]} key={item._id}>
        <Col className="gutter-row" span={6}>
          <p style={{ marginBottom: 5 }}>
            <strong>{item.itemName}</strong>
          </p>
          {gstRate > 0 && (
            <p style={{ color: '#666', fontSize: 12 }}>
              GST {gstRate}% · {item.unit || 'kg'}:{' '}
              {moneyFormatter({ amount: totalPerUnit, currency_code: currentErp.currency })} incl. GST
            </p>
          )}
        </Col>
        <Col className="gutter-row" span={2}>
          <p>{item.unit || '—'}</p>
        </Col>
        <Col className="gutter-row" span={3}>
          <p style={{ textAlign: 'right' }}>{item.quantity}</p>
        </Col>
        <Col className="gutter-row" span={3}>
          <p style={{ textAlign: 'right' }}>
            {moneyFormatter({ amount: item.price, currency_code: currentErp.currency })}
          </p>
        </Col>
        <Col className="gutter-row" span={2}>
          <p style={{ textAlign: 'right' }}>{gstRate}%</p>
        </Col>
        <Col className="gutter-row" span={3}>
          <p style={{ textAlign: 'right' }}>
            {moneyFormatter({ amount: lineGst, currency_code: currentErp.currency })}
          </p>
        </Col>
        <Col className="gutter-row" span={4}>
          <p style={{ textAlign: 'right', fontWeight: '700' }}>
            {moneyFormatter({ amount: lineTotal, currency_code: currentErp.currency })}
          </p>
        </Col>
        <Divider dashed style={{ marginTop: 0, marginBottom: 15 }} />
      </Row>
    );
  }

  if (isQuote) {
    return (
      <Row gutter={[12, 0]} key={item._id}>
        <Col className="gutter-row" span={7}>
          <p style={{ marginBottom: 5 }}>
            <strong>{item.itemName}</strong>
          </p>
          <p>{item.description && !/^\s*SKU\s*:/i.test(item.description) ? item.description : ''}</p>
          {item.hsnCode && <p style={{ color: '#666' }}>HSN: {item.hsnCode}</p>}
        </Col>
        <Col className="gutter-row" span={3}>
          <p style={{ textAlign: 'right' }}>
            {moneyFormatter({ amount: item.price, currency_code: currentErp.currency })}
          </p>
        </Col>
        <Col className="gutter-row" span={3}>
          <p style={{ textAlign: 'right' }}>{item.quantity}</p>
        </Col>
        <Col className="gutter-row" span={4}>
          <p style={{ textAlign: 'right', fontWeight: '700' }}>
            {moneyFormatter({ amount: lineInclusive, currency_code: currentErp.currency })}
          </p>
        </Col>
        <Divider dashed style={{ marginTop: 0, marginBottom: 15 }} />
      </Row>
    );
  }

  return (
    <Row gutter={[12, 0]} key={item._id}>
      <Col className="gutter-row" span={7}>
        <p style={{ marginBottom: 5 }}>
          <strong>{item.itemName}</strong>
        </p>
        <p>{item.description && !/^\s*SKU\s*:/i.test(item.description) ? item.description : ''}</p>
        {item.hsnCode && <p style={{ color: '#666' }}>HSN: {item.hsnCode}</p>}
        {gstRate > 0 && <p style={{ color: '#666' }}>GST: {gstRate}%</p>}
      </Col>
      <Col className="gutter-row" span={3}>
        <p style={{ textAlign: 'right' }}>
          {moneyFormatter({ amount: lineTaxable, currency_code: currentErp.currency })}
        </p>
      </Col>
      <Col className="gutter-row" span={3}>
        <p style={{ textAlign: 'right' }}>
          {moneyFormatter({ amount: lineGst, currency_code: currentErp.currency })}
        </p>
      </Col>
      <Col className="gutter-row" span={3}>
        <p style={{ textAlign: 'right' }}>{item.quantity}</p>
      </Col>
      <Col className="gutter-row" span={4}>
        <p style={{ textAlign: 'right', fontWeight: '700' }}>
          {moneyFormatter({ amount: lineInclusive, currency_code: currentErp.currency })}
        </p>
      </Col>
      <Divider dashed style={{ marginTop: 0, marginBottom: 15 }} />
    </Row>
  );
};

export default function ReadItem({ config, selectedItem }) {
  const translate = useLanguage();
  const { entity, ENTITY_NAME } = config;
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { moneyFormatter } = useMoney();
  const { send, isLoading: mailInProgress } = useMail({ entity });

  const { result: currentResult } = useSelector(selectCurrentItem);

  const resetErp = {
    status: '',
    client: {
      name: '',
      email: '',
      phone: '',
      address: '',
    },
    subTotal: 0,
    taxTotal: 0,
    taxRate: 0,
    total: 0,
    credit: 0,
    number: 0,
    year: 0,
  };

  const [itemslist, setItemsList] = useState([]);
  const [currentErp, setCurrentErp] = useState(selectedItem ?? resetErp);
  const [client, setClient] = useState({});

  useEffect(() => {
    if (currentResult) {
      const { items, invoice, ...others } = currentResult;

      if (items) {
        setItemsList(items);
        setCurrentErp(currentResult);
      } else if (invoice.items) {
        setItemsList(invoice.items);
        setCurrentErp({ ...invoice.items, ...others, ...invoice });
      }
    }
    return () => {
      setItemsList([]);
      setCurrentErp(resetErp);
    };
  }, [currentResult]);

  useEffect(() => {
    if (currentErp?.client) {
      setClient(currentErp.client);
    }
  }, [currentErp]);

  const canPrintOrDownload = ['invoice', 'purchase', 'quote'].includes(entity);

  return (
    <>
      <PageHeader
        onBack={() => {
          navigate(`/${entity.toLowerCase()}`);
        }}
        title={`${ENTITY_NAME} # ${currentErp.number}/${currentErp.year || ''}`}
        ghost={false}
        tags={[
          <span key="status">{currentErp.status && translate(currentErp.status)}</span>,
          currentErp.paymentStatus && (
            <span key="paymentStatus">
              {currentErp.paymentStatus && translate(currentErp.paymentStatus)}
            </span>
          ),
        ]}
        extra={[
          <Button
            key={`${uniqueId()}`}
            className="no-print"
            onClick={() => {
              navigate(`/${entity.toLowerCase()}`);
            }}
            icon={<CloseCircleOutlined />}
          >
            {translate('Close')}
          </Button>,
          canPrintOrDownload && (
            <Dropdown
              key={`${uniqueId()}`}
              menu={{
                items:
                  entity === 'quote'
                    ? [
                        {
                          key: 'a6',
                          label: translate('print_a6'),
                          onClick: () => openDocumentPrint(entity, currentErp._id, 'A6'),
                        },
                        {
                          key: 'a4',
                          label: translate('print_a4'),
                          onClick: () => openDocumentPrint(entity, currentErp._id, 'A4'),
                        },
                      ]
                    : [
                        {
                          key: 'a4',
                          label: translate('print_a4'),
                          onClick: () => openDocumentPrint(entity, currentErp._id, 'A4'),
                        },
                        {
                          key: 'a5',
                          label: translate('print_a5'),
                          onClick: () => openDocumentPrint(entity, currentErp._id, 'A5'),
                        },
                      ],
              }}
            >
              <Button className="no-print" icon={<PrinterOutlined />}>
                {translate('Print')}
              </Button>
            </Dropdown>
          ),
          canPrintOrDownload && (
            <Button
              key={`${uniqueId()}`}
              className="no-print"
              onClick={() => {
                window.open(
                  `${DOWNLOAD_BASE_URL}${entity}/${entity}-${currentErp._id}.pdf`,
                  '_blank'
                );
              }}
              icon={<FilePdfOutlined />}
            >
              {translate('Download PDF')}
            </Button>
          ),
          entity !== 'purchase' && (
            <Button
              key={`${uniqueId()}`}
              className="no-print"
              loading={mailInProgress}
              onClick={() => {
                send(currentErp._id);
              }}
              icon={<MailOutlined />}
            >
              {translate('Send by Email')}
            </Button>
          ),
          <Button
            key={`${uniqueId()}`}
            className="no-print"
            onClick={() => {
              dispatch(erp.convert({ entity, id: currentErp._id }));
            }}
            icon={<RetweetOutlined />}
            style={{ display: entity === 'quote' ? 'inline-block' : 'none' }}
          >
            {translate('Convert to Invoice')}
          </Button>,

          <Button
            key={`${uniqueId()}`}
            className="no-print"
            onClick={() => {
              dispatch(
                erp.currentAction({
                  actionType: 'update',
                  data: currentErp,
                })
              );
              navigate(`/${entity.toLowerCase()}/update/${currentErp._id}`);
            }}
            type="primary"
            icon={<EditOutlined />}
          >
            {translate('Edit')}
          </Button>,
        ].filter(Boolean)}
        style={{
          padding: '20px 0px',
        }}
      >
        <Row>
          <Statistic title="Status" value={currentErp.status} />
          <Statistic
            title={translate('SubTotal')}
            value={moneyFormatter({
              amount: currentErp.subTotal,
              currency_code: currentErp.currency,
            })}
            style={{
              margin: '0 32px',
            }}
          />
          <Statistic
            title={translate('Total')}
            value={moneyFormatter({ amount: currentErp.total, currency_code: currentErp.currency })}
            style={{
              margin: '0 32px',
            }}
          />
          <Statistic
            title={translate('Paid')}
            value={moneyFormatter({
              amount: currentErp.credit,
              currency_code: currentErp.currency,
            })}
            style={{
              margin: '0 32px',
              display: entity === 'purchase' || entity === 'quote' ? 'none' : undefined,
            }}
          />
        </Row>
      </PageHeader>
      <div id="invoice-print-area">
      <Divider dashed className="no-print" />
      <Descriptions
        title={
          entity === 'purchase'
            ? `${translate('supplier')} : ${currentErp.supplierName || currentErp.supplier?.name || translate('supplier_name_optional')}`
            : `${translate('Client')} : ${currentErp.customerName || currentErp.client?.name || translate('walk_in_customer')}`
        }
      >
        {(entity === 'invoice' || entity === 'quote') && currentErp.placeOfSupply && (
          <Descriptions.Item label="Place of supply">{currentErp.placeOfSupply}</Descriptions.Item>
        )}
        {entity === 'purchase' && currentErp.supplier ? (
          <>
            <Descriptions.Item label={translate('Address')}>{currentErp.supplier.address}</Descriptions.Item>
            <Descriptions.Item label={translate('email')}>{currentErp.supplier.email}</Descriptions.Item>
            <Descriptions.Item label={translate('Phone')}>{currentErp.supplier.phone}</Descriptions.Item>
          </>
        ) : currentErp.client ? (
          <>
            <Descriptions.Item label={translate('Address')}>{client.address}</Descriptions.Item>
            <Descriptions.Item label={translate('email')}>{client.email}</Descriptions.Item>
            <Descriptions.Item label={translate('Phone')}>{client.phone}</Descriptions.Item>
          </>
        ) : currentErp.customerName ? null : (
          <Descriptions.Item label={translate('note')}>{translate('walk_in_customer')}</Descriptions.Item>
        )}
      </Descriptions>
      <Divider />
      <Row gutter={[12, 0]}>
        {entity === 'purchase' ? (
          <>
            <Col className="gutter-row" span={6}>
              <p><strong>{translate('raw_material')}</strong></p>
            </Col>
            <Col className="gutter-row" span={2}>
              <p><strong>{translate('unit')}</strong></p>
            </Col>
            <Col className="gutter-row" span={3}>
              <p style={{ textAlign: 'right' }}><strong>{translate('Quantity')}</strong></p>
            </Col>
            <Col className="gutter-row" span={3}>
              <p style={{ textAlign: 'right' }}><strong>{translate('rate_excl_gst')}</strong></p>
            </Col>
            <Col className="gutter-row" span={2}>
              <p style={{ textAlign: 'right' }}><strong>{translate('gst_percent')}</strong></p>
            </Col>
            <Col className="gutter-row" span={3}>
              <p style={{ textAlign: 'right' }}><strong>{translate('gst_total')}</strong></p>
            </Col>
            <Col className="gutter-row" span={4}>
              <p style={{ textAlign: 'right' }}><strong>{translate('line_total')}</strong></p>
            </Col>
          </>
        ) : entity === 'quote' ? (
          <>
            <Col className="gutter-row" span={7}>
              <p><strong>{translate('Product')}</strong></p>
            </Col>
            <Col className="gutter-row" span={3}>
              <p style={{ textAlign: 'right' }}><strong>{translate('Price')}</strong></p>
            </Col>
            <Col className="gutter-row" span={3}>
              <p style={{ textAlign: 'right' }}><strong>{translate('Quantity')}</strong></p>
            </Col>
            <Col className="gutter-row" span={4}>
              <p style={{ textAlign: 'right' }}><strong>{translate('Total')}</strong></p>
            </Col>
          </>
        ) : (
          <>
            <Col className="gutter-row" span={7}>
              <p>
                <strong>{translate('Product')}</strong>
              </p>
            </Col>
            <Col className="gutter-row" span={3}>
              <p style={{ textAlign: 'right' }}>
                <strong>Price (excl.)</strong>
              </p>
            </Col>
            <Col className="gutter-row" span={3}>
              <p style={{ textAlign: 'right' }}>
                <strong>GST</strong>
              </p>
            </Col>
            <Col className="gutter-row" span={3}>
              <p style={{ textAlign: 'right' }}>
                <strong>{translate('Quantity')}</strong>
              </p>
            </Col>
            <Col className="gutter-row" span={4}>
              <p style={{ textAlign: 'right' }}>
                <strong>{translate('Total')}</strong>
              </p>
            </Col>
          </>
        )}
        <Divider />
      </Row>
      {itemslist.map((item) => (
        <Item
          key={item._id}
          item={item}
          currentErp={currentErp}
          isPurchase={entity === 'purchase'}
          isQuote={entity === 'quote'}
        />
      ))}
      <div
        style={{
          width: '300px',
          float: 'right',
          textAlign: 'right',
          fontWeight: '700',
        }}
      >
        <Row gutter={[12, -5]}>
          {entity === 'purchase' ? (
            <>
              <Col className="gutter-row" span={12}>
                <p>{translate('value_excl_gst')} :</p>
              </Col>
              <Col className="gutter-row" span={12}>
                <p>
                  {moneyFormatter({ amount: currentErp.subTotal, currency_code: currentErp.currency })}
                </p>
              </Col>
              <Col className="gutter-row" span={12}>
                <p>{translate('gst_total')} :</p>
              </Col>
              <Col className="gutter-row" span={12}>
                <p>
                  {moneyFormatter({ amount: currentErp.taxTotal, currency_code: currentErp.currency })}
                </p>
              </Col>
              <Col className="gutter-row" span={12}>
                <p>{translate('Total')} :</p>
              </Col>
              <Col className="gutter-row" span={12}>
                <p>
                  {moneyFormatter({ amount: currentErp.total, currency_code: currentErp.currency })}
                </p>
              </Col>
            </>
          ) : entity === 'quote' ? (
            <>
              <Col className="gutter-row" span={12}>
                <p>{translate('Sub Total')} :</p>
              </Col>
              <Col className="gutter-row" span={12}>
                <p>
                  {moneyFormatter({ amount: currentErp.subTotal, currency_code: currentErp.currency })}
                </p>
              </Col>
              <Col className="gutter-row" span={12}>
                <p>{translate('Total')} :</p>
              </Col>
              <Col className="gutter-row" span={12}>
                <p>
                  {moneyFormatter({ amount: currentErp.total, currency_code: currentErp.currency })}
                </p>
              </Col>
            </>
          ) : (
            <>
          <Col className="gutter-row" span={12}>
            <p>Product value (excl. GST) :</p>
          </Col>

          <Col className="gutter-row" span={12}>
            <p>
              {moneyFormatter({ amount: currentErp.subTotal, currency_code: currentErp.currency })}
            </p>
          </Col>
          {currentErp.gstType === 'inter' && currentErp.taxTotal > 0 && (
            <Col className="gutter-row" span={12}>
              <p>IGST :</p>
            </Col>
          )}
          {currentErp.gstType === 'inter' && currentErp.taxTotal > 0 && (
            <Col className="gutter-row" span={12}>
              <p>
                {moneyFormatter({
                  amount: currentErp.igstTotal ?? currentErp.taxTotal,
                  currency_code: currentErp.currency,
                })}
              </p>
            </Col>
          )}
          {currentErp.gstType !== 'inter' && currentErp.taxTotal > 0 && (
            <>
              <Col className="gutter-row" span={12}>
                <p>CGST :</p>
              </Col>
              <Col className="gutter-row" span={12}>
                <p>
                  {moneyFormatter({
                    amount: currentErp.cgstTotal ?? currentErp.taxTotal / 2,
                    currency_code: currentErp.currency,
                  })}
                </p>
              </Col>
              <Col className="gutter-row" span={12}>
                <p>SGST :</p>
              </Col>
              <Col className="gutter-row" span={12}>
                <p>
                  {moneyFormatter({
                    amount: currentErp.sgstTotal ?? currentErp.taxTotal / 2,
                    currency_code: currentErp.currency,
                  })}
                </p>
              </Col>
            </>
          )}
          {currentErp.placeOfSupply && (
            <>
              <Col className="gutter-row" span={12}>
                <p>Place of supply :</p>
              </Col>
              <Col className="gutter-row" span={12}>
                <p>{currentErp.placeOfSupply}</p>
              </Col>
            </>
          )}
          <Col className="gutter-row" span={12}>
            <p>{translate('Total')} :</p>
          </Col>
          <Col className="gutter-row" span={12}>
            <p>
              {moneyFormatter({ amount: currentErp.total, currency_code: currentErp.currency })}
            </p>
          </Col>
            </>
          )}
        </Row>
      </div>
      </div>
    </>
  );
}

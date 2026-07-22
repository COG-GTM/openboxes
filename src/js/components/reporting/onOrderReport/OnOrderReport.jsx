import React, { useState } from 'react';

import { useDispatch } from 'react-redux';

import { hideSpinner, showSpinner } from 'actions';
import { REPORT_ON_ORDER_DETAILS, REPORT_ON_ORDER_SUMMARY } from 'api/urls';
import notification from 'components/Layout/notifications/notification';
import Section from 'components/Layout/v2/Section';
import { REPORT_URL } from 'consts/applicationUrls';
import NotificationType from 'consts/notificationTypes';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import apiClient from 'utils/apiClient';
import Translate from 'utils/Translate';
import HeaderWrapper from 'wrappers/HeaderWrapper';
import PageWrapper from 'wrappers/PageWrapper';

const REPORT_TYPE = {
  SUMMARY: 'summary',
  DETAILS: 'details',
};

const OnOrderReport = () => {
  useTranslation('onOrderReport', 'default');

  const dispatch = useDispatch();
  const translate = useTranslate();

  const [reportType, setReportType] = useState(REPORT_TYPE.SUMMARY);
  const [rows, setRows] = useState(null);

  const runReport = async (type) => {
    dispatch(showSpinner());
    try {
      const url = type === REPORT_TYPE.SUMMARY
        ? REPORT_ON_ORDER_SUMMARY
        : REPORT_ON_ORDER_DETAILS;
      const response = await apiClient.get(url);
      setReportType(type);
      setRows(response?.data?.data ?? []);
    } catch (error) {
      notification(NotificationType.ERROR)({
        message: translate('react.onOrderReport.fetchError.label', 'Unable to load on order report'),
      });
    } finally {
      dispatch(hideSpinner());
    }
  };

  const download = (downloadAction) => {
    window.location.href = `${REPORT_URL.showOnOrderReport()}?downloadAction=${downloadAction}`;
  };

  const isSummary = reportType === REPORT_TYPE.SUMMARY;

  return (
    <PageWrapper>
      <HeaderWrapper className="align-items-center h-auto py-3">
        <span className="title">
          <Translate id="react.onOrderReport.title.label" defaultMessage="On Order Report" />
        </span>
      </HeaderWrapper>
      <div className="p-3">
        <Section
          title={{ label: 'react.onOrderReport.parameters.label', defaultMessage: 'Parameters' }}
        >
          <div className="d-flex flex-wrap" style={{ gap: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-outline-primary"
              data-testid="run-summary-button"
              onClick={() => runReport(REPORT_TYPE.SUMMARY)}
            >
              <Translate id="react.onOrderReport.runSummary.label" defaultMessage="Run On Order Report Summary" />
            </button>
            <button
              type="button"
              className="btn btn-outline-primary"
              data-testid="run-details-button"
              onClick={() => runReport(REPORT_TYPE.DETAILS)}
            >
              <Translate id="react.onOrderReport.runDetails.label" defaultMessage="Run On Order Report Details" />
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => download('downloadSummaryOnOrderReport')}
            >
              <Translate id="react.onOrderReport.downloadSummary.label" defaultMessage="Download On Order Report Summary" />
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => download('downloadOnOrderReport')}
            >
              <Translate id="react.onOrderReport.downloadDetails.label" defaultMessage="Download On Order Report Details" />
            </button>
          </div>
        </Section>
        <Section
          title={isSummary
            ? { label: 'react.onOrderReport.summary.label', defaultMessage: 'On Order Report Summary' }
            : { label: 'react.onOrderReport.details.label', defaultMessage: 'On Order Report Details' }}
        >
          {rows === null ? (
            <div className="text-muted">
              <Translate id="react.onOrderReport.runPrompt.label" defaultMessage="Run the report to see results" />
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm" data-testid="on-order-report-table">
                <thead>
                  <tr>
                    <th>{translate('react.onOrderReport.productCode.label', 'Code')}</th>
                    <th>{translate('react.onOrderReport.product.label', 'Product')}</th>
                    <th>{translate('react.onOrderReport.qtyOrderedNotShipped.label', 'Qty Ordered Not Shipped')}</th>
                    <th>{translate('react.onOrderReport.qtyShippedNotReceived.label', 'Qty Shipped Not Received')}</th>
                    {isSummary ? (
                      <>
                        <th>{translate('react.onOrderReport.totalOnOrder.label', 'Total On Order')}</th>
                        <th>{translate('react.onOrderReport.totalOnHand.label', 'Total On Hand')}</th>
                        <th>{translate('react.onOrderReport.totalOnHandAndOnOrder.label', 'Total On Hand and On Order')}</th>
                      </>
                    ) : (
                      <>
                        <th>{translate('react.onOrderReport.orderNumber.label', 'PO #')}</th>
                        <th>{translate('react.onOrderReport.orderDescription.label', 'PO Description')}</th>
                        <th>{translate('react.onOrderReport.supplierOrganization.label', 'Supplier Organization')}</th>
                        <th>{translate('react.onOrderReport.supplierLocation.label', 'Supplier Location')}</th>
                        <th>{translate('react.onOrderReport.supplierLocationGroup.label', 'Supplier Location Group')}</th>
                        <th>{translate('react.onOrderReport.estimatedGoodsReadyDate.label', 'Estimated Goods Ready Date')}</th>
                        <th>{translate('react.onOrderReport.shipmentNumber.label', 'Shipment Number')}</th>
                        <th>{translate('react.onOrderReport.shipDate.label', 'Ship Date')}</th>
                        <th>{translate('react.onOrderReport.shipmentType.label', 'Shipment Type')}</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    // eslint-disable-next-line react/no-array-index-key
                    <tr key={index}>
                      <td>{row.productCode}</td>
                      <td title={row.displayName ? row.productName : undefined}>
                        {row.displayName || row.productName}
                      </td>
                      <td>{row.qtyOrderedNotShipped}</td>
                      <td>{row.qtyShippedNotReceived}</td>
                      {isSummary ? (
                        <>
                          <td>{row.totalOnOrder}</td>
                          <td>{row.totalOnHand}</td>
                          <td>{row.totalOnHandAndOnOrder}</td>
                        </>
                      ) : (
                        <>
                          <td>{row.orderNumber}</td>
                          <td>{row.orderDescription}</td>
                          <td>{row.supplierOrganization}</td>
                          <td>{row.supplierLocation}</td>
                          <td>{row.supplierLocationGroup}</td>
                          <td>{row.estimatedGoodsReadyDate}</td>
                          <td>{row.shipmentNumber}</td>
                          <td>{row.shipDate}</td>
                          <td>{row.shipmentType}</td>
                        </>
                      )}
                    </tr>
                  ))}
                  {!rows.length && (
                    <tr>
                      <td colSpan={isSummary ? 7 : 13} className="text-center text-muted">
                        <Translate id="react.onOrderReport.noRecords.label" defaultMessage="No records found" />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      </div>
    </PageWrapper>
  );
};

export default OnOrderReport;

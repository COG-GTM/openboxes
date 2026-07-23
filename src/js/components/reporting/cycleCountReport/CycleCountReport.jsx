import React, { useEffect, useState } from 'react';

import { useDispatch } from 'react-redux';

import { hideSpinner, showSpinner } from 'actions';
import reportApi from 'api/services/ReportApi';
import notification from 'components/Layout/notifications/notification';
import Section from 'components/Layout/v2/Section';
import ReportPagination from 'components/reporting/ReportPagination';
import { REPORT_URL } from 'consts/applicationUrls';
import NotificationType from 'consts/notificationTypes';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';
import HeaderWrapper from 'wrappers/HeaderWrapper';
import PageWrapper from 'wrappers/PageWrapper';

const PAGE_SIZE = 25;

const CycleCountReport = () => {
  useTranslation('cycleCountReport', 'default');

  const dispatch = useDispatch();
  const translate = useTranslate();
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      dispatch(showSpinner());
      try {
        const response = await reportApi.getCycleCountReport();
        setRows(response?.data?.data ?? []);
        setPage(0);
      } catch (error) {
        notification(NotificationType.ERROR)({
          message: translate('react.cycleCountReport.fetchError.label', 'Unable to load cycle count report'),
        });
      } finally {
        dispatch(hideSpinner());
      }
    };
    fetchData();
  }, []);

  return (
    <PageWrapper>
      <HeaderWrapper className="align-items-center justify-content-between h-auto py-3">
        <span className="title">
          <Translate id="react.cycleCountReport.label" defaultMessage="Cycle Count Report" />
        </span>
        <a
          className="btn btn-outline-primary"
          href={REPORT_URL.showCycleCountReport({ print: true })}
        >
          <Translate id="react.default.button.download.label" defaultMessage="Download" />
        </a>
      </HeaderWrapper>
      <div className="p-3">
        <div className="pb-3">
          <Translate
            id="react.cycleCountReport.instructions.label"
            defaultMessage="The Cycle Count Report includes all products with stock in your location, along with lot numbers, bin locations, and quantities on hand. Download the report to record a physical count."
          />
        </div>
        <Section title={{ label: 'react.cycleCountReport.label', defaultMessage: 'Cycle Count Report' }}>
          <div className="pb-2" data-testid="cycle-count-report-count">
            {`${rows.length} ${translate('react.default.entries.label', 'entries')}`}
          </div>
          <table className="table table-sm" data-testid="cycle-count-report-table">
            <thead>
              <tr>
                <th>{translate('react.cycleCountReport.productCode.label', 'Code')}</th>
                <th>{translate('react.cycleCountReport.product.label', 'Product')}</th>
                <th>{translate('react.cycleCountReport.productFamily.label', 'Product Family')}</th>
                <th>{translate('react.cycleCountReport.category.label', 'Category')}</th>
                <th>{translate('react.cycleCountReport.formularies.label', 'Formularies')}</th>
                <th>{translate('react.cycleCountReport.lotNumber.label', 'Lot number')}</th>
                <th>{translate('react.cycleCountReport.expirationDate.label', 'Expiration date')}</th>
                <th>{translate('react.cycleCountReport.abcClass.label', 'ABC Classification')}</th>
                <th>{translate('react.cycleCountReport.binLocation.label', 'Bin location')}</th>
                <th>{translate('react.cycleCountReport.status.label', 'Status')}</th>
                <th>{translate('react.cycleCountReport.lastInventoryDate.label', 'Last inventory date')}</th>
                <th className="text-right">{translate('react.cycleCountReport.qoh.label', 'QoH')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map((row, index) => (
                // eslint-disable-next-line react/no-array-index-key
                <tr key={`${row.productCode}-${row.lotNumber}-${row.binLocation}-${index}`}>
                  <td>{row.productCode}</td>
                  <td>{row.productName}</td>
                  <td>{row.productFamily}</td>
                  <td>{row.category}</td>
                  <td>{row.formularies}</td>
                  <td>{row.lotNumber}</td>
                  <td>{row.expirationDate}</td>
                  <td>{row.abcClassification}</td>
                  <td>{row.binLocation}</td>
                  <td>{row.status}</td>
                  <td>{row.lastInventoryDate}</td>
                  <td className="text-right">{row.quantityOnHand}</td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={12} className="text-center text-muted">
                    <Translate id="react.default.noData.label" defaultMessage="No data available in table" />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <ReportPagination
            page={page}
            pageSize={PAGE_SIZE}
            total={rows.length}
            onPageChange={setPage}
          />
        </Section>
      </div>
    </PageWrapper>
  );
};

export default CycleCountReport;

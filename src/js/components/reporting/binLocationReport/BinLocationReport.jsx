import React, { useEffect, useState } from 'react';

import { useDispatch, useSelector } from 'react-redux';
import { useHistory, useLocation } from 'react-router-dom';

import { hideSpinner, showSpinner } from 'actions';
import locationApi from 'api/services/LocationApi';
import reportApi from 'api/services/ReportApi';
import notification from 'components/Layout/notifications/notification';
import Section from 'components/Layout/v2/Section';
import ReportPagination from 'components/reporting/ReportPagination';
import { INVENTORY_ITEM_URL, REPORT_URL } from 'consts/applicationUrls';
import NotificationType from 'consts/notificationTypes';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import renderHandlingIcons from 'utils/product-handling-icons';
import Translate from 'utils/Translate';
import HeaderWrapper from 'wrappers/HeaderWrapper';
import PageWrapper from 'wrappers/PageWrapper';

const STATUSES = ['inStock', 'outOfStock'];
const PAGE_SIZE = 100;

const BinLocationReport = () => {
  useTranslation('binLocationReport', 'default');

  const dispatch = useDispatch();
  const history = useHistory();
  const translate = useTranslate();
  const search = new URLSearchParams(useLocation().search);
  const currentLocationId = useSelector((state) => state.session.currentLocation?.id);

  const [locations, setLocations] = useState([]);
  const [locationId, setLocationId] = useState(search.get('location.id') || currentLocationId || '');
  const [status, setStatus] = useState(search.get('status') || '');
  const [rows, setRows] = useState([]);
  const [fetched, setFetched] = useState(false);
  const [page, setPage] = useState(0);

  useEffect(() => {
    locationApi.getLocations()
      .then((response) => setLocations(response?.data?.data ?? []))
      .catch(() => {});
  }, []);

  const runReport = async (params) => {
    dispatch(showSpinner());
    try {
      const response = await reportApi.getBinLocationReport({ params });
      setRows(response?.data?.data ?? []);
      setPage(0);
      setFetched(true);
    } catch (error) {
      notification(NotificationType.ERROR)({
        message: translate('react.binLocationReport.fetchError.label', 'Unable to load bin location report'),
      });
    } finally {
      dispatch(hideSpinner());
    }
  };

  useEffect(() => {
    if (!locationId && currentLocationId) {
      setLocationId(currentLocationId);
    }
  }, [currentLocationId]);

  useEffect(() => {
    if (locationId && !fetched) {
      runReport({ 'location.id': locationId, status: status || undefined });
    }
  }, [locationId]);

  const onRunReport = (event) => {
    event.preventDefault();
    const query = new URLSearchParams();
    if (locationId) {
      query.set('location.id', locationId);
    }
    if (status) {
      query.set('status', status);
    }
    history.replace({ search: query.toString() });
    runReport({ 'location.id': locationId, status: status || undefined });
  };

  return (
    <PageWrapper>
      <HeaderWrapper className="align-items-center h-auto py-3">
        <span className="title">
          <Translate id="react.binLocationReport.label" defaultMessage="Inventory Details Report" />
        </span>
      </HeaderWrapper>
      <div className="p-3">
        <div className="pb-3">
          <Translate
            id="react.binLocationReport.instructions.label"
            defaultMessage='In the Inventory Details report, you find information about the stock at your location for all products of your inventory, including details of the lots in stock with their bin location. Use the filters to exclude "Out of Stock" products.'
          />
        </div>
        <Section title={{ label: 'react.default.filters.label', defaultMessage: 'Filters' }}>
          <form onSubmit={onRunReport} data-testid="bin-location-report-filters">
            <div className="form-row align-items-end">
              <div className="form-group col-md-4">
                <label htmlFor="bin-location-report-location">
                  <Translate id="react.binLocationReport.location.label" defaultMessage="Location" />
                </label>
                <select
                  id="bin-location-report-location"
                  className="form-control"
                  value={locationId}
                  onChange={(event) => setLocationId(event.target.value)}
                >
                  {locations.map((location) => (
                    <option key={location.id} value={location.id}>{location.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group col-md-3">
                <label htmlFor="bin-location-report-status">
                  <Translate id="react.binLocationReport.status.label" defaultMessage="Status" />
                </label>
                <select
                  id="bin-location-report-status"
                  className="form-control"
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                >
                  <option value="">{translate('react.default.all.label', 'All')}</option>
                  {STATUSES.map((statusOption) => (
                    <option key={statusOption} value={statusOption}>
                      {translate(`react.binLocationReport.${statusOption}.label`, statusOption)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group col-md-5">
                <button type="submit" className="btn btn-primary mr-2">
                  <Translate id="react.binLocationReport.runReport.label" defaultMessage="Run report" />
                </button>
                <a
                  className="btn btn-outline-secondary mr-2"
                  href={REPORT_URL.showBinLocationReport({
                    downloadAction: 'downloadStockReport',
                    'location.id': locationId || undefined,
                    status: status || undefined,
                  })}
                >
                  <Translate id="react.binLocationReport.downloadReport.label" defaultMessage="Download report" />
                </a>
                <a
                  className="btn btn-outline-secondary"
                  href={REPORT_URL.showBinLocationReport({
                    downloadAction: 'downloadStockMovement',
                    'location.id': locationId || undefined,
                    status: status || undefined,
                  })}
                >
                  <Translate id="react.binLocationReport.downloadStockMovement.label" defaultMessage="Download stock movement" />
                </a>
              </div>
            </div>
          </form>
        </Section>
        <Section title={{ label: 'react.binLocationReport.label', defaultMessage: 'Inventory Details Report' }}>
          <div className="pb-2" data-testid="bin-location-report-count">
            {`${rows.length} ${translate('react.default.entries.label', 'entries')}`}
          </div>
          <table className="table table-sm" data-testid="bin-location-report-table">
            <thead>
              <tr>
                <th>{translate('react.binLocationReport.statusColumn.label', 'Status')}</th>
                <th>{translate('react.binLocationReport.productCode.label', 'Code')}</th>
                <th>{translate('react.binLocationReport.product.label', 'Product')}</th>
                <th>{translate('react.binLocationReport.zone.label', 'Zone')}</th>
                <th>{translate('react.binLocationReport.binLocation.label', 'Bin Location')}</th>
                <th>{translate('react.binLocationReport.lotNumber.label', 'Lot Number')}</th>
                <th>{translate('react.binLocationReport.expirationDate.label', 'Expiration Date')}</th>
                <th className="text-right">{translate('react.binLocationReport.quantityOnHand.label', 'Quantity On Hand')}</th>
                <th className="text-right">{translate('react.binLocationReport.quantityAvailable.label', 'Quantity Available')}</th>
                <th>{translate('react.binLocationReport.uom.label', 'UoM')}</th>
                <th className="text-right">{translate('react.binLocationReport.unitCost.label', 'Unit Cost')}</th>
                <th className="text-right">{translate('react.binLocationReport.totalValue.label', 'Total Value')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map((row, index) => (
                <tr
                  // eslint-disable-next-line react/no-array-index-key
                  key={`${row.id}-${row.binLocation}-${row.lotNumber}-${index}`}
                  style={{
                    backgroundColor: (row.lotStatus === 'RECALLED' && '#ffcccb')
                      || (row.isOnHold && '#fca714')
                      || undefined,
                  }}
                  title={(row.lotStatus === 'RECALLED' && 'This lot has been recalled')
                    || (row.isOnHold && 'This bin has been restricted')
                    || undefined}
                >
                  <td>{row.status}</td>
                  <td>
                    <a href={INVENTORY_ITEM_URL.showStockCard(row.id)}>{row.productCode}</a>
                  </td>
                  <td title={row.displayName ? row.productName : undefined}>
                    <a href={INVENTORY_ITEM_URL.showStockCard(row.id)}>
                      {row.displayName ?? row.productName}
                    </a>
                    {renderHandlingIcons(row.handlingIcons)}
                  </td>
                  <td>{row.zone}</td>
                  <td>{row.binLocation}</td>
                  <td>{row.lotNumber}</td>
                  <td>{row.expirationDate}</td>
                  <td className="text-right">{row.quantity}</td>
                  <td className="text-right">{row.quantityAvailableToPromise}</td>
                  <td>{row.unitOfMeasure}</td>
                  <td className="text-right">{row.unitCost}</td>
                  <td className="text-right">{row.totalValue}</td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={12} className="text-center text-muted">
                    {fetched
                      ? <Translate id="react.default.noData.label" defaultMessage="No data available in table" />
                      : <Translate id="react.binLocationReport.runToView.label" defaultMessage="Run the report to view results" />}
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

export default BinLocationReport;

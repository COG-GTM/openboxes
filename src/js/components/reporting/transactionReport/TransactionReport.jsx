import React, { useEffect, useState } from 'react';

import moment from 'moment';
import queryString from 'query-string';
import Modal from 'react-modal';
import { useDispatch, useSelector } from 'react-redux';
import { getCurrentLocation } from 'selectors';

import { hideSpinner, showSpinner } from 'actions';
import {
  REPORT_TRANSACTION_REPORT,
  REPORT_TRANSACTION_REPORT_DETAILS,
  REPORT_TRANSACTION_REPORT_METADATA,
} from 'api/urls';
import notification from 'components/Layout/notifications/notification';
import Section from 'components/Layout/v2/Section';
import ActivityCode from 'consts/activityCode';
import { CONTEXT_PATH } from 'consts/applicationUrls';
import NotificationType from 'consts/notificationTypes';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import apiClient from 'utils/apiClient';
import {
  debounceProductsFetch,
  fetchLocations,
  fetchProductsCatalogs,
  fetchProductsCategories,
  fetchProductsTags,
} from 'utils/option-utils';
import Select from 'utils/Select';
import Translate from 'utils/Translate';
import HeaderWrapper from 'wrappers/HeaderWrapper';
import PageWrapper from 'wrappers/PageWrapper';

const DATE_FORMAT = 'MM/DD/YYYY';

const formatNumber = (value) => Number(value ?? 0).toLocaleString('en-US');

// The legacy metadata panel showed refresh times relative to now (prettyDateFormat)
const formatRelative = (value) => (value ? moment(value, 'DD/MMM/YYYY HH:mm:ss').fromNow() : null);

const TransactionReport = () => {
  useTranslation('transactionReport', 'default');

  const dispatch = useDispatch();
  const translate = useTranslate();
  const currentLocation = useSelector(getCurrentLocation);
  const isSuperuser = useSelector((state) => state.session.isSuperuser);

  const [locations, setLocations] = useState([]);
  const [categories, setCategories] = useState([]);
  const [catalogs, setCatalogs] = useState([]);
  const [tags, setTags] = useState([]);

  const [location, setLocation] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [category, setCategory] = useState(null);
  const [includeCategoryChildren, setIncludeCategoryChildren] = useState(true);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [selectedCatalogs, setSelectedCatalogs] = useState([]);

  const [metadata, setMetadata] = useState(null);
  const [rows, setRows] = useState(null);

  const [detailsRow, setDetailsRow] = useState(null);
  const [detailsRows, setDetailsRows] = useState(null);

  const initialParams = queryString.parse(window.location.search);

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [locationList, categoryList, catalogList, tagList] = await Promise.all([
          fetchLocations({ activityCodes: [ActivityCode.MANAGE_INVENTORY] }),
          fetchProductsCategories(),
          fetchProductsCatalogs(),
          fetchProductsTags(),
        ]);
        setLocations(locationList);
        setCategories(categoryList);
        setCatalogs(catalogList);
        setTags(tagList);
        const preselectedCategory = initialParams['category.id']
          && categoryList.find((option) => option.id === initialParams['category.id']);
        if (preselectedCategory) {
          setCategory(preselectedCategory);
        }
      } catch (error) {
        notification(NotificationType.ERROR)({
          message: translate('react.transactionReport.optionsError.label', 'Unable to load filter options'),
        });
      }
    };
    fetchOptions();
  }, []);

  useEffect(() => {
    if (locations.length && !location) {
      const preselectedId = initialParams['location.id'] || currentLocation?.id;
      const preselected = locations.find((option) => option.id === preselectedId);
      if (preselected) {
        setLocation(preselected);
      }
    }
  }, [currentLocation?.id, locations]);

  const fetchMetadata = async (locationId) => {
    try {
      const response = await apiClient.get(REPORT_TRANSACTION_REPORT_METADATA, {
        params: { locationId },
      });
      setMetadata(response?.data?.data ?? null);
    } catch (error) {
      setMetadata(null);
    }
  };

  useEffect(() => {
    if (location?.id) {
      fetchMetadata(location.id);
    }
  }, [location?.id]);

  const validate = () => {
    if (!location || !startDate || !endDate) {
      notification(NotificationType.ERROR)({
        message: translate('react.transactionReport.requiredFields.label', 'All fields are required'),
      });
      return false;
    }
    if (moment(startDate).isAfter(moment(endDate))) {
      notification(NotificationType.ERROR)({
        message: translate('react.transactionReport.invalidDateRange.label', 'Start date must occur before end date'),
      });
      return false;
    }
    if (moment(endDate).isAfter(moment(), 'day')) {
      notification(NotificationType.ERROR)({
        message: translate('react.transactionReport.endDateInFuture.label', 'End date must occur on or before today'),
      });
      return false;
    }
    return true;
  };

  const getParams = () => ({
    locationId: location?.id,
    startDate: moment(startDate).format(DATE_FORMAT),
    endDate: moment(endDate).format(DATE_FORMAT),
    category: category?.id || null,
    includeCategoryChildren: includeCategoryChildren ? 'on' : null,
    products: selectedProducts.map((product) => product.id),
    tags: selectedTags.map((tag) => tag.id),
    catalogs: selectedCatalogs.map((catalog) => catalog.id),
  });

  const runReport = async () => {
    if (!validate()) {
      return;
    }
    dispatch(showSpinner());
    try {
      const response = await apiClient.get(REPORT_TRANSACTION_REPORT, {
        paramsSerializer: (parameters) => queryString.stringify(parameters, { skipNull: true }),
        params: getParams(),
      });
      setRows(response?.data?.data ?? []);
    } catch (error) {
      notification(NotificationType.ERROR)({
        message: error?.response?.data?.errorMessage
          || translate('react.transactionReport.fetchError.label', 'Unable to load transaction report'),
      });
    } finally {
      dispatch(hideSpinner());
    }
  };

  const downloadCsv = () => {
    if (!validate()) {
      return;
    }
    const searchParams = new URLSearchParams();
    searchParams.append('location.id', location?.id);
    searchParams.append('startDate', moment(startDate).format(DATE_FORMAT));
    searchParams.append('endDate', moment(endDate).format(DATE_FORMAT));
    if (category?.id) {
      searchParams.append('category', category.id);
    }
    if (includeCategoryChildren) {
      searchParams.append('includeCategoryChildren', 'on');
    }
    selectedProducts.forEach((product) => searchParams.append('products', product.id));
    selectedTags.forEach((tag) => searchParams.append('tags', tag.id));
    selectedCatalogs.forEach((catalog) => searchParams.append('catalogs', catalog.id));
    searchParams.append('format', 'text/csv');
    window.location.href = `${CONTEXT_PATH}/json/getTransactionReport?${searchParams.toString()}`;
  };

  const refreshData = async () => {
    // eslint-disable-next-line no-alert
    if (!window.confirm(translate('react.transactionReport.refreshConfirm.label', 'Are you sure?'))) {
      return;
    }
    dispatch(showSpinner());
    try {
      await apiClient.get(`${CONTEXT_PATH}/report/refreshTransactionFact`);
      notification(NotificationType.SUCCESS)({
        message: translate('react.transactionReport.refreshSuccess.label', 'Data has been refreshed'),
      });
      await fetchMetadata(location?.id);
    } catch (error) {
      notification(NotificationType.ERROR)({
        message: translate('react.transactionReport.refreshError.label', 'An error occurred while refreshing the data'),
      });
    } finally {
      dispatch(hideSpinner());
    }
  };

  const openDetails = async (row) => {
    if (!row.productCode) {
      return;
    }
    dispatch(showSpinner());
    try {
      const response = await apiClient.get(REPORT_TRANSACTION_REPORT_DETAILS, {
        params: {
          productCode: row.productCode,
          locationId: location?.id,
          startDate: moment(startDate).format(DATE_FORMAT),
          endDate: moment(endDate).format(DATE_FORMAT),
        },
      });
      setDetailsRow(row);
      setDetailsRows(response?.data?.data ?? []);
    } catch (error) {
      notification(NotificationType.ERROR)({
        message: translate('react.transactionReport.detailsError.label', 'Unable to load transaction details'),
      });
    } finally {
      dispatch(hideSpinner());
    }
  };

  const closeDetails = () => {
    setDetailsRow(null);
    setDetailsRows(null);
  };

  return (
    <PageWrapper>
      <HeaderWrapper className="align-items-center h-auto py-3">
        <span className="title">
          <Translate id="react.transactionReport.title.label" defaultMessage="Transaction Report" />
        </span>
      </HeaderWrapper>
      <div className="p-3 d-flex" style={{ gap: '1rem', alignItems: 'flex-start' }}>
        <div style={{ minWidth: '320px', maxWidth: '360px' }}>
          <Section
            title={{ label: 'react.transactionReport.parameters.label', defaultMessage: 'Parameters' }}
          >
            <div className="form-group">
              <label htmlFor="start-date-input">
                <Translate id="react.transactionReport.startDate.label" defaultMessage="Start date" />
              </label>
              <input
                id="start-date-input"
                type="date"
                className="form-control"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="end-date-input">
                <Translate id="react.transactionReport.endDate.label" defaultMessage="End date" />
              </label>
              <input
                id="end-date-input"
                type="date"
                className="form-control"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="location-select">
                <Translate id="react.transactionReport.location.label" defaultMessage="Location" />
              </label>
              <Select
                id="location-select"
                dataTestId="location-select"
                options={locations}
                value={location}
                onChange={(value) => setLocation(value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="category-select">
                <Translate id="react.transactionReport.category.label" defaultMessage="Category" />
              </label>
              <Select
                id="category-select"
                dataTestId="category-select"
                options={categories}
                value={category}
                onChange={(value) => setCategory(value)}
              />
              <div className="form-check mt-1">
                <label className="form-check-label" htmlFor="include-category-children-checkbox">
                  <input
                    id="include-category-children-checkbox"
                    type="checkbox"
                    className="form-check-input"
                    checked={includeCategoryChildren}
                    onChange={(event) => setIncludeCategoryChildren(event.target.checked)}
                  />
                  <Translate
                    id="react.transactionReport.includeCategoryChildren.label"
                    defaultMessage="Include all products in all subcategories"
                  />
                </label>
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="products-select">
                <Translate id="react.transactionReport.product.label" defaultMessage="Product" />
              </label>
              <Select
                id="products-select"
                dataTestId="products-select"
                async
                multi
                loadOptions={debounceProductsFetch(500, 3, currentLocation?.id)}
                cache={false}
                options={[]}
                value={selectedProducts}
                onChange={(value) => setSelectedProducts(value || [])}
              />
            </div>
            <div className="form-group">
              <label htmlFor="tags-select">
                <Translate id="react.transactionReport.tags.label" defaultMessage="Tags" />
              </label>
              <Select
                id="tags-select"
                dataTestId="tags-select"
                options={tags}
                value={selectedTags}
                onChange={(value) => setSelectedTags(value || [])}
                multi
              />
            </div>
            <div className="form-group">
              <label htmlFor="catalogs-select">
                <Translate id="react.transactionReport.catalogs.label" defaultMessage="Formularies" />
              </label>
              <Select
                id="catalogs-select"
                dataTestId="catalogs-select"
                options={catalogs}
                value={selectedCatalogs}
                onChange={(value) => setSelectedCatalogs(value || [])}
                multi
              />
            </div>
            <div className="d-flex" style={{ gap: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-primary"
                data-testid="run-report-button"
                onClick={runReport}
              >
                <Translate id="react.transactionReport.runReport.label" defaultMessage="Run Report" />
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary"
                data-testid="download-button"
                onClick={downloadCsv}
              >
                <Translate id="react.transactionReport.download.label" defaultMessage="Download Data" />
              </button>
            </div>
          </Section>
          <Section
            title={{ label: 'react.transactionReport.metadata.label', defaultMessage: 'Metadata' }}
          >
            <table className="table table-sm" data-testid="transaction-report-metadata">
              <tbody>
                <tr>
                  <td>{translate('react.transactionReport.products.label', 'Products')}</td>
                  <td data-testid="metadata-product-count">{formatNumber(metadata?.productCount)}</td>
                </tr>
                <tr>
                  <td>{translate('react.transactionReport.transactions.label', 'Transactions')}</td>
                  <td data-testid="metadata-transaction-count">{formatNumber(metadata?.transactionCount)}</td>
                </tr>
                <tr>
                  <td>{translate('react.transactionReport.earliestTransaction.label', 'Earliest Transaction')}</td>
                  <td>{metadata?.minTransactionDate}</td>
                </tr>
                <tr>
                  <td>{translate('react.transactionReport.latestTransaction.label', 'Latest Transaction')}</td>
                  <td>{metadata?.maxTransactionDate}</td>
                </tr>
                <tr>
                  <td>{translate('react.transactionReport.previousRefresh.label', 'Previous Refresh')}</td>
                  <td>{formatRelative(metadata?.previousRefresh)}</td>
                </tr>
                <tr>
                  <td>{translate('react.transactionReport.nextRefresh.label', 'Next Refresh')}</td>
                  <td>{formatRelative(metadata?.nextRefresh)}</td>
                </tr>
              </tbody>
            </table>
            {isSuperuser && (
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                data-testid="refresh-data-button"
                onClick={refreshData}
              >
                <Translate id="react.transactionReport.refreshData.label" defaultMessage="Refresh Data" />
              </button>
            )}
          </Section>
        </div>
        <div className="flex-grow-1" style={{ minWidth: 0 }}>
          <Section
            title={{ label: 'react.transactionReport.title.label', defaultMessage: 'Transaction Report' }}
          >
            {rows === null ? (
              <div className="text-muted">
                <Translate id="react.transactionReport.runPrompt.label" defaultMessage="Run the report to see results" />
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-sm table-hover" data-testid="transaction-report-table">
                  <thead>
                    <tr>
                      <th>{translate('react.transactionReport.productCode.label', 'Code')}</th>
                      <th>{translate('react.transactionReport.product.label', 'Product')}</th>
                      <th>{translate('react.transactionReport.category.label', 'Category')}</th>
                      <th className="text-right">{translate('react.transactionReport.opening.label', 'Opening')}</th>
                      <th className="text-right">{translate('react.transactionReport.credits.label', 'Credits')}</th>
                      <th className="text-right">{translate('react.transactionReport.debits.label', 'Debits')}</th>
                      <th className="text-right">{translate('react.transactionReport.adjustments.label', 'Adjustments')}</th>
                      <th className="text-right">{translate('react.transactionReport.closing.label', 'Closing')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr
                        key={row.productCode}
                        style={{ cursor: 'pointer' }}
                        onClick={() => openDetails(row)}
                      >
                        <td>{row.productCode}</td>
                        <td title={row.displayName ? row.productName : undefined}>
                          {row.displayName || row.productName}
                        </td>
                        <td>{row.category}</td>
                        <td className="text-right">{formatNumber(row.opening)}</td>
                        <td className={`text-right ${row.credits > 0 ? 'text-success' : ''}`}>
                          {formatNumber(row.credits)}
                        </td>
                        <td className={`text-right ${row.debits > 0 ? 'text-danger' : ''}`}>
                          {formatNumber(row.debits)}
                        </td>
                        <td className={`text-right ${row.adjustments > 0 ? 'text-success' : ''}${row.adjustments < 0 ? 'text-danger' : ''}`}>
                          {formatNumber(Math.abs(row.adjustments))}
                        </td>
                        <td className="text-right">{formatNumber(row.closing)}</td>
                      </tr>
                    ))}
                    {!rows.length && (
                      <tr>
                        <td colSpan={8} className="text-center text-muted">
                          <Translate id="react.transactionReport.noRecords.label" defaultMessage="No records found" />
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </Section>
        </div>
      </div>
      <Modal
        isOpen={detailsRow !== null}
        onRequestClose={closeDetails}
        ariaHideApp={false}
        style={{
          content: {
            maxWidth: '800px',
            margin: 'auto',
            maxHeight: '80vh',
          },
        }}
      >
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h5 data-testid="details-modal-title">
            {detailsRow?.productCode}
            {' '}
            {detailsRow?.displayName || detailsRow?.productName}
          </h5>
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={closeDetails}>
            <Translate id="react.default.button.close.label" defaultMessage="Close" />
          </button>
        </div>
        <div className="table-responsive">
          <table className="table table-sm" data-testid="transaction-report-details-table">
            <thead>
              <tr>
                <th>{translate('react.transactionReport.transactionDate.label', 'Date')}</th>
                <th>{translate('react.transactionReport.transactionTime.label', 'Time')}</th>
                <th>{translate('react.transactionReport.transactionType.label', 'Transaction Type')}</th>
                <th className="text-right">{translate('react.transactionReport.quantity.label', 'Quantity')}</th>
                <th className="text-right">{translate('react.transactionReport.balance.label', 'Balance')}</th>
              </tr>
            </thead>
            <tbody>
              {(detailsRows ?? []).map((entry, index) => (
                // eslint-disable-next-line react/no-array-index-key
                <tr key={index}>
                  <td>{entry.transactionDate}</td>
                  <td>{entry.transactionTime}</td>
                  <td>{entry.transactionTypeName}</td>
                  <td className="text-right">{entry.quantity !== null ? formatNumber(entry.quantity) : ''}</td>
                  <td className="text-right">{formatNumber(entry.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Modal>
    </PageWrapper>
  );
};

export default TransactionReport;

import React, { useEffect, useState } from 'react';

import moment from 'moment';
import queryString from 'query-string';
import { useDispatch, useSelector } from 'react-redux';
import { getCurrentLocation } from 'selectors';

import { hideSpinner, showSpinner } from 'actions';
import { REPORT_REQUEST_DETAILS, REPORT_REQUEST_REASON_CODES } from 'api/urls';
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

const RequestDetailReport = () => {
  useTranslation('requestDetailReport', 'default');

  const dispatch = useDispatch();
  const translate = useTranslate();
  const currentLocation = useSelector(getCurrentLocation);

  const [origins, setOrigins] = useState([]);
  const [locations, setLocations] = useState([]);
  const [categories, setCategories] = useState([]);
  const [catalogs, setCatalogs] = useState([]);
  const [tags, setTags] = useState([]);
  const [reasonCodes, setReasonCodes] = useState([]);

  const [selectedOrigins, setSelectedOrigins] = useState([]);
  const [product, setProduct] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [category, setCategory] = useState(null);
  const [includeCategoryChildren, setIncludeCategoryChildren] = useState(true);
  const [selectedCatalogs, setSelectedCatalogs] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [reasonCode, setReasonCode] = useState(null);
  const [destination, setDestination] = useState(null);

  const [rows, setRows] = useState(null);

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [
          locationList, allLocations, categoryList, catalogList, tagList, reasonCodesResponse,
        ] = await Promise.all([
          fetchLocations({ activityCodes: [ActivityCode.MANAGE_INVENTORY] }),
          fetchLocations({ activityCodes: [] }),
          fetchProductsCategories(),
          fetchProductsCatalogs(),
          fetchProductsTags(),
          apiClient.get(REPORT_REQUEST_REASON_CODES),
        ]);
        setOrigins(locationList);
        setLocations(allLocations);
        setCategories(categoryList);
        setCatalogs(catalogList);
        setTags(tagList);
        setReasonCodes((reasonCodesResponse?.data?.data ?? []).map((code) => ({
          id: code.id,
          value: code.id,
          label: code.name,
        })));
      } catch (error) {
        notification(NotificationType.ERROR)({
          message: translate('react.requestDetailReport.optionsError.label', 'Unable to load filter options'),
        });
      }
    };
    fetchOptions();
  }, []);

  useEffect(() => {
    if (currentLocation?.id && origins.length && !selectedOrigins.length) {
      const current = origins.find((origin) => origin.id === currentLocation.id);
      if (current) {
        setSelectedOrigins([current]);
      }
    }
  }, [currentLocation?.id, origins]);

  const validate = () => {
    if (!selectedOrigins.length || !startDate || !endDate) {
      notification(NotificationType.ERROR)({
        message: translate('react.requestDetailReport.requiredFields.label', 'All report parameters fields are required'),
      });
      return false;
    }
    if (moment(startDate).isAfter(moment(endDate))) {
      notification(NotificationType.ERROR)({
        message: translate('react.requestDetailReport.invalidDateRange.label', 'Start date must occur before end date'),
      });
      return false;
    }
    return true;
  };

  const getParams = () => ({
    originId: selectedOrigins.map((origin) => origin.id),
    startDate: moment(startDate).format(DATE_FORMAT),
    endDate: moment(endDate).format(DATE_FORMAT),
    destinationId: destination?.id || null,
    productId: product?.id || null,
    reasonCode: reasonCode?.id || null,
    category: category?.id || null,
    includeCategoryChildren: includeCategoryChildren ? 'on' : null,
    catalogs: selectedCatalogs.map((catalog) => catalog.id),
    tags: selectedTags.map((tag) => tag.id),
  });

  const runReport = async () => {
    if (!validate()) {
      return;
    }
    dispatch(showSpinner());
    try {
      const response = await apiClient.get(REPORT_REQUEST_DETAILS, {
        paramsSerializer: (parameters) => queryString.stringify(parameters, { skipNull: true }),
        params: getParams(),
      });
      setRows(response?.data?.data ?? []);
    } catch (error) {
      notification(NotificationType.ERROR)({
        message: translate('react.requestDetailReport.fetchError.label', 'Unable to load request detail report'),
      });
    } finally {
      dispatch(hideSpinner());
    }
  };

  const downloadCsv = () => {
    if (!validate()) {
      return;
    }
    const params = getParams();
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') {
        return;
      }
      if (Array.isArray(value)) {
        value.forEach((item) => searchParams.append(key, item));
        return;
      }
      searchParams.append(key, value);
    });
    searchParams.append('format', 'text/csv');
    window.location.href = `${CONTEXT_PATH}/json/getRequestDetailReport?${searchParams.toString()}`;
  };

  const totalDemand = (rows ?? []).reduce((sum, row) => sum + (row.quantityDemand || 0), 0);
  const monthsDifference = startDate && endDate
    ? moment(endDate).startOf('month').diff(moment(startDate).startOf('month'), 'months', true) + 1
    : 1;
  const averageMonthlyDemand = Math.round(totalDemand / monthsDifference);

  return (
    <PageWrapper>
      <HeaderWrapper className="align-items-center h-auto py-3">
        <span className="title">
          <Translate id="react.requestDetailReport.title.label" defaultMessage="Request Detail Report" />
        </span>
      </HeaderWrapper>
      <div className="p-3 d-flex" style={{ gap: '1rem', alignItems: 'flex-start' }}>
        <div style={{ minWidth: '320px', maxWidth: '360px' }}>
          <Section
            title={{ label: 'react.requestDetailReport.parameters.label', defaultMessage: 'Parameters' }}
          >
            <div className="form-group">
              <label htmlFor="origin-select">
                <Translate id="react.requestDetailReport.fulfillingLocation.label" defaultMessage="Fulfilling location" />
              </label>
              <Select
                id="origin-select"
                dataTestId="origin-select"
                options={origins}
                value={selectedOrigins}
                onChange={(value) => setSelectedOrigins(value || [])}
                multi
              />
            </div>
            <div className="form-group">
              <label htmlFor="start-date-input">
                <Translate id="react.requestDetailReport.dateIssuedBetween.label" defaultMessage="Date Issued Between" />
              </label>
              <div className="d-flex" style={{ gap: '0.5rem' }}>
                <input
                  id="start-date-input"
                  type="date"
                  className="form-control"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                />
                <input
                  id="end-date-input"
                  type="date"
                  className="form-control"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                />
              </div>
            </div>
            <h5>
              <Translate id="react.requestDetailReport.optionalFilters.label" defaultMessage="Optional Filters" />
            </h5>
            <div className="form-group">
              <label htmlFor="product-select">
                <Translate id="react.requestDetailReport.product.label" defaultMessage="Product" />
              </label>
              <Select
                id="product-select"
                dataTestId="product-select"
                async
                loadOptions={debounceProductsFetch(500, 3, currentLocation?.id)}
                cache={false}
                options={[]}
                value={product}
                onChange={(value) => setProduct(value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="category-select">
                <Translate id="react.requestDetailReport.category.label" defaultMessage="Category" />
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
                    id="react.requestDetailReport.includeCategoryChildren.label"
                    defaultMessage="Include all products in all subcategories"
                  />
                </label>
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="catalogs-select">
                <Translate id="react.requestDetailReport.catalogs.label" defaultMessage="Formularies" />
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
            <div className="form-group">
              <label htmlFor="tags-select">
                <Translate id="react.requestDetailReport.tags.label" defaultMessage="Tags" />
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
              <label htmlFor="reason-code-select">
                <Translate id="react.requestDetailReport.reasonCode.label" defaultMessage="Reason Code" />
              </label>
              <Select
                id="reason-code-select"
                dataTestId="reason-code-select"
                options={reasonCodes}
                value={reasonCode}
                onChange={(value) => setReasonCode(value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="destination-select">
                <Translate id="react.requestDetailReport.destination.label" defaultMessage="Destination" />
              </label>
              <Select
                id="destination-select"
                dataTestId="destination-select"
                options={locations}
                value={destination}
                onChange={(value) => setDestination(value)}
              />
            </div>
            <div className="d-flex" style={{ gap: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-primary"
                data-testid="run-report-button"
                onClick={runReport}
              >
                <Translate id="react.requestDetailReport.runReport.label" defaultMessage="Run Report" />
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={downloadCsv}
              >
                <Translate id="react.requestDetailReport.download.label" defaultMessage="Download Data" />
              </button>
            </div>
          </Section>
        </div>
        <div className="flex-grow-1" style={{ minWidth: 0 }}>
          <Section
            title={{ label: 'react.requestDetailReport.listRequestItems.label', defaultMessage: 'List Completed Request Items' }}
          >
            {rows === null ? (
              <div className="text-muted">
                <Translate id="react.requestDetailReport.runPrompt.label" defaultMessage="Run the report to see results" />
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-sm" data-testid="request-detail-report-table">
                  <thead>
                    <tr>
                      <th>{translate('react.requestDetailReport.requestNumber.label', 'Request Number')}</th>
                      <th>{translate('react.requestDetailReport.dateRequested.label', 'Date Requested')}</th>
                      <th>{translate('react.requestDetailReport.dateIssued.label', 'Date Issued')}</th>
                      <th>{translate('react.requestDetailReport.origin.label', 'Origin')}</th>
                      <th>{translate('react.requestDetailReport.destinationColumn.label', 'Destination')}</th>
                      <th>{translate('react.requestDetailReport.productCode.label', 'Code')}</th>
                      <th>{translate('react.requestDetailReport.product.label', 'Product')}</th>
                      <th>{translate('react.requestDetailReport.quantityRequested.label', 'Qty Requested')}</th>
                      <th>{translate('react.requestDetailReport.quantityIssued.label', 'Qty Issued')}</th>
                      <th>{translate('react.requestDetailReport.quantityDemand.label', 'Qty Demand')}</th>
                      <th>{translate('react.requestDetailReport.reasonCodeColumn.label', 'Reason Code')}</th>
                      <th>{translate('react.requestDetailReport.reasonCodeClassification.label', 'Reason Code Classification')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, index) => (
                      // eslint-disable-next-line react/no-array-index-key
                      <tr key={index}>
                        <td>{row.requestNumber}</td>
                        <td>{row.dateRequested}</td>
                        <td>{row.dateIssued}</td>
                        <td>{row.origin}</td>
                        <td>{row.destination}</td>
                        <td>{row.productCode}</td>
                        <td>{row.productName}</td>
                        <td>{row.quantityRequested}</td>
                        <td>{row.quantityIssued}</td>
                        <td>{row.quantityDemand}</td>
                        <td>{row.reasonCode}</td>
                        <td>{row.reasonCodeClassification}</td>
                      </tr>
                    ))}
                    {!rows.length && (
                      <tr>
                        <td colSpan={12} className="text-center text-muted">
                          <Translate id="react.requestDetailReport.noRecords.label" defaultMessage="No records found" />
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr>
                      <th colSpan={10} aria-label="empty" />
                      <th>{translate('react.requestDetailReport.totalDemand.label', 'Total Demand')}</th>
                      <th data-testid="total-demand">{totalDemand}</th>
                    </tr>
                    <tr>
                      <th colSpan={10} aria-label="empty" />
                      <th>{translate('react.requestDetailReport.averageMonthlyDemand.label', 'Average Monthly Demand')}</th>
                      <th data-testid="average-monthly-demand">{averageMonthlyDemand}</th>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </Section>
        </div>
      </div>
    </PageWrapper>
  );
};

export default RequestDetailReport;

import React, { useEffect, useState } from 'react';

import moment from 'moment';
import { useSelector } from 'react-redux';
import { getCurrentLocation } from 'selectors';

import notification from 'components/Layout/notifications/notification';
import Section from 'components/Layout/v2/Section';
import { REPORT_URL } from 'consts/applicationUrls';
import NotificationType from 'consts/notificationTypes';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import {
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

const ForecastReport = () => {
  useTranslation('forecastReport', 'default');

  const translate = useTranslate();
  const currentLocation = useSelector(getCurrentLocation);

  const [locations, setLocations] = useState([]);
  const [categories, setCategories] = useState([]);
  const [catalogs, setCatalogs] = useState([]);
  const [tags, setTags] = useState([]);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [replenishmentPeriodDays, setReplenishmentPeriodDays] = useState('');
  const [leadTimeDays, setLeadTimeDays] = useState('');
  const [selectedLocations, setSelectedLocations] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedCatalogs, setSelectedCatalogs] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [locationList, categoryList, catalogList, tagList] = await Promise.all([
          fetchLocations({ activityCodes: [] }),
          fetchProductsCategories(),
          fetchProductsCatalogs(),
          fetchProductsTags(),
        ]);
        setLocations(locationList);
        setCategories(categoryList);
        setCatalogs(catalogList);
        setTags(tagList);
      } catch (error) {
        notification(NotificationType.ERROR)({
          message: translate('react.forecastReport.optionsError.label', 'Unable to load filter options'),
        });
      }
    };
    fetchOptions();
  }, []);

  const download = () => {
    const searchParams = new URLSearchParams();
    if (startDate && endDate) {
      searchParams.append('startDate', moment(startDate).format(DATE_FORMAT));
      searchParams.append('endDate', moment(endDate).format(DATE_FORMAT));
    }
    if (replenishmentPeriodDays) {
      searchParams.append('replenishmentPeriodDays', replenishmentPeriodDays);
    }
    if (leadTimeDays) {
      searchParams.append('leadTimeDays', leadTimeDays);
    }
    selectedLocations.forEach((location) => searchParams.append('locations', location.id));
    selectedCategories.forEach((category) => searchParams.append('category', category.id));
    selectedTags.forEach((tag) => searchParams.append('tags', tag.id));
    selectedCatalogs.forEach((catalog) => searchParams.append('catalogs', catalog.id));
    searchParams.append('format', 'text/csv');
    searchParams.append('print', 'true');
    window.location.href = `${REPORT_URL.showForecastReport()}?${searchParams.toString()}`;
  };

  return (
    <PageWrapper>
      <HeaderWrapper className="align-items-center h-auto py-3">
        <span className="title">
          <Translate id="react.forecastReport.title.label" defaultMessage="Forecast Report" />
        </span>
      </HeaderWrapper>
      <div className="p-3">
        <div style={{ maxWidth: '480px' }}>
          <Section
            title={{ label: 'react.forecastReport.parameters.label', defaultMessage: 'Parameters' }}
          >
            <div className="form-group">
              <label htmlFor="origin-input">
                <Translate id="react.forecastReport.location.label" defaultMessage="Location" />
              </label>
              <input
                id="origin-input"
                type="text"
                className="form-control"
                value={currentLocation?.name ?? ''}
                disabled
              />
            </div>
            <div className="form-group">
              <label htmlFor="start-date-input">
                <Translate id="react.forecastReport.demandDateRange.label" defaultMessage="Demand Date Range" />
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
            <div className="form-group">
              <label htmlFor="replenishment-period-input">
                <Translate id="react.forecastReport.orderPeriod.label" defaultMessage="Order Period (Days)" />
              </label>
              <input
                id="replenishment-period-input"
                type="number"
                className="form-control"
                value={replenishmentPeriodDays}
                onChange={(event) => setReplenishmentPeriodDays(event.target.value)}
              />
              <small className="text-muted">
                <Translate id="react.forecastReport.orderPeriod.optional.label" defaultMessage="Optional - defaults to value from inventory level" />
              </small>
            </div>
            <div className="form-group">
              <label htmlFor="lead-time-input">
                <Translate id="react.forecastReport.leadTime.label" defaultMessage="Lead Time (Days)" />
              </label>
              <input
                id="lead-time-input"
                type="number"
                className="form-control"
                value={leadTimeDays}
                onChange={(event) => setLeadTimeDays(event.target.value)}
              />
              <small className="text-muted">
                <Translate id="react.forecastReport.leadTime.optional.label" defaultMessage="Optional - defaults to value from inventory level" />
              </small>
            </div>
            <h5>
              <Translate id="react.forecastReport.optionalFilters.label" defaultMessage="Optional Filters" />
            </h5>
            <div className="form-group">
              <label htmlFor="locations-select">
                <Translate id="react.forecastReport.demandDestination.label" defaultMessage="Demand Destination" />
              </label>
              <Select
                id="locations-select"
                dataTestId="locations-select"
                options={locations}
                value={selectedLocations}
                onChange={(value) => setSelectedLocations(value || [])}
                multi
              />
            </div>
            <div className="form-group">
              <label htmlFor="categories-select">
                <Translate id="react.forecastReport.category.label" defaultMessage="Category" />
              </label>
              <Select
                id="categories-select"
                dataTestId="categories-select"
                options={categories}
                value={selectedCategories}
                onChange={(value) => setSelectedCategories(value || [])}
                multi
              />
            </div>
            <div className="form-group">
              <label htmlFor="catalogs-select">
                <Translate id="react.forecastReport.catalogs.label" defaultMessage="Formularies" />
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
                <Translate id="react.forecastReport.tags.label" defaultMessage="Tags" />
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
            <button
              type="button"
              className="btn btn-primary"
              data-testid="download-button"
              onClick={download}
            >
              <Translate id="react.forecastReport.download.label" defaultMessage="Download" />
            </button>
          </Section>
        </div>
      </div>
    </PageWrapper>
  );
};

export default ForecastReport;

import React, { useEffect, useState } from 'react';

import { useDispatch } from 'react-redux';

import { hideSpinner, showSpinner } from 'actions';
import { REPORT_INVENTORY_BY_LOCATION } from 'api/urls';
import notification from 'components/Layout/notifications/notification';
import Section from 'components/Layout/v2/Section';
import ActivityCode from 'consts/activityCode';
import { REPORT_URL } from 'consts/applicationUrls';
import NotificationType from 'consts/notificationTypes';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import apiClient from 'utils/apiClient';
import { fetchLocations, fetchProductsCategories } from 'utils/option-utils';
import Select from 'utils/Select';
import Translate from 'utils/Translate';
import HeaderWrapper from 'wrappers/HeaderWrapper';
import PageWrapper from 'wrappers/PageWrapper';

const InventoryByLocationReport = () => {
  useTranslation('inventoryByLocationReport', 'default');

  const dispatch = useDispatch();
  const translate = useTranslate();

  const [locations, setLocations] = useState([]);
  const [categories, setCategories] = useState([]);

  const [selectedLocations, setSelectedLocations] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [includeSubcategories, setIncludeSubcategories] = useState(true);

  const [report, setReport] = useState(null);

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [locationList, categoryList] = await Promise.all([
          fetchLocations({ activityCodes: [ActivityCode.MANAGE_INVENTORY] }),
          fetchProductsCategories(),
        ]);
        setLocations(locationList);
        setCategories(categoryList);
      } catch (error) {
        notification(NotificationType.ERROR)({
          message: translate('react.inventoryByLocationReport.optionsError.label', 'Unable to load filter options'),
        });
      }
    };
    fetchOptions();
  }, []);

  const buildParams = () => {
    const searchParams = new URLSearchParams();
    selectedLocations.forEach((location) => searchParams.append('locations', location.id));
    selectedCategories.forEach((category) => searchParams.append('categories', category.id));
    searchParams.append('includeSubcategories', includeSubcategories ? 'true' : 'false');
    return searchParams;
  };

  const runReport = async () => {
    dispatch(showSpinner());
    try {
      const searchParams = buildParams();
      const response = await apiClient.get(`${REPORT_INVENTORY_BY_LOCATION}?${searchParams.toString()}`);
      setReport(response?.data ?? { data: [], locations: [] });
    } catch (error) {
      notification(NotificationType.ERROR)({
        message: translate('react.inventoryByLocationReport.fetchError.label', 'Unable to load inventory by location report'),
      });
    } finally {
      dispatch(hideSpinner());
    }
  };

  const download = () => {
    const searchParams = buildParams();
    searchParams.append('actionButton', 'download');
    window.location.href = `${REPORT_URL.showInventoryByLocationReport()}?${searchParams.toString()}`;
  };

  const reportLocations = report?.locations ?? [];
  const rows = report?.data ?? [];

  return (
    <PageWrapper>
      <HeaderWrapper className="align-items-center h-auto py-3">
        <span className="title">
          <Translate id="react.inventoryByLocationReport.title.label" defaultMessage="Inventory By Location Report" />
        </span>
      </HeaderWrapper>
      <div className="p-3">
        <div className="mb-3">
          <Translate
            id="react.inventoryByLocationReport.instructions.label"
            defaultMessage="In the Inventory by Location report, you find information about the inventory across multiple depot locations. Use this summary and filters to find quantities available in stock of a specific product or group of products in multiple locations."
          />
        </div>
        <div className="d-flex" style={{ gap: '1rem', alignItems: 'flex-start' }}>
          <div style={{ minWidth: '320px', maxWidth: '360px' }}>
            <Section
              title={{ label: 'react.inventoryByLocationReport.parameters.label', defaultMessage: 'Parameters' }}
            >
              <div className="form-group">
                <label htmlFor="locations-select">
                  <Translate id="react.inventoryByLocationReport.locations.label" defaultMessage="Locations" />
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
                  <Translate id="react.inventoryByLocationReport.category.label" defaultMessage="Category" />
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
              <div className="form-check mb-2">
                <label className="form-check-label" htmlFor="include-subcategories-checkbox">
                  <input
                    id="include-subcategories-checkbox"
                    type="checkbox"
                    className="form-check-input"
                    checked={includeSubcategories}
                    onChange={(event) => setIncludeSubcategories(event.target.checked)}
                  />
                  <Translate
                    id="react.inventoryByLocationReport.includeSubcategories.label"
                    defaultMessage="Include all products in all subcategories"
                  />
                </label>
              </div>
              <div className="d-flex" style={{ gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  data-testid="run-report-button"
                  onClick={runReport}
                >
                  <Translate id="react.inventoryByLocationReport.run.label" defaultMessage="Run" />
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={download}
                >
                  <Translate id="react.inventoryByLocationReport.download.label" defaultMessage="Download" />
                </button>
              </div>
            </Section>
          </div>
          <div className="flex-grow-1" style={{ minWidth: 0 }}>
            <Section
              title={{ label: 'react.inventoryByLocationReport.results.label', defaultMessage: 'Inventory By Location Report' }}
            >
              {report === null ? (
                <div className="text-muted">
                  <Translate id="react.inventoryByLocationReport.runPrompt.label" defaultMessage="Run the report to see results" />
                </div>
              ) : (
                <>
                  <div className="pb-2" data-testid="result-count">
                    {`${rows.length} ${translate('react.inventoryByLocationReport.results.count.label', 'results')}`}
                  </div>
                  <div className="table-responsive">
                    <table className="table table-sm" data-testid="inventory-by-location-table">
                      <thead>
                        <tr>
                          <th>{translate('react.inventoryByLocationReport.productCode.label', 'Code')}</th>
                          <th>{translate('react.inventoryByLocationReport.product.label', 'Product')}</th>
                          <th>{translate('react.inventoryByLocationReport.productFamily.label', 'Product Family')}</th>
                          <th>{translate('react.inventoryByLocationReport.categoryColumn.label', 'Category')}</th>
                          <th>{translate('react.inventoryByLocationReport.formularies.label', 'Formularies')}</th>
                          <th>{translate('react.inventoryByLocationReport.tags.label', 'Tags')}</th>
                          {reportLocations.map((location) => (
                            <th key={location.id} className="text-center">
                              {`${translate('react.inventoryByLocationReport.qoh.label', 'QoH')} ${location.name}`}
                            </th>
                          ))}
                          <th className="text-center">{translate('react.inventoryByLocationReport.totalQoh.label', 'QoH Total')}</th>
                          <th className="text-center">{translate('react.inventoryByLocationReport.totalAvailable.label', 'Quantity Available Total')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row) => (
                          <tr key={row.productId}>
                            <td>{row.productCode}</td>
                            <td>{row.productName}</td>
                            <td>{row.productFamily}</td>
                            <td>{row.category}</td>
                            <td>{row.formularies}</td>
                            <td>{row.tags}</td>
                            {reportLocations.map((location) => (
                              <td key={location.id} className="text-center">
                                {row.quantityOnHandByLocation?.[location.id]?.quantityOnHand}
                              </td>
                            ))}
                            <td className="text-center">{row.totalQuantityOnHand}</td>
                            <td className="text-center">{row.totalQuantityAvailableToPromise}</td>
                          </tr>
                        ))}
                        {!rows.length && (
                          <tr>
                            <td colSpan={8 + reportLocations.length} className="text-center text-muted">
                              <Translate id="react.inventoryByLocationReport.noRecords.label" defaultMessage="No records found" />
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </Section>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
};

export default InventoryByLocationReport;

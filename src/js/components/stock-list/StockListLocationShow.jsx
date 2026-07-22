import React, { useEffect, useState } from 'react';

import { useDispatch } from 'react-redux';
import { useParams } from 'react-router-dom';

import { hideSpinner, showSpinner } from 'actions';
import locationApi from 'api/services/LocationApi';
import { INVENTORY_LEVELS_API } from 'api/urls';
import notification from 'components/Layout/notifications/notification';
import Section from 'components/Layout/v2/Section';
import { INVENTORY_ITEM_URL } from 'consts/applicationUrls';
import NotificationType from 'consts/notificationTypes';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import apiClient from 'utils/apiClient';
import Translate from 'utils/Translate';
import HeaderWrapper from 'wrappers/HeaderWrapper';
import PageWrapper from 'wrappers/PageWrapper';

const PAGE_SIZE = 100;

const fetchAllInventoryLevels = async (locationId) => {
  const levels = [];
  let offset = 0;
  let totalCount = 0;
  do {
    // eslint-disable-next-line no-await-in-loop
    const response = await apiClient.get(INVENTORY_LEVELS_API, {
      params: {
        locationId, max: PAGE_SIZE, offset, sort: 'id',
      },
    });
    const page = response?.data?.data ?? [];
    levels.push(...page);
    totalCount = response?.data?.totalCount ?? 0;
    offset += PAGE_SIZE;
    if (page.length < PAGE_SIZE) {
      break;
    }
  } while (levels.length < totalCount);
  return levels;
};

const StockListLocationShow = () => {
  useTranslation('stockListShow', 'default');

  const { locationId } = useParams();
  const dispatch = useDispatch();
  const translate = useTranslate();

  const [location, setLocation] = useState(null);
  const [inventoryLevels, setInventoryLevels] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      dispatch(showSpinner());
      try {
        const [locationResponse, levels] = await Promise.all([
          locationApi.getLocation(locationId),
          fetchAllInventoryLevels(locationId),
        ]);
        const locationData = locationResponse?.data?.data;
        if (!locationData) {
          notification(NotificationType.ERROR)({
            message: translate('react.stockListShow.locationNotFound.label', 'Location not found'),
          });
          return;
        }
        setLocation(locationData);
        setInventoryLevels(levels);
      } catch (error) {
        notification(NotificationType.ERROR)({
          message: translate('react.stockListShow.fetchError.label', 'Unable to load stock list for location'),
        });
      } finally {
        dispatch(hideSpinner());
      }
    };
    fetchData();
  }, [locationId]);

  return (
    <PageWrapper>
      <HeaderWrapper className="align-items-center h-auto py-3">
        <span className="title">
          <Translate id="react.stockListShow.title.label" defaultMessage="Stock list" />
          {location?.name ? ` - ${location.name}` : ''}
        </span>
      </HeaderWrapper>
      <div className="p-3">
        <Section
          title={{ label: 'react.stockListShow.locationSection.label', defaultMessage: 'Location' }}
        >
          <table className="table table-sm w-auto" data-testid="stocklist-location">
            <tbody>
              <tr>
                <td className="font-weight-bold pr-4">
                  <Translate id="react.stockListShow.locationName.label" defaultMessage="Name" />
                </td>
                <td aria-label="Name">{location?.name}</td>
              </tr>
            </tbody>
          </table>
        </Section>
        <Section
          title={{ label: 'react.stockListShow.inventoryLevelsSection.label', defaultMessage: 'Inventory levels' }}
        >
          <div className="pb-2" data-testid="stocklist-item-count">
            {`${inventoryLevels.length} ${translate('react.stockListShow.items.label', 'items')}`}
          </div>
          <table className="table table-sm" data-testid="stocklist-inventory-levels">
            <thead>
              <tr>
                <th>{translate('react.stockListShow.product.label', 'Product')}</th>
                <th>{translate('react.stockListShow.minQuantity.label', 'Min quantity')}</th>
                <th>{translate('react.stockListShow.maxQuantity.label', 'Max quantity')}</th>
                <th>{translate('react.stockListShow.reorderQuantity.label', 'Reorder quantity')}</th>
              </tr>
            </thead>
            <tbody>
              {inventoryLevels.map((inventoryLevel) => (
                <tr key={inventoryLevel.id}>
                  <td>
                    <a href={INVENTORY_ITEM_URL.showStockCard(inventoryLevel.product?.id)}>
                      {inventoryLevel.product?.name}
                    </a>
                  </td>
                  <td>{inventoryLevel.minQuantity}</td>
                  <td>{inventoryLevel.maxQuantity}</td>
                  <td>{inventoryLevel.reorderQuantity}</td>
                </tr>
              ))}
              {!inventoryLevels.length && (
                <tr>
                  <td colSpan={4} className="text-center text-muted">
                    <Translate id="react.stockListShow.noItems.label" defaultMessage="No inventory levels" />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Section>
      </div>
    </PageWrapper>
  );
};

export default StockListLocationShow;

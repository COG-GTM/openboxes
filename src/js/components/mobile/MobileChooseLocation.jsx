import React, { useEffect, useState } from 'react';

import _ from 'lodash';
import { useSelector } from 'react-redux';

import { LOCATION_API } from 'api/urls';
import MobileLayout from 'components/mobile/MobileLayout';
import { DASHBOARD_URL } from 'consts/applicationUrls';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import apiClient from 'utils/apiClient';
import Translate from 'utils/Translate';

const NO_ORGANIZATION = 'NO_ORGANIZATION';

const MobileChooseLocation = () => {
  useTranslation('dashboard', 'default');

  const translate = useTranslate();

  const savedLocationId = useSelector((state) => state.session.savedLocationId);

  const [isLoading, setIsLoading] = useState(true);
  const [locations, setLocations] = useState([]);
  const [locationGroups, setLocationGroups] = useState([]);

  useEffect(() => {
    const params = {
      locationChooser: true,
      applyUserFilter: true,
      locationTypeCode: 'DEPOT',
      activityCodes: 'MANAGE_INVENTORY',
    };
    apiClient.get(LOCATION_API, { params })
      .then((response) => {
        const fetchedLocations = response?.data?.data ?? [];
        const groupedByOrganization = _.groupBy(
          fetchedLocations,
          (location) => _.get(location, 'organizationName') || NO_ORGANIZATION,
        );
        const groups = Object.entries(groupedByOrganization)
          .map(([organization, orgLocations]) => ({
            organization,
            locations: _.sortBy(orgLocations, 'name'),
          }))
          .sort((a, b) => {
            if (a.organization === NO_ORGANIZATION) return 1;
            if (b.organization === NO_ORGANIZATION) return -1;
            return a.organization > b.organization ? 1 : -1;
          });
        setLocations(fetchedLocations);
        setLocationGroups(groups);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const savedLocations = locations.filter((location) => location.id === savedLocationId);

  const chooseLocation = (locationId) => {
    // Full page navigation: the legacy action stores the location in the session
    // and decides where to redirect based on the user's role and activities.
    window.location.href = DASHBOARD_URL.chooseLocation(locationId);
  };

  const renderLocationList = (locationList) => (
    <ul className="list-group list-group-flush">
      {locationList.map((location) => (
        <li key={location.id} className="list-group-item p-0">
          <button
            type="button"
            className="btn btn-link text-left w-100"
            onClick={() => chooseLocation(location.id)}
          >
            <span className="text-truncate">{location.name}</span>
          </button>
        </li>
      ))}
    </ul>
  );

  return (
    <MobileLayout title={translate('react.dashboard.chooseLocation.label', 'Choose Location')}>
      <div data-testid="mobile-choose-location">
        {isLoading
          ? <Translate id="react.default.loading.label" defaultMessage="Loading..." />
          : (
            <>
              <section className="card mb-3" data-testid="saved-locations">
                <div className="card-header font-weight-bold">
                  <Translate id="react.dashboard.savedLocations.label" defaultMessage="Saved locations" />
                </div>
                {renderLocationList(savedLocations)}
              </section>
              {locationGroups.map(({ organization, locations: orgLocations }) => (
                <section key={organization} className="card mb-3">
                  <div className="card-header font-weight-bold">
                    {organization !== NO_ORGANIZATION
                      ? organization
                      : <Translate id="react.dashboard.noOrganization.label" defaultMessage="No organization" />}
                  </div>
                  {renderLocationList(orgLocations)}
                </section>
              ))}
            </>
          )}
      </div>
    </MobileLayout>
  );
};

export default MobileChooseLocation;

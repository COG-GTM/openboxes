import React, { useEffect, useState } from 'react';

import moment from 'moment';
import { RiLogoutBoxRLine, RiMapPinLine } from 'react-icons/ri';
import { useLocation } from 'react-router-dom';
import {
  Tab, TabList, TabPanel, Tabs,
} from 'react-tabs';

import loginLocationsApi from 'api/services/LoginLocationsApi';
import Spinner from 'components/spinner/Spinner';
import { AUTH_URL, CHOOSE_LOCATION_URL } from 'consts/applicationUrls';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';

import './ChooseLocationPage.scss';

const NO_GROUP = 'NO_GROUP';

const locationColorStyle = (backgroundColor) => {
  if (!backgroundColor) return { '--location-color': 'unset' };
  const normalizedColor = backgroundColor.replace('#', '').toUpperCase();
  if (['FFFFFF', 'FFFF'].includes(normalizedColor)) return { '--location-color': 'unset' };
  return { '--location-color': `#${normalizedColor}` };
};

const groupByLocationGroup = (locations) => {
  const groups = locations.reduce((acc, location) => {
    const group = location.locationGroup || NO_GROUP;
    return { ...acc, [group]: [...(acc[group] || []), location] };
  }, {});
  return Object.entries(groups)
    .map(([group, groupLocations]) => ({ group, locations: groupLocations }))
    .sort((a, b) => {
      if (a.group === NO_GROUP) return 1;
      if (b.group === NO_GROUP) return -1;
      return a.group > b.group ? 1 : -1;
    });
};

const ChooseLocationPage = () => {
  useTranslation('dashboard', 'default');

  const [isLoading, setIsLoading] = useState(true);
  const [loginLocations, setLoginLocations] = useState([]);
  const [savedLocations, setSavedLocations] = useState([]);
  const [user, setUser] = useState(null);

  const { search } = useLocation();
  const searchParams = new URLSearchParams(search);
  const targetUri = searchParams.get('targetUri');
  const flashMessage = searchParams.get('message');

  useEffect(() => {
    loginLocationsApi.getLoginLocations()
      .then((response) => {
        const { data } = response.data;
        // data.loginLocations is a map of organization name -> locations,
        // already sorted by organization name (null last) by the API
        setLoginLocations(Object.entries(data.loginLocations || {})
          .map(([organization, locations]) => ({
            organization,
            groups: groupByLocationGroup(locations),
          })));
        setSavedLocations(data.savedLocations || []);
        setUser(data.user);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const renderLocationLink = (location) => (
    <a
      key={`${location.id}-location`}
      href={CHOOSE_LOCATION_URL.select(location.id, targetUri)}
      className="location-chooser__location-button"
      style={locationColorStyle(location.backgroundColor)}
    >
      <RiMapPinLine className="location-chooser__location-button__icon" />
      <span className="location-chooser__location-button__title">
        {location.name}
      </span>
    </a>
  );

  const renderGroupedLocations = ({ group, locations }) => (
    <div
      key={`${group}-group`}
      className="location-chooser__page__group d-flex flex-column mb-4"
    >
      <h3 className="location-chooser__page__group-title mb-3">
        {group !== NO_GROUP
          ? group
          : (
            <Translate
              id="react.dashboard.noLocationGroup.label"
              defaultMessage="No location group"
            />
          )}
      </h3>
      <div className="d-flex flex-wrap flex-row location-chooser__page__group-container">
        {locations.map(renderLocationLink)}
      </div>
    </div>
  );

  const renderOrganizationTabs = () => (
    <Tabs className="react-tabs">
      <TabList data-testid="location-organization-list" className="react-tabs__tab-list m-0 list-unstyled scrollbar">
        {savedLocations.length > 0 && (
          <Tab className="react-tabs__tab border-0 rounded-0 px-3 py-2">
            <Translate id="react.dashboard.savedLocations.label" defaultMessage="Saved Locations" />
          </Tab>
        )}
        {loginLocations.map(({ organization }) => (
          <Tab
            key={`${organization}-org-tab`}
            className="react-tabs__tab border-0 rounded-0 px-3 py-2"
          >
            {organization !== 'null'
              ? organization
              : (
                <Translate
                  id="react.dashboard.noOrganization.label"
                  defaultMessage="No organization"
                />
              )}
          </Tab>
        ))}
      </TabList>
      <div>
        {savedLocations.length > 0 && (
          <TabPanel data-testid="location-list" className="react-tabs__tab-panel scrollbar w-100">
            {renderGroupedLocations({ group: NO_GROUP, locations: savedLocations })}
          </TabPanel>
        )}
        {loginLocations.map(({ organization, groups }) => (
          <TabPanel
            data-testid="location-list"
            className="react-tabs__tab-panel scrollbar w-100"
            key={`${organization}-org-panel`}
          >
            {groups.map(renderGroupedLocations)}
          </TabPanel>
        ))}
      </div>
    </Tabs>
  );

  const renderContent = () => {
    if (isLoading) {
      return <Spinner />;
    }
    if (!loginLocations.length) {
      return (
        <div className="error text-center w-100" role="alert">
          <Translate id="react.dashboard.noWarehouse.message" defaultMessage="No locations available" />
        </div>
      );
    }
    return renderOrganizationTabs();
  };

  return (
    <div className="d-flex justify-content-center align-items-center location-chooser__page-wrapper">
      <div className="location-chooser location-chooser__page" data-testid="location-chooser-modal">
        <div className="location-chooser__page__header">
          <h2>
            <Translate id="react.dashboard.chooseLocation.label" defaultMessage="Choose Location" />
          </h2>
        </div>
        {flashMessage && (
          <div className="message" role="status" aria-label="message">
            {flashMessage}
          </div>
        )}
        <section className="location-chooser__page__content d-flex justify-content-center">
          {renderContent()}
        </section>
        <div className="d-flex justify-content-between location-chooser__page__footer">
          <div className="d-flex align-items-center justify-content-center location-chooser__page__footer__last-signin">
            {user?.lastLoginDate && (
              <>
                <Translate id="react.dashboard.lastSignIn.label" defaultMessage="Your last sign-in occurred" />
                &nbsp;
                <span title={moment(user.lastLoginDate).format('MMM DD YYYY hh:mm:ss A')}>
                  {moment(user.lastLoginDate).fromNow()}
                </span>
              </>
            )}
          </div>
          <div className="d-flex justify-content-center align-items-center">
            {user && (
              <span className="mr-2 location-chooser__page__footer__logout-user">
                <Translate id="react.dashboard.loggedInAs.label" defaultMessage="Logged in as" />
                {' '}
                {user.name}
                .
              </span>
            )}
            <a className="location-chooser__page__footer__logout-btn" href={AUTH_URL.logout()}>
              <RiLogoutBoxRLine />
              {' '}
              <Translate id="react.default.logout.label" defaultMessage="Logout" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChooseLocationPage;

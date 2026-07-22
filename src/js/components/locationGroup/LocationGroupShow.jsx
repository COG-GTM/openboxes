import React, { useEffect, useState } from 'react';

import { confirmAlert } from 'react-confirm-alert';
import { useDispatch } from 'react-redux';
import { useHistory, useParams } from 'react-router-dom';

import { hideSpinner, showSpinner } from 'actions';
import locationGroupApi from 'api/services/LocationGroupApi';
import Button from 'components/form-elements/Button';
import notification from 'components/Layout/notifications/notification';
import Section from 'components/Layout/v2/Section';
import { LOCATION_GROUP_URL } from 'consts/applicationUrls';
import NotificationType from 'consts/notificationTypes';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';
import HeaderWrapper from 'wrappers/HeaderWrapper';
import PageWrapper from 'wrappers/PageWrapper';

const LocationGroupShow = () => {
  useTranslation('locationGroup', 'default');

  const { locationGroupId } = useParams();
  const history = useHistory();
  const dispatch = useDispatch();
  const translate = useTranslate();

  const [locationGroup, setLocationGroup] = useState(null);

  useEffect(() => {
    locationGroupApi.getLocationGroupDetails(locationGroupId)
      .then((response) => setLocationGroup(response?.data?.data));
  }, [locationGroupId]);

  const deleteLocationGroup = async () => {
    dispatch(showSpinner());
    try {
      const { status } = await locationGroupApi.deleteLocationGroup(locationGroupId);
      if (status === 204) {
        notification(NotificationType.SUCCESS)({
          message: translate('react.locationGroup.delete.success.label', 'Location group has been deleted successfully'),
        });
        history.push(LOCATION_GROUP_URL.list());
      }
    } finally {
      dispatch(hideSpinner());
    }
  };

  const onDelete = () => {
    confirmAlert({
      title: translate('react.default.areYouSure.label', 'Are you sure?'),
      message: translate(
        'react.locationGroup.delete.confirm.label',
        'Are you sure you want to delete this location group?',
      ),
      buttons: [
        {
          label: translate('react.default.yes.label', 'Yes'),
          onClick: deleteLocationGroup,
        },
        {
          label: translate('react.default.no.label', 'No'),
        },
      ],
    });
  };

  return (
    <PageWrapper>
      <HeaderWrapper className="align-items-center h-auto py-3">
        <span className="title">
          <Translate id="react.locationGroup.show.label" defaultMessage="Location Group" />
          {locationGroup?.name ? `: ${locationGroup.name}` : ''}
        </span>
      </HeaderWrapper>
      <div className="p-3">
        <Section
          title={{ label: 'react.locationGroup.detailsSection.label', defaultMessage: 'Location Group Details' }}
        >
          <table className="table table-sm w-auto" data-testid="location-group-details">
            <tbody>
              <tr>
                <td className="font-weight-bold pr-4">
                  <Translate id="react.locationGroup.name.label" defaultMessage="Name" />
                </td>
                <td aria-label="Name">{locationGroup?.name}</td>
              </tr>
              <tr>
                <td className="font-weight-bold pr-4 align-top">
                  <Translate id="react.locationGroup.locations.label" defaultMessage="Locations" />
                </td>
                <td aria-label="Locations">
                  <ul className="list-unstyled mb-0" data-testid="location-group-locations">
                    {(locationGroup?.locations ?? []).map((location) => (
                      <li key={location.id}>{location.name}</li>
                    ))}
                  </ul>
                </td>
              </tr>
            </tbody>
          </table>
          <div className="d-flex gap-8 pt-3">
            <Button
              defaultLabel="Edit"
              label="react.default.button.edit.label"
              variant="primary"
              onClick={() => history.push(LOCATION_GROUP_URL.edit(locationGroupId))}
            />
            <Button
              defaultLabel="Delete"
              label="react.default.button.delete.label"
              variant="danger-outline"
              onClick={onDelete}
            />
            <Button
              defaultLabel="Cancel"
              label="react.default.button.cancel.label"
              variant="primary-outline"
              onClick={() => history.push(LOCATION_GROUP_URL.list())}
            />
          </div>
        </Section>
      </div>
    </PageWrapper>
  );
};

export default LocationGroupShow;

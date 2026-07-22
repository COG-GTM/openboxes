import React, { useEffect, useState } from 'react';

import { confirmAlert } from 'react-confirm-alert';
import { useDispatch } from 'react-redux';
import { useHistory, useParams } from 'react-router-dom';

import { hideSpinner, showSpinner } from 'actions';
import locationTypeApi from 'api/services/LocationTypeApi';
import Button from 'components/form-elements/Button';
import notification from 'components/Layout/notifications/notification';
import Section from 'components/Layout/v2/Section';
import { LOCATION_TYPE_URL } from 'consts/applicationUrls';
import NotificationType from 'consts/notificationTypes';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';
import HeaderWrapper from 'wrappers/HeaderWrapper';
import PageWrapper from 'wrappers/PageWrapper';

const formatDate = (value) => (value ? new Date(value).toLocaleString() : '');

const LocationTypeShow = () => {
  useTranslation('locationType', 'default');

  const { locationTypeId } = useParams();
  const history = useHistory();
  const dispatch = useDispatch();
  const translate = useTranslate();

  const [locationType, setLocationType] = useState(null);

  useEffect(() => {
    locationTypeApi.getLocationType(locationTypeId)
      .then((response) => setLocationType(response?.data?.data));
  }, [locationTypeId]);

  const deleteLocationType = async () => {
    dispatch(showSpinner());
    try {
      const { status } = await locationTypeApi.deleteLocationType(locationTypeId);
      if (status === 204) {
        notification(NotificationType.SUCCESS)({
          message: translate('react.locationType.delete.success.label', 'Location type has been deleted successfully'),
        });
        history.push(LOCATION_TYPE_URL.list());
      }
    } finally {
      dispatch(hideSpinner());
    }
  };

  const onDelete = () => {
    confirmAlert({
      title: translate('react.default.areYouSure.label', 'Are you sure?'),
      message: translate(
        'react.locationType.delete.confirm.label',
        'Are you sure you want to delete this location type?',
      ),
      buttons: [
        {
          label: translate('react.default.yes.label', 'Yes'),
          onClick: deleteLocationType,
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
          <Translate id="react.locationType.show.label" defaultMessage="Location Type" />
          {locationType?.name ? `: ${locationType.name}` : ''}
        </span>
      </HeaderWrapper>
      <div className="p-3">
        <Section
          title={{ label: 'react.locationType.detailsSection.label', defaultMessage: 'Location Type Details' }}
        >
          <table className="table table-sm w-auto" data-testid="location-type-details">
            <tbody>
              <tr>
                <td className="font-weight-bold pr-4">
                  <Translate id="react.locationType.id.label" defaultMessage="Id" />
                </td>
                <td aria-label="Id">{locationType?.id}</td>
              </tr>
              <tr>
                <td className="font-weight-bold pr-4">
                  <Translate id="react.locationType.name.label" defaultMessage="Name" />
                </td>
                <td aria-label="Name">{locationType?.name}</td>
              </tr>
              <tr>
                <td className="font-weight-bold pr-4">
                  <Translate id="react.locationType.description.label" defaultMessage="Description" />
                </td>
                <td aria-label="Description">{locationType?.description}</td>
              </tr>
              <tr>
                <td className="font-weight-bold pr-4">
                  <Translate id="react.locationType.sortOrder.label" defaultMessage="Sort Order" />
                </td>
                <td aria-label="Sort Order">{locationType?.sortOrder}</td>
              </tr>
              <tr>
                <td className="font-weight-bold pr-4">
                  <Translate id="react.locationType.dateCreated.label" defaultMessage="Date Created" />
                </td>
                <td aria-label="Date Created">{formatDate(locationType?.dateCreated)}</td>
              </tr>
              <tr>
                <td className="font-weight-bold pr-4">
                  <Translate id="react.locationType.lastUpdated.label" defaultMessage="Last Updated" />
                </td>
                <td aria-label="Last Updated">{formatDate(locationType?.lastUpdated)}</td>
              </tr>
              <tr>
                <td className="font-weight-bold pr-4 align-top">
                  <Translate id="react.locationType.supportedActivities.label" defaultMessage="Supported Activities" />
                </td>
                <td aria-label="Supported Activities">
                  <ul className="list-unstyled mb-0" data-testid="location-type-supported-activities">
                    {(locationType?.supportedActivities ?? []).map((activity) => (
                      <li key={activity}>{activity}</li>
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
              onClick={() => history.push(LOCATION_TYPE_URL.edit(locationTypeId))}
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
              onClick={() => history.push(LOCATION_TYPE_URL.list())}
            />
          </div>
        </Section>
      </div>
    </PageWrapper>
  );
};

export default LocationTypeShow;

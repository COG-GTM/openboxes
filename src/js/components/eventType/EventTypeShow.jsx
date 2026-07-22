import React, { useEffect, useState } from 'react';

import { confirmAlert } from 'react-confirm-alert';
import { useDispatch } from 'react-redux';
import { useHistory, useParams } from 'react-router-dom';

import { hideSpinner, showSpinner } from 'actions';
import eventTypeApi from 'api/services/EventTypeApi';
import Button from 'components/form-elements/Button';
import notification from 'components/Layout/notifications/notification';
import Section from 'components/Layout/v2/Section';
import { EVENT_TYPE_URL } from 'consts/applicationUrls';
import NotificationType from 'consts/notificationTypes';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';
import HeaderWrapper from 'wrappers/HeaderWrapper';
import PageWrapper from 'wrappers/PageWrapper';

const formatDate = (value) => (value ? new Date(value).toLocaleString() : '');

const EventTypeShow = () => {
  useTranslation('eventType', 'default');

  const { eventTypeId } = useParams();
  const history = useHistory();
  const dispatch = useDispatch();
  const translate = useTranslate();

  const [eventType, setEventType] = useState(null);

  useEffect(() => {
    eventTypeApi.getEventType(eventTypeId)
      .then((response) => setEventType(response?.data?.data));
  }, [eventTypeId]);

  const deleteEventType = async () => {
    dispatch(showSpinner());
    try {
      const { status } = await eventTypeApi.deleteEventType(eventTypeId);
      if (status === 204) {
        notification(NotificationType.SUCCESS)({
          message: translate('react.eventType.delete.success.label', 'Event type has been deleted successfully'),
        });
        history.push(EVENT_TYPE_URL.list());
      }
    } finally {
      dispatch(hideSpinner());
    }
  };

  const onDelete = () => {
    confirmAlert({
      title: translate('react.default.areYouSure.label', 'Are you sure?'),
      message: translate(
        'react.eventType.delete.confirm.label',
        'Are you sure you want to delete this event type?',
      ),
      buttons: [
        {
          label: translate('react.default.yes.label', 'Yes'),
          onClick: deleteEventType,
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
          <Translate id="react.eventType.show.label" defaultMessage="Event Type" />
          {eventType?.name ? `: ${eventType.name}` : ''}
        </span>
      </HeaderWrapper>
      <div className="p-3">
        <Section
          title={{ label: 'react.eventType.detailsSection.label', defaultMessage: 'Event Type Details' }}
        >
          <table className="table table-sm w-auto" data-testid="event-type-details">
            <tbody>
              <tr>
                <td className="font-weight-bold pr-4">
                  <Translate id="react.eventType.id.label" defaultMessage="Id" />
                </td>
                <td aria-label="Id">{eventType?.id}</td>
              </tr>
              <tr>
                <td className="font-weight-bold pr-4">
                  <Translate id="react.eventType.name.label" defaultMessage="Name" />
                </td>
                <td aria-label="Name">{eventType?.name}</td>
              </tr>
              <tr>
                <td className="font-weight-bold pr-4">
                  <Translate id="react.eventType.description.label" defaultMessage="Description" />
                </td>
                <td aria-label="Description">{eventType?.description}</td>
              </tr>
              <tr>
                <td className="font-weight-bold pr-4">
                  <Translate id="react.eventType.sortOrder.label" defaultMessage="Sort Order" />
                </td>
                <td aria-label="Sort Order">{eventType?.sortOrder}</td>
              </tr>
              <tr>
                <td className="font-weight-bold pr-4">
                  <Translate id="react.eventType.eventCode.label" defaultMessage="Event Status" />
                </td>
                <td aria-label="Event Status">{eventType?.eventCode}</td>
              </tr>
              <tr>
                <td className="font-weight-bold pr-4">
                  <Translate id="react.eventType.active.label" defaultMessage="Active" />
                </td>
                <td aria-label="Active">
                  {eventType == null ? '' : translate(
                    eventType.active ? 'react.default.yes.label' : 'react.default.no.label',
                    eventType.active ? 'Yes' : 'No',
                  )}
                </td>
              </tr>
              <tr>
                <td className="font-weight-bold pr-4">
                  <Translate id="react.eventType.optionValue.label" defaultMessage="Option Value" />
                </td>
                <td aria-label="Option Value">{eventType?.optionValue}</td>
              </tr>
              <tr>
                <td className="font-weight-bold pr-4">
                  <Translate id="react.eventType.dateCreated.label" defaultMessage="Date Created" />
                </td>
                <td aria-label="Date Created">{formatDate(eventType?.dateCreated)}</td>
              </tr>
              <tr>
                <td className="font-weight-bold pr-4">
                  <Translate id="react.eventType.lastUpdated.label" defaultMessage="Last Updated" />
                </td>
                <td aria-label="Last Updated">{formatDate(eventType?.lastUpdated)}</td>
              </tr>
            </tbody>
          </table>
          <div className="d-flex gap-8 pt-3">
            <Button
              defaultLabel="Edit"
              label="react.default.button.edit.label"
              variant="primary"
              onClick={() => { window.location.href = EVENT_TYPE_URL.edit(eventTypeId); }}
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
              onClick={() => history.push(EVENT_TYPE_URL.list())}
            />
          </div>
        </Section>
      </div>
    </PageWrapper>
  );
};

export default EventTypeShow;

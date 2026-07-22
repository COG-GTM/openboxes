import React, { useEffect, useState } from 'react';

import { confirmAlert } from 'react-confirm-alert';
import { useDispatch } from 'react-redux';
import { useHistory, useParams } from 'react-router-dom';

import { hideSpinner, showSpinner } from 'actions';
import partyTypeApi from 'api/services/PartyTypeApi';
import Button from 'components/form-elements/Button';
import notification from 'components/Layout/notifications/notification';
import Section from 'components/Layout/v2/Section';
import { PARTY_TYPE_URL } from 'consts/applicationUrls';
import NotificationType from 'consts/notificationTypes';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';
import HeaderWrapper from 'wrappers/HeaderWrapper';
import PageWrapper from 'wrappers/PageWrapper';

const formatDateTime = (value) => (value ? new Date(value).toLocaleString() : '');

const PartyTypeShow = () => {
  useTranslation('partyType', 'default');

  const { partyTypeId } = useParams();
  const history = useHistory();
  const dispatch = useDispatch();
  const translate = useTranslate();

  const [partyType, setPartyType] = useState(null);

  useEffect(() => {
    partyTypeApi.getPartyType(partyTypeId)
      .then((response) => setPartyType(response?.data?.data));
  }, [partyTypeId]);

  const deletePartyType = async () => {
    dispatch(showSpinner());
    try {
      const { status } = await partyTypeApi.deletePartyType(partyTypeId);
      if (status === 204) {
        notification(NotificationType.SUCCESS)({
          message: translate('react.partyType.delete.success.label', 'Party type has been deleted successfully'),
        });
        history.push(PARTY_TYPE_URL.list());
      }
    } finally {
      dispatch(hideSpinner());
    }
  };

  const onDelete = () => {
    confirmAlert({
      title: translate('react.default.areYouSure.label', 'Are you sure?'),
      message: translate(
        'react.partyType.delete.confirm.label',
        'Are you sure you want to delete this party type?',
      ),
      buttons: [
        {
          label: translate('react.default.yes.label', 'Yes'),
          onClick: deletePartyType,
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
          <Translate id="react.partyType.show.label" defaultMessage="Party Type" />
          {partyType?.name ? `: ${partyType.name}` : ''}
        </span>
      </HeaderWrapper>
      <div className="p-3">
        <Section
          title={{ label: 'react.partyType.detailsSection.label', defaultMessage: 'Party Type Details' }}
        >
          <table className="table table-sm w-auto" data-testid="party-type-details">
            <tbody>
              <tr>
                <td className="font-weight-bold pr-4">
                  <Translate id="react.partyType.id.label" defaultMessage="Id" />
                </td>
                <td aria-label="Id">{partyType?.id}</td>
              </tr>
              <tr>
                <td className="font-weight-bold pr-4">
                  <Translate id="react.partyType.name.label" defaultMessage="Name" />
                </td>
                <td aria-label="Name">{partyType?.name}</td>
              </tr>
              <tr>
                <td className="font-weight-bold pr-4">
                  <Translate id="react.partyType.description.label" defaultMessage="Description" />
                </td>
                <td aria-label="Description">{partyType?.description}</td>
              </tr>
              <tr>
                <td className="font-weight-bold pr-4">
                  <Translate id="react.partyType.dateCreated.label" defaultMessage="Date Created" />
                </td>
                <td aria-label="Date Created">{formatDateTime(partyType?.dateCreated)}</td>
              </tr>
              <tr>
                <td className="font-weight-bold pr-4">
                  <Translate id="react.partyType.lastUpdated.label" defaultMessage="Last Updated" />
                </td>
                <td aria-label="Last Updated">{formatDateTime(partyType?.lastUpdated)}</td>
              </tr>
              <tr>
                <td className="font-weight-bold pr-4">
                  <Translate id="react.partyType.partyTypeCode.label" defaultMessage="Party Type Code" />
                </td>
                <td aria-label="Party Type Code">{partyType?.partyTypeCode}</td>
              </tr>
            </tbody>
          </table>
          <div className="d-flex gap-8 pt-3">
            <Button
              defaultLabel="Edit"
              label="react.default.button.edit.label"
              variant="primary"
              onClick={() => history.push(PARTY_TYPE_URL.edit(partyTypeId))}
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
              onClick={() => history.push(PARTY_TYPE_URL.list())}
            />
          </div>
        </Section>
      </div>
    </PageWrapper>
  );
};

export default PartyTypeShow;

import React, { useEffect, useState } from 'react';

import { confirmAlert } from 'react-confirm-alert';
import { useDispatch } from 'react-redux';
import { useHistory, useParams } from 'react-router-dom';

import { hideSpinner, showSpinner } from 'actions';
import partyApi from 'api/services/PartyApi';
import Button from 'components/form-elements/Button';
import notification from 'components/Layout/notifications/notification';
import Section from 'components/Layout/v2/Section';
import { PARTY_ROLE_URL, PARTY_URL } from 'consts/applicationUrls';
import NotificationType from 'consts/notificationTypes';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';
import HeaderWrapper from 'wrappers/HeaderWrapper';
import PageWrapper from 'wrappers/PageWrapper';

const formatDateTime = (value) => (value ? new Date(value).toLocaleString() : '');

const PartyRoleShow = () => {
  useTranslation('partyRole', 'default');

  const { partyRoleId } = useParams();
  const history = useHistory();
  const dispatch = useDispatch();
  const translate = useTranslate();

  const [partyRole, setPartyRole] = useState(null);

  useEffect(() => {
    partyApi.getPartyRoleDetails(partyRoleId)
      .then((response) => setPartyRole(response?.data?.data));
  }, [partyRoleId]);

  const deletePartyRole = async () => {
    dispatch(showSpinner());
    try {
      const { status } = await partyApi.deletePartyRole(partyRoleId);
      if (status === 204) {
        notification(NotificationType.SUCCESS)({
          message: translate('react.partyRole.delete.success.label', 'Party role has been deleted successfully'),
        });
        history.push(PARTY_ROLE_URL.list());
      }
    } finally {
      dispatch(hideSpinner());
    }
  };

  const onDelete = () => {
    confirmAlert({
      title: translate('react.default.areYouSure.label', 'Are you sure?'),
      message: translate(
        'react.partyRole.delete.confirm.label',
        'Are you sure you want to delete this party role?',
      ),
      buttons: [
        {
          label: translate('react.default.yes.label', 'Yes'),
          onClick: deletePartyRole,
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
          <Translate id="react.partyRole.show.label" defaultMessage="Party Role" />
          {partyRole?.roleType ? `: ${partyRole.roleType}` : ''}
        </span>
      </HeaderWrapper>
      <div className="p-3">
        <Section
          title={{ label: 'react.partyRole.detailsSection.label', defaultMessage: 'Party Role Details' }}
        >
          <table className="table table-sm w-auto" data-testid="party-role-details">
            <tbody>
              <tr>
                <td className="font-weight-bold pr-4">
                  <Translate id="react.partyRole.id.label" defaultMessage="Id" />
                </td>
                <td aria-label="Id">{partyRole?.id}</td>
              </tr>
              <tr>
                <td className="font-weight-bold pr-4">
                  <Translate id="react.partyRole.party.label" defaultMessage="Party" />
                </td>
                <td aria-label="Party">
                  {partyRole?.party && (
                    <a href={PARTY_URL.show(partyRole.party.id)}>{partyRole.party.id}</a>
                  )}
                </td>
              </tr>
              <tr>
                <td className="font-weight-bold pr-4">
                  <Translate id="react.partyRole.roleType.label" defaultMessage="Role Type" />
                </td>
                <td aria-label="Role Type">{partyRole?.roleType}</td>
              </tr>
              <tr>
                <td className="font-weight-bold pr-4">
                  <Translate id="react.partyRole.startDate.label" defaultMessage="Start Date" />
                </td>
                <td aria-label="Start Date">{formatDateTime(partyRole?.startDate)}</td>
              </tr>
              <tr>
                <td className="font-weight-bold pr-4">
                  <Translate id="react.partyRole.endDate.label" defaultMessage="End Date" />
                </td>
                <td aria-label="End Date">{formatDateTime(partyRole?.endDate)}</td>
              </tr>
            </tbody>
          </table>
          <div className="d-flex gap-8 pt-3">
            <Button
              defaultLabel="Edit"
              label="react.default.button.edit.label"
              variant="primary"
              onClick={() => history.push(PARTY_ROLE_URL.edit(partyRoleId))}
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
              onClick={() => history.push(PARTY_ROLE_URL.list())}
            />
          </div>
        </Section>
      </div>
    </PageWrapper>
  );
};

export default PartyRoleShow;

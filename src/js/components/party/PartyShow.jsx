import React, { useEffect, useState } from 'react';

import { confirmAlert } from 'react-confirm-alert';
import { useDispatch } from 'react-redux';
import { useHistory, useParams } from 'react-router-dom';

import { hideSpinner, showSpinner } from 'actions';
import partyApi from 'api/services/PartyApi';
import Button from 'components/form-elements/Button';
import notification from 'components/Layout/notifications/notification';
import Section from 'components/Layout/v2/Section';
import { PARTY_ROLE_URL, PARTY_TYPE_URL, PARTY_URL } from 'consts/applicationUrls';
import NotificationType from 'consts/notificationTypes';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';
import HeaderWrapper from 'wrappers/HeaderWrapper';
import PageWrapper from 'wrappers/PageWrapper';

const PartyShow = () => {
  useTranslation('party', 'default');

  const { partyId } = useParams();
  const history = useHistory();
  const dispatch = useDispatch();
  const translate = useTranslate();

  const [party, setParty] = useState(null);

  useEffect(() => {
    partyApi.getPartyDetails(partyId)
      .then((response) => setParty(response?.data?.data));
  }, [partyId]);

  const deleteParty = async () => {
    dispatch(showSpinner());
    try {
      const { status } = await partyApi.deleteParty(partyId);
      if (status === 204) {
        notification(NotificationType.SUCCESS)({
          message: translate('react.party.delete.success.label', 'Party has been deleted successfully'),
        });
        history.push(PARTY_URL.list());
      }
    } finally {
      dispatch(hideSpinner());
    }
  };

  const onDelete = () => {
    confirmAlert({
      title: translate('react.default.areYouSure.label', 'Are you sure?'),
      message: translate(
        'react.party.delete.confirm.label',
        'Are you sure you want to delete this party?',
      ),
      buttons: [
        {
          label: translate('react.default.yes.label', 'Yes'),
          onClick: deleteParty,
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
          <Translate id="react.party.show.label" defaultMessage="Party" />
          {party?.id ? `: ${party.id}` : ''}
        </span>
      </HeaderWrapper>
      <div className="p-3">
        <Section
          title={{ label: 'react.party.detailsSection.label', defaultMessage: 'Party Details' }}
        >
          <table className="table table-sm w-auto" data-testid="party-details">
            <tbody>
              <tr>
                <td className="font-weight-bold pr-4">
                  <Translate id="react.party.id.label" defaultMessage="Id" />
                </td>
                <td aria-label="Id">{party?.id}</td>
              </tr>
              <tr>
                <td className="font-weight-bold pr-4">
                  <Translate id="react.party.partyType.label" defaultMessage="Party Type" />
                </td>
                <td aria-label="Party Type">
                  {party?.partyType && (
                    <a href={PARTY_TYPE_URL.show(party.partyType.id)}>{party.partyType.name}</a>
                  )}
                </td>
              </tr>
              <tr>
                <td className="font-weight-bold pr-4 align-top">
                  <Translate id="react.party.roles.label" defaultMessage="Roles" />
                </td>
                <td aria-label="Roles">
                  <ul className="list-unstyled mb-0" data-testid="party-roles">
                    {(party?.roles ?? []).map((role) => (
                      <li key={role.id}>
                        <a href={PARTY_ROLE_URL.show(role.id)}>{role.name}</a>
                      </li>
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
              onClick={() => history.push(PARTY_URL.edit(partyId))}
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
              onClick={() => history.push(PARTY_URL.list())}
            />
          </div>
        </Section>
      </div>
    </PageWrapper>
  );
};

export default PartyShow;

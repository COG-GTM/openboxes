import React, { useEffect, useState } from 'react';

import { confirmAlert } from 'react-confirm-alert';
import { useDispatch } from 'react-redux';
import { useHistory, useParams } from 'react-router-dom';

import { hideSpinner, showSpinner } from 'actions';
import personApi from 'api/services/PersonApi';
import Button from 'components/form-elements/Button';
import notification from 'components/Layout/notifications/notification';
import Section from 'components/Layout/v2/Section';
import { PERSON_URL } from 'consts/applicationUrls';
import NotificationType from 'consts/notificationTypes';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';
import HeaderWrapper from 'wrappers/HeaderWrapper';
import PageWrapper from 'wrappers/PageWrapper';

const formatDate = (value) => (value ? new Date(value).toLocaleString() : '');

const PersonShow = () => {
  useTranslation('person', 'default');

  const { personId } = useParams();
  const history = useHistory();
  const dispatch = useDispatch();
  const translate = useTranslate();

  const [person, setPerson] = useState(null);

  useEffect(() => {
    personApi.getPersonDetails(personId)
      .then((response) => setPerson(response?.data?.data));
  }, [personId]);

  const deletePerson = async () => {
    dispatch(showSpinner());
    try {
      const { status } = await personApi.deletePerson(personId);
      if (status === 204) {
        notification(NotificationType.SUCCESS)({
          message: translate('react.person.delete.success.label', 'Person has been deleted successfully'),
        });
        history.push(PERSON_URL.list());
      }
    } finally {
      dispatch(hideSpinner());
    }
  };

  const onDelete = () => {
    confirmAlert({
      title: translate('react.default.areYouSure.label', 'Are you sure?'),
      message: translate(
        'react.person.delete.confirm.label',
        'Are you sure you want to delete this person?',
      ),
      buttons: [
        {
          label: translate('react.default.yes.label', 'Yes'),
          onClick: deletePerson,
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
          <Translate id="react.person.show.label" defaultMessage="Person" />
          {person?.name ? `: ${person.name}` : ''}
        </span>
      </HeaderWrapper>
      <div className="p-3">
        <Section
          title={{ label: 'react.person.detailsSection.label', defaultMessage: 'Person Details' }}
        >
          <table className="table table-sm w-auto" data-testid="person-details">
            <tbody>
              <tr>
                <td className="font-weight-bold pr-4">
                  <Translate id="react.person.id.label" defaultMessage="Id" />
                </td>
                <td aria-label="Id">{person?.id}</td>
              </tr>
              <tr>
                <td className="font-weight-bold pr-4">
                  <Translate id="react.person.type.label" defaultMessage="Type" />
                </td>
                <td aria-label="Type">{person?.type}</td>
              </tr>
              <tr>
                <td className="font-weight-bold pr-4">
                  <Translate id="react.person.name.label" defaultMessage="Name" />
                </td>
                <td aria-label="Name">{person?.name}</td>
              </tr>
              <tr>
                <td className="font-weight-bold pr-4">
                  <Translate id="react.person.firstName.label" defaultMessage="First Name" />
                </td>
                <td aria-label="First Name">{person?.firstName}</td>
              </tr>
              <tr>
                <td className="font-weight-bold pr-4">
                  <Translate id="react.person.lastName.label" defaultMessage="Last Name" />
                </td>
                <td aria-label="Last Name">{person?.lastName}</td>
              </tr>
              <tr>
                <td className="font-weight-bold pr-4">
                  <Translate id="react.person.email.label" defaultMessage="Email" />
                </td>
                <td aria-label="Email">{person?.email}</td>
              </tr>
              <tr>
                <td className="font-weight-bold pr-4">
                  <Translate id="react.person.phoneNumber.label" defaultMessage="Phone Number" />
                </td>
                <td aria-label="Phone Number">{person?.phoneNumber}</td>
              </tr>
              <tr>
                <td className="font-weight-bold pr-4">
                  <Translate id="react.person.dateCreated.label" defaultMessage="Date Created" />
                </td>
                <td aria-label="Date Created">{formatDate(person?.dateCreated)}</td>
              </tr>
              <tr>
                <td className="font-weight-bold pr-4">
                  <Translate id="react.person.lastUpdated.label" defaultMessage="Last Updated" />
                </td>
                <td aria-label="Last Updated">{formatDate(person?.lastUpdated)}</td>
              </tr>
            </tbody>
          </table>
          <div className="d-flex gap-8 pt-3">
            <Button
              defaultLabel="Edit"
              label="react.default.button.edit.label"
              variant="primary"
              onClick={() => history.push(PERSON_URL.edit(personId))}
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
              onClick={() => history.push(PERSON_URL.list())}
            />
          </div>
        </Section>
      </div>
    </PageWrapper>
  );
};

export default PersonShow;

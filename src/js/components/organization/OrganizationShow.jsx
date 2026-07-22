import React, { useEffect, useState } from 'react';

import { confirmAlert } from 'react-confirm-alert';
import { useDispatch } from 'react-redux';
import { useHistory, useParams } from 'react-router-dom';

import { hideSpinner, showSpinner } from 'actions';
import organizationApi from 'api/services/OrganizationApi';
import Button from 'components/form-elements/Button';
import notification from 'components/Layout/notifications/notification';
import Section from 'components/Layout/v2/Section';
import { CONTEXT_PATH, ORGANIZATION_URL } from 'consts/applicationUrls';
import NotificationType from 'consts/notificationTypes';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';
import HeaderWrapper from 'wrappers/HeaderWrapper';
import PageWrapper from 'wrappers/PageWrapper';

const formatDate = (value) => (value ? new Date(value).toLocaleString() : '');

const OrganizationShow = () => {
  useTranslation('organization', 'default');

  const { organizationId } = useParams();
  const history = useHistory();
  const dispatch = useDispatch();
  const translate = useTranslate();

  const [organization, setOrganization] = useState(null);

  useEffect(() => {
    organizationApi.getOrganizationDetails(organizationId)
      .then((response) => setOrganization(response?.data?.data));
  }, [organizationId]);

  const deleteOrganization = async () => {
    dispatch(showSpinner());
    try {
      const { status } = await organizationApi.deleteOrganization(organizationId);
      if (status === 204) {
        notification(NotificationType.SUCCESS)({
          message: translate('react.organization.delete.success.label', 'Organization has been deleted successfully'),
        });
        history.push(ORGANIZATION_URL.list());
      }
    } finally {
      dispatch(hideSpinner());
    }
  };

  const onDelete = () => {
    confirmAlert({
      title: translate('react.default.areYouSure.label', 'Are you sure?'),
      message: translate(
        'react.organization.delete.confirm.label',
        'Are you sure you want to delete this organization?',
      ),
      buttons: [
        {
          label: translate('react.default.yes.label', 'Yes'),
          onClick: deleteOrganization,
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
          <Translate id="react.organization.show.label" defaultMessage="Organization" />
          {organization?.name ? `: ${organization.name}` : ''}
        </span>
      </HeaderWrapper>
      <div className="p-3">
        <Section
          title={{ label: 'react.organization.detailsSection.label', defaultMessage: 'Organization Details' }}
        >
          <table className="table table-sm w-auto" data-testid="organization-details">
            <tbody>
              <tr>
                <td className="font-weight-bold pr-4">
                  <Translate id="react.organization.id.label" defaultMessage="Id" />
                </td>
                <td aria-label="Id">{organization?.id}</td>
              </tr>
              <tr>
                <td className="font-weight-bold pr-4">
                  <Translate id="react.organization.partyType.label" defaultMessage="Party Type" />
                </td>
                <td aria-label="Party Type">
                  {organization?.partyType && (
                    <a href={`${CONTEXT_PATH}/partyType/show/${organization.partyType.id}`}>
                      {organization.partyType.name}
                    </a>
                  )}
                </td>
              </tr>
              <tr>
                <td className="font-weight-bold pr-4">
                  <Translate id="react.organization.code.label" defaultMessage="Code" />
                </td>
                <td aria-label="Code">{organization?.code}</td>
              </tr>
              <tr>
                <td className="font-weight-bold pr-4">
                  <Translate id="react.organization.name.label" defaultMessage="Name" />
                </td>
                <td aria-label="Name">{organization?.name}</td>
              </tr>
              <tr>
                <td className="font-weight-bold pr-4">
                  <Translate id="react.organization.description.label" defaultMessage="Description" />
                </td>
                <td aria-label="Description">{organization?.description}</td>
              </tr>
              <tr>
                <td className="font-weight-bold pr-4">
                  <Translate id="react.organization.dateCreated.label" defaultMessage="Date Created" />
                </td>
                <td aria-label="Date Created">{formatDate(organization?.dateCreated)}</td>
              </tr>
              <tr>
                <td className="font-weight-bold pr-4">
                  <Translate id="react.organization.lastUpdated.label" defaultMessage="Last Updated" />
                </td>
                <td aria-label="Last Updated">{formatDate(organization?.lastUpdated)}</td>
              </tr>
              <tr>
                <td className="font-weight-bold pr-4 align-top">
                  <Translate id="react.organization.roles.label" defaultMessage="Roles" />
                </td>
                <td aria-label="Roles">
                  <ul className="list-unstyled mb-0" data-testid="organization-roles">
                    {(organization?.roles ?? []).map((role) => (
                      <li key={role.id}>
                        <a href={`${CONTEXT_PATH}/partyRole/show/${role.id}`}>{role.name}</a>
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
              onClick={() => history.push(ORGANIZATION_URL.edit(organizationId))}
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
              onClick={() => history.push(ORGANIZATION_URL.list())}
            />
          </div>
        </Section>
      </div>
    </PageWrapper>
  );
};

export default OrganizationShow;

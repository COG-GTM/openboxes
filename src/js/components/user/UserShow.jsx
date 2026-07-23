import React, { useEffect, useState } from 'react';

import { useParams } from 'react-router-dom';

import userApi from 'api/services/UserApi';
import Section from 'components/Layout/v2/Section';
import UserDetailsHeader from 'components/user/UserDetailsHeader';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';
import PageWrapper from 'wrappers/PageWrapper';

const formatDate = (value) => (value ? new Date(value).toLocaleString() : '');

const UserShow = () => {
  useTranslation('user', 'default');

  const { userId } = useParams();

  const [user, setUser] = useState(null);

  useEffect(() => {
    userApi.getUser(userId)
      .then((response) => setUser(response?.data?.data));
  }, [userId]);

  const none = (
    <span className="text-muted">
      <Translate id="react.default.none.label" defaultMessage="None" />
    </span>
  );

  return (
    <PageWrapper>
      <UserDetailsHeader user={user} />
      <div className="p-3">
        <Section title={{ label: 'react.user.userSection.label', defaultMessage: 'User' }}>
          <table className="table table-sm w-auto" data-testid="user-details">
            <tbody>
              <tr>
                <td className="font-weight-bold pr-4">
                  <Translate id="react.user.username.label" defaultMessage="Username" />
                </td>
                <td aria-label="Username">{user?.username}</td>
              </tr>
              <tr>
                <td className="font-weight-bold pr-4">
                  <Translate id="react.user.name.label" defaultMessage="Name" />
                </td>
                <td aria-label="Name">{user?.name}</td>
              </tr>
              <tr>
                <td className="font-weight-bold pr-4">
                  <Translate id="react.user.email.label" defaultMessage="Email" />
                </td>
                <td aria-label="Email">{user?.email}</td>
              </tr>
              <tr>
                <td className="font-weight-bold pr-4">
                  <Translate id="react.user.locale.label" defaultMessage="Locale" />
                </td>
                <td aria-label="Locale">{user?.localeDisplayName}</td>
              </tr>
              <tr>
                <td className="font-weight-bold pr-4">
                  <Translate id="react.user.timezone.label" defaultMessage="Timezone" />
                </td>
                <td aria-label="Timezone">{user?.timezone}</td>
              </tr>
              <tr>
                <td className="font-weight-bold pr-4">
                  <Translate id="react.user.roles.label" defaultMessage="Roles" />
                </td>
                <td aria-label="Roles">
                  {user && (user.roles?.length
                    ? user.roles.map((role) => role.description).join(', ')
                    : (
                      <span className="text-muted">
                        <Translate id="react.user.noAccess.label" defaultMessage="No access" />
                      </span>
                    ))}
                </td>
              </tr>
              <tr>
                <td className="font-weight-bold pr-4">
                  <Translate id="react.user.locationRoles.label" defaultMessage="Location Roles" />
                </td>
                <td aria-label="Location Roles">
                  {user && (user.locationRoles?.length
                    ? user.locationRoles
                      .map((locationRole) => `${locationRole.location?.name} [${locationRole.role?.description}]`)
                      .join(', ')
                    : none)}
                </td>
              </tr>
              <tr>
                <td className="font-weight-bold pr-4">
                  <Translate id="react.user.defaultLocation.label" defaultMessage="Default Location" />
                </td>
                <td aria-label="Default Location">
                  {user && (user.warehouse?.name ?? none)}
                </td>
              </tr>
              <tr>
                <td className="font-weight-bold pr-4">
                  <Translate id="react.user.rememberLastLocation.label" defaultMessage="Remember last location" />
                </td>
                <td aria-label="Remember last location">
                  {user && (user.rememberLastLocation ? 'true' : none)}
                </td>
              </tr>
              <tr>
                <td className="font-weight-bold pr-4">
                  <Translate id="react.user.lastLoginDate.label" defaultMessage="Last Login" />
                </td>
                <td aria-label="Last Login">
                  {user && (user.lastLoginDate
                    ? formatDate(user.lastLoginDate)
                    : (
                      <span className="text-muted">
                        <Translate id="react.default.never.label" defaultMessage="Never" />
                      </span>
                    ))}
                </td>
              </tr>
              <tr>
                <td className="font-weight-bold pr-4">
                  <Translate id="react.user.lastUpdated.label" defaultMessage="Last Updated" />
                </td>
                <td aria-label="Last Updated">{formatDate(user?.lastUpdated)}</td>
              </tr>
              <tr>
                <td className="font-weight-bold pr-4">
                  <Translate id="react.user.dateCreated.label" defaultMessage="Date Created" />
                </td>
                <td aria-label="Date Created">{formatDate(user?.dateCreated)}</td>
              </tr>
            </tbody>
          </table>
        </Section>
      </div>
    </PageWrapper>
  );
};

export default UserShow;

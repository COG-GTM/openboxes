import React from 'react';

import PropTypes from 'prop-types';
import { confirmAlert } from 'react-confirm-alert';
import { useSelector } from 'react-redux';
import { useHistory } from 'react-router-dom';

import userApi from 'api/services/UserApi';
import Button from 'components/form-elements/Button';
import notification from 'components/Layout/notifications/notification';
import { USER_URL } from 'consts/applicationUrls';
import ImageUrl from 'consts/imagesUrls';
import NotificationType from 'consts/notificationTypes';
import useTranslate from 'hooks/useTranslate';
import StatusIndicator from 'utils/StatusIndicator';
import HeaderWrapper from 'wrappers/HeaderWrapper';

import 'react-confirm-alert/src/react-confirm-alert.css';

const UserDetailsHeader = ({ user, photoVersion }) => {
  const history = useHistory();
  const translate = useTranslate();
  const isUserAdmin = useSelector((state) => state.session.isUserAdmin);
  const isSuperuser = useSelector((state) => state.session.isSuperuser);

  const deleteUser = async () => {
    try {
      const { status } = await userApi.deleteUser(user.id);
      if (status === 204) {
        notification(NotificationType.SUCCESS)({
          message: translate('react.user.delete.success.label', 'User has been deleted successfully'),
        });
        history.push(USER_URL.list());
      }
    } catch (error) {
      // apiClient's response interceptor already notifies the user
    }
  };

  const onDelete = () => {
    confirmAlert({
      title: translate('react.default.areYouSure.label', 'Are you sure?'),
      message: translate('react.user.delete.confirm.label', 'Are you sure you want to delete this user?'),
      buttons: [
        { label: translate('react.default.yes.label', 'Yes'), onClick: deleteUser },
        { label: translate('react.default.no.label', 'No') },
      ],
    });
  };

  return (
    <HeaderWrapper className="align-items-center h-auto py-3">
      <div className="d-flex flex-column w-100">
        <div className="d-flex align-items-center gap-8" data-testid="user-summary">
          {user && (
            <img
              src={user.hasPhoto || photoVersion > 0
                ? `${USER_URL.viewThumb(user.id)}?v=${photoVersion}`
                : ImageUrl.DEFAULT_USER_AVATAR}
              alt={user.name ?? user.username ?? ''}
              width="24"
              height="24"
              className="rounded"
            />
          )}
          <span className="title">
            {user?.name || user?.username || ''}
          </span>
          {user && (
            <StatusIndicator
              status={user.active
                ? translate('react.user.active.label', 'Active')
                : translate('react.user.inactive.label', 'Inactive')}
              variant={user.active ? 'success' : 'danger'}
            />
          )}
        </div>
        <div className="d-flex flex-wrap gap-8 pt-2">
          <Button
            defaultLabel="List Users"
            label="react.user.listUsers.label"
            variant="primary-outline"
            onClick={() => history.push(USER_URL.list())}
          />
          {isUserAdmin && (
            <a href={USER_URL.create()}>
              <Button
                defaultLabel="Add User"
                label="react.user.addUser.label"
                variant="primary-outline"
              />
            </a>
          )}
          {user && (
            <>
              <Button
                defaultLabel="Show User"
                label="react.user.showUser.label"
                variant="primary-outline"
                onClick={() => history.push(USER_URL.show(user.id))}
              />
              <Button
                defaultLabel="Edit User"
                label="react.user.editUser.label"
                variant="primary-outline"
                onClick={() => history.push(USER_URL.edit(user.id))}
              />
              <a href={USER_URL.changePhoto(user.id)}>
                <Button
                  defaultLabel="Change photo"
                  label="react.user.changePhoto.label"
                  variant="primary-outline"
                />
              </a>
              <a href={USER_URL.toggleActivation(user.id)}>
                <Button
                  defaultLabel={user.active ? 'Deactivate User' : 'Activate User'}
                  label={user.active ? 'react.user.deactivate.label' : 'react.user.activate.label'}
                  variant="primary-outline"
                />
              </a>
              <Button
                defaultLabel="Delete User"
                label="react.user.deleteUser.label"
                variant="danger-outline"
                onClick={onDelete}
              />
              {isSuperuser && user.active && (
                <a href={USER_URL.impersonate(user.id)} target="_blank" rel="noopener noreferrer">
                  <Button
                    defaultLabel="Impersonate User"
                    label="react.user.impersonate.label"
                    variant="primary-outline"
                  />
                </a>
              )}
              {isUserAdmin && (
                <a href={USER_URL.sendTestEmail(user.id)}>
                  <Button
                    defaultLabel="Send test email"
                    label="react.user.sendTestEmail.label"
                    variant="primary-outline"
                  />
                </a>
              )}
            </>
          )}
        </div>
      </div>
    </HeaderWrapper>
  );
};

export default UserDetailsHeader;

UserDetailsHeader.propTypes = {
  user: PropTypes.shape({
    id: PropTypes.string,
    name: PropTypes.string,
    username: PropTypes.string,
    active: PropTypes.bool,
  }),
  photoVersion: PropTypes.number,
};

UserDetailsHeader.defaultProps = {
  user: null,
  photoVersion: 0,
};

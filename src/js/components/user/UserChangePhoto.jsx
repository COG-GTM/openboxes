import React, { useEffect, useState } from 'react';

import { useDispatch } from 'react-redux';
import { useParams } from 'react-router-dom';

import { hideSpinner, showSpinner } from 'actions';
import userApi from 'api/services/UserApi';
import Button from 'components/form-elements/Button';
import notification from 'components/Layout/notifications/notification';
import Section from 'components/Layout/v2/Section';
import { USER_URL } from 'consts/applicationUrls';
import NotificationType from 'consts/notificationTypes';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';
import HeaderWrapper from 'wrappers/HeaderWrapper';
import PageWrapper from 'wrappers/PageWrapper';

const UserChangePhoto = () => {
  useTranslation('user', 'default');

  const { userId } = useParams();
  const dispatch = useDispatch();
  const translate = useTranslate();

  const [user, setUser] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    userApi.getUser(userId)
      .then((response) => setUser(response?.data?.data));
  }, [userId]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!photo) {
      return;
    }
    setErrorMessage(null);
    const formData = new FormData();
    formData.append('photo', photo);
    dispatch(showSpinner());
    try {
      await userApi.uploadPhoto(userId, formData);
      notification(NotificationType.SUCCESS)({
        message: translate('react.user.photo.upload.success.label', 'Photo has been uploaded successfully'),
      });
      window.location.assign(USER_URL.edit(userId));
    } catch (error) {
      setErrorMessage(error?.response?.data?.errorMessage);
    } finally {
      dispatch(hideSpinner());
    }
  };

  return (
    <PageWrapper>
      <HeaderWrapper className="align-items-center h-auto py-3">
        <span className="title">
          <Translate id="react.user.changePhoto.label" defaultMessage="Change photo" />
          {user ? `: ${user.firstName ?? ''} ${user.lastName ?? ''}` : ''}
        </span>
        <div className="d-flex justify-content-end buttons align-items-center gap-8">
          {user && (
            <span className="tag" aria-label="active-status">
              {user.active
                ? <Translate id="react.user.active.label" defaultMessage="Active" />
                : <Translate id="react.user.inactive.label" defaultMessage="Inactive" />}
            </span>
          )}
        </div>
      </HeaderWrapper>
      <form onSubmit={onSubmit} className="p-3">
        <Section
          title={{ label: 'react.user.photoSection.label', defaultMessage: 'Photo' }}
        >
          {user?.hasPhoto && (
            <div className="pb-3">
              <img
                src={USER_URL.viewThumb(userId)}
                alt={translate('react.user.photo.label', 'Photo')}
                width={128}
              />
            </div>
          )}
          {errorMessage && (
            <div className="alert alert-danger" role="alert">{errorMessage}</div>
          )}
          <div className="form-group">
            <label htmlFor="photo">
              <Translate id="react.user.photo.label" defaultMessage="Photo" />
            </label>
            <input
              id="photo"
              className="form-control-file"
              type="file"
              accept="image/png,image/jpeg,image/gif"
              onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
            />
          </div>
          <div className="d-flex gap-8 pt-3">
            <Button
              type="submit"
              defaultLabel="Upload"
              label="react.default.button.upload.label"
              variant="primary"
              disabled={!photo}
            />
            <a href={USER_URL.show(userId)}>
              <Button
                defaultLabel="Cancel"
                label="react.default.button.cancel.label"
                variant="primary-outline"
              />
            </a>
          </div>
        </Section>
      </form>
    </PageWrapper>
  );
};

export default UserChangePhoto;

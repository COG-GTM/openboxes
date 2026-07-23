import React, { useEffect, useRef, useState } from 'react';

import { useHistory, useParams } from 'react-router-dom';

import userApi from 'api/services/UserApi';
import Button from 'components/form-elements/Button';
import notification from 'components/Layout/notifications/notification';
import Section from 'components/Layout/v2/Section';
import UserDetailsHeader from 'components/user/UserDetailsHeader';
import { USER_URL } from 'consts/applicationUrls';
import ImageUrl from 'consts/imagesUrls';
import NotificationType from 'consts/notificationTypes';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';
import PageWrapper from 'wrappers/PageWrapper';

const UserCropPhoto = () => {
  useTranslation('user', 'default');

  const { userId } = useParams();
  const history = useHistory();
  const translate = useTranslate();

  const [user, setUser] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [photoVersion, setPhotoVersion] = useState(0);
  const fileInputRef = useRef(null);

  useEffect(() => {
    userApi.getUser(userId)
      .then((response) => setUser(response?.data?.data));
  }, [userId]);

  const onSubmit = async (event) => {
    event.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      notification(NotificationType.ERROR_OUTLINED)({
        message: translate('react.user.photo.required.label', 'Please choose a photo to upload'),
      });
      return;
    }
    const formData = new FormData();
    formData.append('photo', file);
    setSubmitting(true);
    try {
      await userApi.uploadPhoto(userId, formData);
      notification(NotificationType.SUCCESS)({
        message: translate('react.user.photo.update.success.label', 'Photo has been updated successfully'),
      });
      setPhotoVersion((version) => version + 1);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      // apiClient's response interceptor already notifies the user
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageWrapper>
      <UserDetailsHeader user={user} photoVersion={photoVersion} />
      <div className="p-3">
        <Section title={{ label: 'react.user.changePhoto.label', defaultMessage: 'Change photo' }}>
          <div className="d-flex flex-column gap-8">
            <div className="d-flex align-items-start gap-8">
              <img
                src={user?.hasPhoto || photoVersion > 0
                  ? `${USER_URL.viewThumb(userId)}?v=${photoVersion}`
                  : ImageUrl.DEFAULT_USER_AVATAR}
                alt={translate('react.user.thumbnail.label', 'Thumbnail')}
                data-testid="user-thumbnail"
              />
              <img
                src={user?.hasPhoto || photoVersion > 0
                  ? `${USER_URL.viewPhoto(userId)}?v=${photoVersion}`
                  : ImageUrl.DEFAULT_USER_AVATAR}
                alt={translate('react.user.photo.label', 'Photo')}
                data-testid="user-photo"
                style={{ maxWidth: '400px' }}
              />
            </div>
            <form onSubmit={onSubmit} aria-label="Upload photo">
              <div className="d-flex flex-column gap-8">
                <label htmlFor="photo" className="m-0 font-weight-bold">
                  <Translate id="react.user.photo.label" defaultMessage="Photo" />
                </label>
                <input
                  id="photo"
                  name="photo"
                  type="file"
                  accept="image/png,image/jpeg,image/gif"
                  ref={fileInputRef}
                />
                <div className="d-flex gap-8">
                  <Button
                    type="submit"
                    defaultLabel="Update"
                    label="react.default.button.update.label"
                    variant="primary"
                    disabled={submitting}
                  />
                  <Button
                    defaultLabel="Cancel"
                    label="react.default.button.cancel.label"
                    variant="primary-outline"
                    onClick={() => history.push(USER_URL.show(userId))}
                  />
                </div>
              </div>
            </form>
          </div>
        </Section>
      </div>
    </PageWrapper>
  );
};

export default UserCropPhoto;

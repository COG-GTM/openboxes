import React from 'react';

import { Controller, useForm } from 'react-hook-form';
import { useHistory } from 'react-router-dom';

import tagApi from 'api/services/TagApi';
import Button from 'components/form-elements/Button';
import TextInput from 'components/form-elements/v2/TextInput';
import notification from 'components/Layout/notifications/notification';
import Section from 'components/Layout/v2/Section';
import { TAG_URL } from 'consts/applicationUrls';
import NotificationType from 'consts/notificationTypes';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';
import HeaderWrapper from 'wrappers/HeaderWrapper';
import PageWrapper from 'wrappers/PageWrapper';

const TagCreate = () => {
  useTranslation('tag', 'default');

  const history = useHistory();
  const translate = useTranslate();

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    mode: 'onBlur',
    defaultValues: {
      tag: '',
    },
  });

  const onSubmit = async (values) => {
    let createdId;
    try {
      const response = await tagApi.createTag({ tag: values.tag });
      createdId = response?.data?.data?.id;
    } catch (error) {
      // apiClient's response interceptor already notifies the user
      return;
    }
    notification(NotificationType.SUCCESS)({
      message: translate('react.tag.create.success.label', 'Tag has been created successfully'),
    });
    // The legacy save action redirects to the edit screen
    history.push(TAG_URL.edit(createdId));
  };

  return (
    <PageWrapper>
      <HeaderWrapper className="align-items-center h-auto py-3">
        <span className="title">
          <Translate id="react.tag.create.label" defaultMessage="Create Tag" />
        </span>
      </HeaderWrapper>
      <form onSubmit={handleSubmit(onSubmit)} className="p-3">
        <Section
          title={{ label: 'react.tag.detailsSection.label', defaultMessage: 'Tag Details' }}
        >
          <div className="row">
            <div className="col-lg-4 col-md-6 px-2 pt-2">
              <Controller
                name="tag"
                control={control}
                rules={{
                  required: translate('react.default.error.requiredField.label', 'This field is required'),
                }}
                render={({ field }) => (
                  <TextInput
                    title={{ id: 'react.tag.tag.label', defaultMessage: 'Tag' }}
                    required
                    errorMessage={errors.tag?.message}
                    {...field}
                  />
                )}
              />
            </div>
          </div>
        </Section>
        <div className="d-flex gap-8 pt-3">
          <Button
            type="submit"
            defaultLabel="Create"
            label="react.default.button.create.label"
            variant="primary"
            disabled={isSubmitting}
          />
          <Button
            defaultLabel="Cancel"
            label="react.default.button.cancel.label"
            variant="primary-outline"
            onClick={() => history.push(TAG_URL.list())}
          />
        </div>
      </form>
    </PageWrapper>
  );
};

export default TagCreate;

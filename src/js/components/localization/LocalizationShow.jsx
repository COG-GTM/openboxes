import React, { useEffect, useState } from 'react';

import { confirmAlert } from 'react-confirm-alert';
import { useDispatch } from 'react-redux';
import { useParams } from 'react-router-dom';

import { hideSpinner, showSpinner } from 'actions';
import localizationRecordApi from 'api/services/LocalizationRecordApi';
import Button from 'components/form-elements/Button';
import notification from 'components/Layout/notifications/notification';
import Section from 'components/Layout/v2/Section';
import { LOCALIZATION_URL } from 'consts/applicationUrls';
import NotificationType from 'consts/notificationTypes';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';
import HeaderWrapper from 'wrappers/HeaderWrapper';
import PageWrapper from 'wrappers/PageWrapper';

const formatDateTime = (value) => (value ? new Date(value).toLocaleString() : '');

const LocalizationShow = () => {
  useTranslation('localization', 'default');

  const { localizationId } = useParams();
  const dispatch = useDispatch();
  const translate = useTranslate();

  const [localization, setLocalization] = useState(null);

  useEffect(() => {
    localizationRecordApi.getLocalization(localizationId)
      .then((response) => setLocalization(response?.data?.data));
  }, [localizationId]);

  const deleteLocalization = async () => {
    dispatch(showSpinner());
    try {
      const { status } = await localizationRecordApi.deleteLocalization(localizationId);
      if (status === 204) {
        notification(NotificationType.SUCCESS)({
          message: translate('react.localization.delete.success.label', 'Localization has been deleted successfully'),
        });
        window.location.href = LOCALIZATION_URL.list();
      }
    } finally {
      dispatch(hideSpinner());
    }
  };

  const onDelete = () => {
    confirmAlert({
      title: translate('react.default.areYouSure.label', 'Are you sure?'),
      message: translate(
        'react.localization.delete.confirm.label',
        'Are you sure you want to delete this localization?',
      ),
      buttons: [
        {
          label: translate('react.default.yes.label', 'Yes'),
          onClick: deleteLocalization,
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
          <Translate id="react.localization.show.label" defaultMessage="Localization" />
          {localization?.code ? `: ${localization.code}` : ''}
        </span>
      </HeaderWrapper>
      <div className="p-3">
        <Section
          title={{ label: 'react.localization.detailsSection.label', defaultMessage: 'Localization Details' }}
        >
          <table className="table table-sm w-auto" data-testid="localization-details">
            <tbody>
              <tr>
                <td className="font-weight-bold pr-4">
                  <Translate id="react.localization.id.label" defaultMessage="Id" />
                </td>
                <td aria-label="Id">{localization?.id}</td>
              </tr>
              <tr>
                <td className="font-weight-bold pr-4">
                  <Translate id="react.localization.code.label" defaultMessage="Code" />
                </td>
                <td aria-label="Code">{localization?.code}</td>
              </tr>
              <tr>
                <td className="font-weight-bold pr-4">
                  <Translate id="react.localization.locale.label" defaultMessage="Locale" />
                </td>
                <td aria-label="Locale">{localization?.locale}</td>
              </tr>
              <tr>
                <td className="font-weight-bold pr-4">
                  <Translate id="react.localization.text.label" defaultMessage="Text" />
                </td>
                <td aria-label="Text">{localization?.text}</td>
              </tr>
              <tr>
                <td className="font-weight-bold pr-4">
                  <Translate id="react.localization.dateCreated.label" defaultMessage="Date Created" />
                </td>
                <td aria-label="Date Created">{formatDateTime(localization?.dateCreated)}</td>
              </tr>
              <tr>
                <td className="font-weight-bold pr-4">
                  <Translate id="react.localization.lastUpdated.label" defaultMessage="Last Updated" />
                </td>
                <td aria-label="Last Updated">{formatDateTime(localization?.lastUpdated)}</td>
              </tr>
            </tbody>
          </table>
          <div className="d-flex gap-8 pt-3">
            <Button
              defaultLabel="Edit"
              label="react.default.button.edit.label"
              variant="primary"
              onClick={() => { window.location.href = LOCALIZATION_URL.edit(localizationId); }}
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
              onClick={() => { window.location.href = LOCALIZATION_URL.list(); }}
            />
          </div>
        </Section>
      </div>
    </PageWrapper>
  );
};

export default LocalizationShow;

import React, { useEffect, useState } from 'react';

import { confirmAlert } from 'react-confirm-alert';
import { useDispatch } from 'react-redux';
import { useParams } from 'react-router-dom';

import { hideSpinner, showSpinner } from 'actions';
import roleApi from 'api/services/RoleApi';
import Button from 'components/form-elements/Button';
import notification from 'components/Layout/notifications/notification';
import Section from 'components/Layout/v2/Section';
import { ROLE_URL } from 'consts/applicationUrls';
import NotificationType from 'consts/notificationTypes';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';
import HeaderWrapper from 'wrappers/HeaderWrapper';
import PageWrapper from 'wrappers/PageWrapper';

const RoleShow = () => {
  useTranslation('role', 'default');

  const { roleId } = useParams();
  const dispatch = useDispatch();
  const translate = useTranslate();

  const [role, setRole] = useState(null);

  useEffect(() => {
    roleApi.getRole(roleId)
      .then((response) => setRole(response?.data?.data));
  }, [roleId]);

  const deleteRole = async () => {
    dispatch(showSpinner());
    try {
      const { status } = await roleApi.deleteRole(roleId);
      if (status === 204) {
        notification(NotificationType.SUCCESS)({
          message: translate('react.role.delete.success.label', 'Role has been deleted successfully'),
        });
        window.location.assign(ROLE_URL.list());
      }
    } finally {
      dispatch(hideSpinner());
    }
  };

  const onDelete = () => {
    confirmAlert({
      title: translate('react.default.areYouSure.label', 'Are you sure?'),
      message: translate(
        'react.role.delete.confirm.label',
        'Are you sure you want to delete this role?',
      ),
      buttons: [
        { label: translate('react.default.yes.label', 'Yes'), onClick: deleteRole },
        { label: translate('react.default.no.label', 'No') },
      ],
    });
  };

  const details = [
    { label: 'react.role.name.label', defaultMessage: 'Name', value: role?.name },
    { label: 'react.role.roleType.label', defaultMessage: 'Role Type', value: role?.roleType },
    { label: 'react.role.description.label', defaultMessage: 'Description', value: role?.description },
  ];

  return (
    <PageWrapper>
      <HeaderWrapper className="align-items-center h-auto py-3">
        <span className="title">
          <Translate id="react.role.show.label" defaultMessage="Show Role" />
          {role?.name ? `: ${role.name}` : ''}
        </span>
        <div className="d-flex justify-content-end buttons align-items-center gap-8">
          <a href={ROLE_URL.list()}>
            <Button
              defaultLabel="Role List"
              label="react.role.list.label"
              variant="primary-outline"
            />
          </a>
          <a href={ROLE_URL.create()}>
            <Button
              defaultLabel="Add Role"
              label="react.role.add.label"
              variant="primary-outline"
            />
          </a>
        </div>
      </HeaderWrapper>
      <div className="p-3">
        <Section
          title={{ label: 'react.role.detailsSection.label', defaultMessage: 'Role Details' }}
        >
          <table className="table table-sm w-auto" data-testid="role-details">
            <tbody>
              {details.map((detail) => (
                <tr key={detail.label}>
                  <td className="font-weight-bold pr-4">
                    <Translate id={detail.label} defaultMessage={detail.defaultMessage} />
                  </td>
                  <td aria-label={detail.defaultMessage}>{detail.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="d-flex gap-8 pt-3">
            <a href={ROLE_URL.edit(roleId)}>
              <Button
                defaultLabel="Edit"
                label="react.default.button.edit.label"
                variant="primary"
              />
            </a>
            <Button
              defaultLabel="Delete"
              label="react.default.button.delete.label"
              variant="danger-outline"
              onClick={onDelete}
            />
          </div>
        </Section>
      </div>
    </PageWrapper>
  );
};

export default RoleShow;

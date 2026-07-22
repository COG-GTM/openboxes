import React, { useEffect, useState } from 'react';

import { confirmAlert } from 'react-confirm-alert';
import { useHistory, useParams } from 'react-router-dom';
import Alert from 'react-s-alert';

import attributeApi from 'api/services/AttributeApi';
import Button from 'components/form-elements/Button';
import { ATTRIBUTE_URL } from 'consts/applicationUrls';
import RoleType from 'consts/roleType';
import useSpinner from 'hooks/useSpinner';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import useUserHasPermissions from 'hooks/useUserHasPermissions';
import Translate from 'utils/Translate';
import PageWrapper from 'wrappers/PageWrapper';

import './styles.scss';

const AttributeShow = () => {
  useTranslation('attribute', 'default');
  const history = useHistory();
  const { id } = useParams();
  const spinner = useSpinner();
  const translate = useTranslate();
  const isAdmin = useUserHasPermissions({ minRequiredRole: RoleType.ROLE_ADMIN });

  const [attribute, setAttribute] = useState(null);

  useEffect(() => {
    (async () => {
      spinner.show();
      try {
        const { data } = await attributeApi.getAttribute(id);
        setAttribute(data);
      } catch (error) {
        // Like the legacy show action: not-found redirects back to the list.
        Alert.error(error.response?.data?.errorMessage
          ?? translate('react.attribute.notFound.message', 'Attribute not found'));
        history.push(ATTRIBUTE_URL.list());
      } finally {
        spinner.hide();
      }
    })();
  }, [id]);

  const onDelete = () => {
    confirmAlert({
      title: translate('react.default.areYouSure.label', 'Are you sure?'),
      message: translate('react.attribute.delete.confirm.message', 'Are you sure you want to delete this attribute?'),
      buttons: [
        {
          label: translate('react.default.yes.label', 'Yes'),
          onClick: async () => {
            try {
              await attributeApi.deleteAttribute(id);
              Alert.success(translate('react.attribute.deleted.message', 'Attribute deleted'));
              history.push(ATTRIBUTE_URL.list());
            } catch (error) {
              Alert.error(error.response?.data?.errorMessage ?? 'Unable to delete attribute');
            }
          },
        },
        { label: translate('react.default.no.label', 'No') },
      ],
    });
  };

  if (!attribute) {
    return null;
  }

  const rows = [
    { label: 'react.attribute.id.label', defaultLabel: 'Id', value: attribute.id },
    { label: 'react.attribute.column.name.label', defaultLabel: 'Name', value: attribute.name },
    { label: 'react.attribute.dateCreated.label', defaultLabel: 'Date Created', value: attribute.dateCreated },
    { label: 'react.attribute.lastUpdated.label', defaultLabel: 'Last Updated', value: attribute.lastUpdated },
    { label: 'react.attribute.column.allowOther.label', defaultLabel: 'Allow Free-Text', value: attribute.allowOther ? 'true' : 'false' },
    { label: 'react.attribute.column.options.label', defaultLabel: 'Options', value: attribute.options?.join(', ') },
  ];

  return (
    <PageWrapper>
      <div className="d-flex flex-column attribute-page p-3">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h3 className="mb-0">{attribute.name}</h3>
          <div className="d-flex gap-8">
            <Button
              label="react.attribute.listAttributes.label"
              defaultLabel="List attributes"
              variant="primary-outline"
              onClick={() => history.push(ATTRIBUTE_URL.list())}
            />
            {isAdmin && (
              <Button
                label="react.attribute.addAttribute.label"
                defaultLabel="Add attribute"
                variant="primary"
                onClick={() => history.push(ATTRIBUTE_URL.create())}
              />
            )}
          </div>
        </div>
        <table className="table table-sm attribute-show-table" data-testid="attribute-show-table">
          <tbody>
            {rows.map((row) => (
              <tr key={row.label + row.defaultLabel}>
                <td className="font-weight-bold attribute-show-name">
                  <Translate id={row.label} defaultMessage={row.defaultLabel} />
                </td>
                <td>{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="d-flex gap-8">
          <Button
            label="react.default.button.edit.label"
            defaultLabel="Edit"
            variant="primary"
            onClick={() => history.push(ATTRIBUTE_URL.edit(id))}
          />
          <Button
            label="react.default.button.delete.label"
            defaultLabel="Delete"
            variant="danger"
            onClick={onDelete}
          />
        </div>
      </div>
    </PageWrapper>
  );
};

export default AttributeShow;

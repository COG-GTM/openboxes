import React, { useEffect, useState } from 'react';

import { confirmAlert } from 'react-confirm-alert';
import { useDispatch } from 'react-redux';
import { useParams } from 'react-router-dom';

import { hideSpinner, showSpinner } from 'actions';
import tagApi from 'api/services/TagApi';
import Button from 'components/form-elements/Button';
import notification from 'components/Layout/notifications/notification';
import Section from 'components/Layout/v2/Section';
import { PRODUCT_URL, TAG_URL, USER_URL } from 'consts/applicationUrls';
import NotificationType from 'consts/notificationTypes';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';
import HeaderWrapper from 'wrappers/HeaderWrapper';
import PageWrapper from 'wrappers/PageWrapper';

const formatDate = (value) => (value ? new Date(value).toLocaleString() : '');

const TagShow = () => {
  useTranslation('tag', 'default');

  const { tagId } = useParams();
  const dispatch = useDispatch();
  const translate = useTranslate();

  const [tag, setTag] = useState(null);

  useEffect(() => {
    tagApi.getTag(tagId)
      .then((response) => setTag(response?.data?.data))
      .catch(() => {
        // Unknown/deleted tag: return to the (legacy GSP) tag list, like the
        // legacy show action did.
        notification(NotificationType.ERROR_OUTLINED)({
          message: translate('react.tag.notFound.label', 'Tag not found'),
        });
        window.location.href = TAG_URL.list();
      });
  }, [tagId]);

  const deleteTag = async () => {
    dispatch(showSpinner());
    try {
      const { status } = await tagApi.deleteTag(tagId);
      if (status === 204) {
        notification(NotificationType.SUCCESS)({
          message: translate('react.tag.delete.success.label', 'Tag has been deleted successfully'),
        });
        // The tag list is still a legacy GSP screen, so leave the SPA entirely.
        window.location.href = TAG_URL.list();
      }
    } finally {
      dispatch(hideSpinner());
    }
  };

  const onDelete = () => {
    confirmAlert({
      title: translate('react.default.areYouSure.label', 'Are you sure?'),
      message: translate(
        'react.tag.delete.confirm.label',
        'Are you sure you want to delete this tag?',
      ),
      buttons: [
        {
          label: translate('react.default.yes.label', 'Yes'),
          onClick: deleteTag,
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
          <Translate id="react.tag.show.label" defaultMessage="View Tag" />
          {tag?.tag ? ` - ${tag.tag}` : ''}
        </span>
      </HeaderWrapper>
      <div className="p-3">
        <Section
          title={{ label: 'react.tag.detailsSection.label', defaultMessage: 'Tag Details' }}
        >
          <table className="table table-sm w-auto" data-testid="tag-details">
            <tbody>
              <tr>
                <td className="font-weight-bold pr-4">
                  <Translate id="react.tag.id.label" defaultMessage="Id" />
                </td>
                <td aria-label="Id">{tag?.id}</td>
              </tr>
              <tr>
                <td className="font-weight-bold pr-4">
                  <Translate id="react.tag.tag.label" defaultMessage="Tag" />
                </td>
                <td aria-label="Tag">{tag?.tag}</td>
              </tr>
              <tr>
                <td className="font-weight-bold pr-4">
                  <Translate id="react.tag.updatedBy.label" defaultMessage="Updated By" />
                </td>
                <td aria-label="Updated By">
                  {tag?.updatedBy && (
                    <a href={USER_URL.show(tag.updatedBy.id)}>{tag.updatedBy.name}</a>
                  )}
                </td>
              </tr>
              <tr>
                <td className="font-weight-bold pr-4">
                  <Translate id="react.tag.createdBy.label" defaultMessage="Created By" />
                </td>
                <td aria-label="Created By">
                  {tag?.createdBy && (
                    <a href={USER_URL.show(tag.createdBy.id)}>{tag.createdBy.name}</a>
                  )}
                </td>
              </tr>
              <tr>
                <td className="font-weight-bold pr-4">
                  <Translate id="react.tag.dateCreated.label" defaultMessage="Date Created" />
                </td>
                <td aria-label="Date Created">{formatDate(tag?.dateCreated)}</td>
              </tr>
              <tr>
                <td className="font-weight-bold pr-4">
                  <Translate id="react.tag.lastUpdated.label" defaultMessage="Last Updated" />
                </td>
                <td aria-label="Last Updated">{formatDate(tag?.lastUpdated)}</td>
              </tr>
            </tbody>
          </table>
        </Section>
        <Section
          title={{ label: 'react.tag.productsSection.label', defaultMessage: 'Products' }}
        >
          <ul aria-label="Products" data-testid="tag-products">
            {(tag?.products ?? []).map((product) => (
              <li key={product.id}>
                {product.productCode}
                {' '}
                <a href={PRODUCT_URL.show(product.id)}>
                  {product.name}
                </a>
              </li>
            ))}
          </ul>
        </Section>
        <div className="d-flex gap-8 pt-3">
          <Button
            defaultLabel="Edit"
            label="react.default.button.edit.label"
            variant="primary"
            // The tag edit screen is still a legacy GSP screen,
            // so leave the SPA entirely.
            onClick={() => { window.location.href = TAG_URL.edit(tagId); }}
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
            onClick={() => { window.location.href = TAG_URL.list(); }}
          />
        </div>
      </div>
    </PageWrapper>
  );
};

export default TagShow;

import React, { useCallback, useEffect, useState } from 'react';

import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';

import { hideSpinner, showSpinner } from 'actions';
import stockListApi from 'api/services/StockListApi';
import Button from 'components/form-elements/Button';
import notification from 'components/Layout/notifications/notification';
import Section from 'components/Layout/v2/Section';
import {
  INVENTORY_ITEM_URL,
  REQUISITION_TEMPLATE_URL,
  STOCKLIST_URL,
} from 'consts/applicationUrls';
import NotificationType from 'consts/notificationTypes';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';
import HeaderWrapper from 'wrappers/HeaderWrapper';
import PageWrapper from 'wrappers/PageWrapper';

const formatDate = (value) => (value ? new Date(value).toLocaleString() : '');

const formatCost = (value, currencyCode) => {
  const formatted = (value ?? 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
  return `${formatted} ${currencyCode ?? ''}`.trim();
};

const RequisitionTemplateShow = () => {
  useTranslation('requisitionTemplate', 'default');

  const { requisitionTemplateId } = useParams();
  const dispatch = useDispatch();
  const translate = useTranslate();

  const { isUserAdmin, currencyCode } = useSelector((state) => ({
    isUserAdmin: state.session.isUserAdmin,
    currencyCode: state.session.currencyCode,
  }));

  const [template, setTemplate] = useState(null);

  const fetchTemplate = useCallback(async () => {
    dispatch(showSpinner());
    try {
      const response = await stockListApi.getStockListDetails(requisitionTemplateId);
      setTemplate(response?.data?.data);
    } catch (error) {
      if (error?.response?.status === 404) {
        notification(NotificationType.ERROR)({
          message: translate('react.requisitionTemplate.notFound.label', 'Stock list template not found'),
        });
        window.location.assign(REQUISITION_TEMPLATE_URL.list());
      } else {
        notification(NotificationType.ERROR)({
          message: translate('react.requisitionTemplate.fetchError.label', 'Unable to load stock list template'),
        });
      }
    } finally {
      dispatch(hideSpinner());
    }
  }, [requisitionTemplateId]);

  useEffect(() => {
    fetchTemplate();
  }, [fetchTemplate]);

  const togglePublish = async () => {
    dispatch(showSpinner());
    try {
      if (template?.isPublished) {
        await stockListApi.unpublishStockList(requisitionTemplateId);
      } else {
        await stockListApi.publishStockList(requisitionTemplateId);
      }
      notification(NotificationType.SUCCESS)({
        message: translate('react.requisitionTemplate.updated.label', 'Stock list has been updated'),
      });
      await fetchTemplate();
    } catch (error) {
      notification(NotificationType.ERROR)({
        message: translate('react.requisitionTemplate.updateError.label', 'Unable to update stock list'),
      });
    } finally {
      dispatch(hideSpinner());
    }
  };

  const items = template?.requisitionItems ?? [];
  const hasRoleFinance = Boolean(template?.hasRoleFinance);

  return (
    <PageWrapper>
      <HeaderWrapper className="align-items-center h-auto py-3">
        <div className="d-flex flex-column">
          <span className="title" data-testid="template-name">
            <Translate id="react.requisitionTemplate.show.label" defaultMessage="Stock List Template" />
            {template?.name ? ` - ${template.name}` : ''}
            {' '}
            {template && (
              <span className={`tag ${template.isPublished ? 'tag-alert' : 'tag-danger'}`} data-testid="published-tag">
                {template.isPublished
                  ? translate('react.default.published.label', 'Published')
                  : translate('react.default.draft.label', 'Draft')}
              </span>
            )}
          </span>
          <span className="font-weight-normal" data-testid="template-summary">
            {`${translate('react.requisitionTemplate.origin.label', 'Origin')}: ${template?.origin?.name ?? translate('react.default.none.label', 'None')} | `}
            {`${translate('react.requisitionTemplate.destination.label', 'Destination')}: ${template?.destination?.name ?? translate('react.default.none.label', 'None')} | `}
            {`${translate('react.requisitionTemplate.requisitionItems.label', 'Requested items')}: ${template?.requisitionItemCount ?? items.length}`}
          </span>
        </div>
      </HeaderWrapper>
      <div className="p-3">
        <div className="d-flex flex-wrap gap-8 pb-3">
          <a className="btn btn-outline-primary" href={REQUISITION_TEMPLATE_URL.list()}>
            <Translate id="react.requisitionTemplate.list.label" defaultMessage="List stock lists" />
          </a>
          {isUserAdmin && (
            <>
              <a className="btn btn-outline-primary" href={REQUISITION_TEMPLATE_URL.editHeader(requisitionTemplateId)}>
                <Translate id="react.default.button.edit.label" defaultMessage="Edit" />
              </a>
              <a className="btn btn-outline-primary" href={REQUISITION_TEMPLATE_URL.edit(requisitionTemplateId)}>
                <Translate id="react.default.button.add.label" defaultMessage="Add" />
              </a>
              <a className="btn btn-outline-primary" href={REQUISITION_TEMPLATE_URL.batch(requisitionTemplateId)}>
                <Translate id="react.default.button.import.label" defaultMessage="Import" />
              </a>
              <a className="btn btn-outline-primary" href={REQUISITION_TEMPLATE_URL.export(requisitionTemplateId)}>
                <Translate id="react.default.button.export.label" defaultMessage="Export" />
              </a>
              <Button
                defaultLabel={template?.isPublished ? 'Unpublish' : 'Publish'}
                label={template?.isPublished
                  ? 'react.default.button.unpublish.label'
                  : 'react.default.button.publish.label'}
                variant="primary-outline"
                onClick={togglePublish}
              />
            </>
          )}
          <a className="btn btn-outline-primary" href={REQUISITION_TEMPLATE_URL.sendMail(requisitionTemplateId)}>
            <Translate id="react.default.button.email.label" defaultMessage="Email" />
          </a>
          <a className="btn btn-outline-primary" href={STOCKLIST_URL.html(requisitionTemplateId)} target="_blank" rel="noopener noreferrer">
            <Translate id="react.default.button.preview.label" defaultMessage="Preview" />
          </a>
          <a className="btn btn-outline-primary" href={STOCKLIST_URL.pdf(requisitionTemplateId)}>
            <Translate id="react.default.button.downloadPdf.label" defaultMessage="Download PDF" />
          </a>
          <a className="btn btn-outline-primary" href={STOCKLIST_URL.csv(requisitionTemplateId)}>
            <Translate id="react.default.button.downloadXls.label" defaultMessage="Download XLS" />
          </a>
        </div>
        <div className="d-flex flex-wrap align-items-start">
          <div className="pr-4">
            <Section
              title={{ label: 'react.requisitionTemplate.detailsSection.label', defaultMessage: 'Requisition template' }}
            >
              <table className="table table-sm w-auto" data-testid="template-details">
                <tbody>
                  <tr>
                    <td className="font-weight-bold pr-4">
                      <Translate id="react.requisitionTemplate.name.label" defaultMessage="Name" />
                    </td>
                    <td aria-label="Name">{template?.name}</td>
                  </tr>
                  <tr>
                    <td className="font-weight-bold pr-4">
                      <Translate id="react.requisitionTemplate.origin.label" defaultMessage="Origin" />
                    </td>
                    <td aria-label="Origin">{template?.origin?.name}</td>
                  </tr>
                  <tr>
                    <td className="font-weight-bold pr-4">
                      <Translate id="react.requisitionTemplate.destination.label" defaultMessage="Destination" />
                    </td>
                    <td aria-label="Destination">{template?.destination?.name}</td>
                  </tr>
                  <tr>
                    <td className="font-weight-bold pr-4">
                      <Translate id="react.requisitionTemplate.requestedBy.label" defaultMessage="Manager" />
                    </td>
                    <td aria-label="Manager">{template?.requestedBy?.name}</td>
                  </tr>
                  <tr>
                    <td className="font-weight-bold pr-4">
                      <Translate id="react.requisitionTemplate.replenishmentPeriod.label" defaultMessage="Replenishment period" />
                    </td>
                    <td aria-label="Replenishment period">
                      {template?.replenishmentPeriod
                        ? `${template.replenishmentPeriod} ${translate('react.requisitionTemplate.replenishmentPeriodUnit.label', 'days')}`
                        : translate('react.default.none.label', 'None')}
                    </td>
                  </tr>
                  {hasRoleFinance && (
                    <tr>
                      <td className="font-weight-bold pr-4">
                        <Translate id="react.requisitionTemplate.totalValue.label" defaultMessage="Total value" />
                      </td>
                      <td aria-label="Total value">{formatCost(template?.totalCost, currencyCode)}</td>
                    </tr>
                  )}
                  <tr>
                    <td className="font-weight-bold pr-4">
                      <Translate id="react.requisitionTemplate.sortBy.label" defaultMessage="Sort by" />
                    </td>
                    <td aria-label="Sort by">
                      {template?.sortByCode?.friendlyName ?? translate('react.default.none.label', 'None')}
                    </td>
                  </tr>
                  <tr>
                    <td className="font-weight-bold pr-4">
                      <Translate id="react.default.comments.label" defaultMessage="Comments" />
                    </td>
                    <td aria-label="Comments">
                      {template?.description ?? translate('react.default.none.label', 'None')}
                    </td>
                  </tr>
                </tbody>
              </table>
            </Section>
            <Section
              title={{ label: 'react.requisitionTemplate.auditingSection.label', defaultMessage: 'Auditing' }}
            >
              <table className="table table-sm w-auto" data-testid="template-auditing">
                <tbody>
                  <tr>
                    <td className="font-weight-bold pr-4">
                      <Translate id="react.requisitionTemplate.version.label" defaultMessage="Version" />
                    </td>
                    <td aria-label="Version">{template ? `v${template.version}` : ''}</td>
                  </tr>
                  <tr>
                    <td className="font-weight-bold pr-4">
                      <Translate id="react.requisitionTemplate.published.label" defaultMessage="Published" />
                    </td>
                    <td aria-label="Published">{template ? String(Boolean(template.isPublished)) : ''}</td>
                  </tr>
                  <tr>
                    <td className="font-weight-bold pr-4">
                      <Translate id="react.requisitionTemplate.createdBy.label" defaultMessage="Created by" />
                    </td>
                    <td aria-label="Created by">
                      {template?.createdBy}
                      <div className="text-muted">{formatDate(template?.dateCreated)}</div>
                    </td>
                  </tr>
                  <tr>
                    <td className="font-weight-bold pr-4">
                      <Translate id="react.requisitionTemplate.updatedBy.label" defaultMessage="Updated by" />
                    </td>
                    <td aria-label="Updated by">
                      {template?.updatedBy}
                      <div className="text-muted">{formatDate(template?.lastUpdated)}</div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </Section>
          </div>
          <div className="flex-grow-1">
            <Section
              title={{ label: 'react.requisitionTemplate.itemsSection.label', defaultMessage: 'Stock list items' }}
            >
              <table className="table table-sm" data-testid="template-items">
                <thead>
                  <tr>
                    <th>{translate('react.requisitionTemplate.productCode.label', 'Code')}</th>
                    <th>{translate('react.requisitionTemplate.product.label', 'Product')}</th>
                    <th>{translate('react.requisitionTemplate.category.label', 'Category')}</th>
                    <th>{translate('react.requisitionTemplate.quantity.label', 'Quantity')}</th>
                    <th>{translate('react.requisitionTemplate.unitOfMeasure.label', 'UoM')}</th>
                    {hasRoleFinance && (
                      <>
                        <th>{translate('react.requisitionTemplate.unitCost.label', 'Unit cost')}</th>
                        <th>{translate('react.requisitionTemplate.totalCost.label', 'Total cost')}</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr
                      key={item.id}
                      className={!item.product?.active ? 'text-muted' : ''}
                      title={!item.product?.active
                        ? translate('react.requisitionTemplate.product.inactive.tooltip.label', 'This product has been discontinued. Please remove it from the stock list')
                        : undefined}
                    >
                      <td style={{ color: item.product?.color }}>{item.product?.productCode}</td>
                      <td>
                        <a
                          href={INVENTORY_ITEM_URL.showStockCard(item.product?.id)}
                          style={{ color: item.product?.color }}
                        >
                          {item.product?.name}
                        </a>
                      </td>
                      <td>{item.product?.category}</td>
                      <td>{item.quantity}</td>
                      <td>EA/1</td>
                      {hasRoleFinance && (
                        <>
                          <td>{formatCost(item.unitCost, currencyCode)}</td>
                          <td>{formatCost(item.totalCost, currencyCode)}</td>
                        </>
                      )}
                    </tr>
                  ))}
                  {!items.length && (
                    <tr>
                      <td colSpan={hasRoleFinance ? 7 : 5} className="text-center text-muted">
                        <Translate id="react.requisitionTemplate.noItems.label" defaultMessage="There are no requisition items" />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Section>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
};

export default RequisitionTemplateShow;

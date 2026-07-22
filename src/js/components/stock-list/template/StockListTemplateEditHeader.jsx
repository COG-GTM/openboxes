import React, { useEffect, useState } from 'react';

import { useParams } from 'react-router-dom';
import Alert from 'react-s-alert';

import requisitionTemplateApi from 'api/services/RequisitionTemplateApi';
import StockListTemplateHeaderForm from 'components/stock-list/template/StockListTemplateHeaderForm';
import StockListTemplateSummary from 'components/stock-list/template/StockListTemplateSummary';
import { REQUISITION_TEMPLATE_URL } from 'consts/applicationUrls';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';

const StockListTemplateEditHeader = () => {
  const { templateId } = useParams();
  const [template, setTemplate] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useTranslation('stockListManagement', 'requisition', 'default');

  useEffect(() => {
    requisitionTemplateApi.getTemplate(templateId)
      .then(({ data }) => {
        const fetched = data?.data;
        setTemplate(fetched);
        setForm({
          name: fetched?.name ?? '',
          origin: fetched?.origin ?? null,
          destination: fetched?.destination ?? null,
          requestedBy: fetched?.requestedBy ?? null,
          replenishmentPeriod: fetched?.replenishmentPeriod ?? '',
          replenishmentTypeCode: fetched?.replenishmentTypeCode ?? null,
          sortByCode: fetched?.sortByCode ?? null,
          description: fetched?.description ?? '',
        });
      })
      .catch((err) => {
        setError(err?.response?.data?.errorMessage || 'An error occurred while loading the stock list');
      });
  }, [templateId]);

  const setField = (field, value) => setForm((previous) => ({ ...previous, [field]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await requisitionTemplateApi.updateTemplateHeader(templateId, {
        name: form.name || null,
        originId: form.origin?.id || null,
        destinationId: form.destination?.id || null,
        requestedById: form.requestedBy?.id || null,
        replenishmentPeriod: form.replenishmentPeriod || null,
        replenishmentTypeCode: form.replenishmentTypeCode || null,
        sortByCode: form.sortByCode || null,
        description: form.description || null,
      });
      window.location = REQUISITION_TEMPLATE_URL.edit(templateId);
    } catch (err) {
      const message = err?.response?.data?.errors?.join('; ')
        || err?.response?.data?.errorMessage;
      if (message) {
        Alert.error(message);
      }
      setSaving(false);
    }
  };

  if (error) {
    return <div className="alert alert-danger m-3" role="alert">{error}</div>;
  }

  if (!template) {
    return null;
  }

  return (
    <div className="d-flex flex-column m-3">
      <StockListTemplateSummary template={template} currentScreen="editHeader" />
      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center">
          <Translate id="react.stockListTemplate.editHeader.label" defaultMessage="Edit stock list header" />
          <a className="btn btn-sm btn-outline-secondary" href={REQUISITION_TEMPLATE_URL.edit(templateId)}>
            <Translate id="react.default.button.cancel.label" defaultMessage="Cancel" />
          </a>
        </div>
        <StockListTemplateHeaderForm
          form={form}
          setField={setField}
          onSubmit={submit}
          saving={saving}
        />
      </div>
    </div>
  );
};

export default StockListTemplateEditHeader;

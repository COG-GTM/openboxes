import React, { useState } from 'react';

import { useSelector } from 'react-redux';
import Alert from 'react-s-alert';

import requisitionTemplateApi from 'api/services/RequisitionTemplateApi';
import StockListTemplateHeaderForm from 'components/stock-list/template/StockListTemplateHeaderForm';
import { REQUISITION_TEMPLATE_URL } from 'consts/applicationUrls';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';

const StockListTemplateCreate = () => {
  const currentLocation = useSelector((state) => state.session.currentLocation);
  const [form, setForm] = useState({
    name: '',
    origin: null,
    destination: null,
    requestedBy: null,
    replenishmentPeriod: '',
    replenishmentTypeCode: 'PUSH',
    sortByCode: null,
    description: '',
  });
  const [saving, setSaving] = useState(false);

  useTranslation('stockListManagement', 'requisition', 'default');

  const setField = (field, value) => setForm((previous) => ({ ...previous, [field]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const { data } = await requisitionTemplateApi.createTemplate({
        type: 'STOCK',
        name: form.name || null,
        originId: form.origin?.id || currentLocation?.id || null,
        destinationId: form.destination?.id || null,
        requestedById: form.requestedBy?.id || null,
        replenishmentPeriod: form.replenishmentPeriod || null,
        replenishmentTypeCode: form.replenishmentTypeCode || null,
        sortByCode: form.sortByCode || null,
        description: form.description || null,
      });
      window.location = REQUISITION_TEMPLATE_URL.edit(data?.data?.id);
    } catch (err) {
      const message = err?.response?.data?.errors?.join('; ')
        || err?.response?.data?.errorMessage;
      if (message) {
        Alert.error(message);
      }
      setSaving(false);
    }
  };

  return (
    <div className="d-flex flex-column m-3">
      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center">
          <Translate id="react.stockListTemplate.create.label" defaultMessage="Create stock list" />
          <a className="btn btn-sm btn-outline-secondary" href={REQUISITION_TEMPLATE_URL.list()}>
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

export default StockListTemplateCreate;

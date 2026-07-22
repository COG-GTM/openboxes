import React, { useEffect, useState } from 'react';

import { useParams } from 'react-router-dom';
import Alert from 'react-s-alert';

import shipmentWorkflowApi from 'api/services/ShipmentWorkflowApi';
import { SHIPMENT_WORKFLOW_URL } from 'consts/applicationUrls';
import useTranslation from 'hooks/useTranslation';
import Select from 'utils/Select';
import Translate from 'utils/Translate';

const toOption = (item) => (item ? { id: item.id, value: item.id, label: item.name } : null);

const ShipmentWorkflowEdit = () => {
  const { shipmentWorkflowId } = useParams();
  const [version, setVersion] = useState(null);
  const [name, setName] = useState('');
  const [shipmentType, setShipmentType] = useState(null);
  const [excludedFields, setExcludedFields] = useState('');
  const [documentTemplate, setDocumentTemplate] = useState('');
  const [referenceNumberTypes, setReferenceNumberTypes] = useState([]);
  const [containerTypes, setContainerTypes] = useState([]);
  const [documentTemplates, setDocumentTemplates] = useState([]);
  const [options, setOptions] = useState({
    shipmentTypes: [],
    referenceNumberTypes: [],
    containerTypes: [],
    documentTemplates: [],
  });
  const [saving, setSaving] = useState(false);

  useTranslation('shipmentWorkflow', 'default');

  useEffect(() => {
    shipmentWorkflowApi.getShipmentWorkflow(shipmentWorkflowId)
      .then(({ data }) => {
        const workflow = data?.data;
        setVersion(workflow?.version);
        setName(workflow?.name ?? '');
        setShipmentType(toOption(workflow?.shipmentType));
        setExcludedFields(workflow?.excludedFields ?? '');
        setDocumentTemplate(workflow?.documentTemplate ?? '');
        setReferenceNumberTypes(workflow?.referenceNumberTypes?.map(toOption) ?? []);
        setContainerTypes(workflow?.containerTypes?.map(toOption) ?? []);
        setDocumentTemplates(workflow?.documentTemplates?.map(toOption) ?? []);
      })
      .catch((err) => {
        const message = err?.response?.data?.errorMessage;
        if (message) {
          Alert.error(message);
        }
      });
    shipmentWorkflowApi.getOptions()
      .then(({ data }) => {
        setOptions(data?.data ?? {});
      })
      .catch((err) => {
        const message = err?.response?.data?.errorMessage;
        if (message) {
          Alert.error(message);
        }
      });
  }, [shipmentWorkflowId]);

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await shipmentWorkflowApi.updateShipmentWorkflow(shipmentWorkflowId, {
        version,
        name,
        shipmentType: shipmentType ? { id: shipmentType.id } : null,
        excludedFields,
        documentTemplate,
        referenceNumberTypes: referenceNumberTypes?.map((type) => ({ id: type.id })) ?? [],
        containerTypes: containerTypes?.map((type) => ({ id: type.id })) ?? [],
        documentTemplates: documentTemplates?.map((doc) => ({ id: doc.id })) ?? [],
      });
      window.location = SHIPMENT_WORKFLOW_URL.list();
    } catch (error) {
      const message = error?.response?.data?.errors?.join('; ')
        || error?.response?.data?.errorMessage;
      if (message) {
        Alert.error(message);
      }
      setSaving(false);
    }
  };

  const remove = async () => {
    // eslint-disable-next-line no-alert
    if (!window.confirm('Are you sure?')) {
      return;
    }
    setSaving(true);
    try {
      await shipmentWorkflowApi.deleteShipmentWorkflow(shipmentWorkflowId);
      window.location = SHIPMENT_WORKFLOW_URL.list();
    } catch (error) {
      const message = error?.response?.data?.errorMessage;
      if (message) {
        Alert.error(message);
      }
      setSaving(false);
    }
  };

  return (
    <div className="d-flex flex-column m-3">
      <div className="card">
        <div className="card-header">
          <Translate id="react.shipmentWorkflow.edit.label" defaultMessage="Edit Shipment Workflow" />
          {name && ` · ${name}`}
        </div>
        <form className="card-body" onSubmit={submit}>
          <div className="form-group row">
            <label className="col-sm-3 col-form-label" htmlFor="shipment-workflow-name-input">
              <Translate id="react.shipmentWorkflow.column.name.label" defaultMessage="Name" />
            </label>
            <div className="col-sm-6">
              <input
                type="text"
                id="shipment-workflow-name-input"
                className="form-control"
                value={name}
                onChange={(event) => setName(event.target.value)}
                data-testid="shipment-workflow-name-input"
              />
            </div>
          </div>
          <div className="form-group row">
            <label className="col-sm-3 col-form-label" htmlFor="shipment-workflow-shipment-type-select">
              <Translate id="react.shipmentWorkflow.column.shipmentType.label" defaultMessage="Shipment Type" />
            </label>
            <div className="col-sm-6">
              <Select
                options={options.shipmentTypes ?? []}
                value={shipmentType}
                onChange={(value) => setShipmentType(value)}
                id="shipment-workflow-shipment-type-select"
              />
            </div>
          </div>
          <div className="form-group row">
            <label className="col-sm-3 col-form-label" htmlFor="shipment-workflow-excluded-fields-input">
              <Translate id="react.shipmentWorkflow.column.excludedFields.label" defaultMessage="Excluded Fields" />
            </label>
            <div className="col-sm-6">
              <input
                type="text"
                id="shipment-workflow-excluded-fields-input"
                className="form-control"
                value={excludedFields}
                onChange={(event) => setExcludedFields(event.target.value)}
                data-testid="shipment-workflow-excluded-fields-input"
              />
            </div>
          </div>
          <div className="form-group row">
            <label className="col-sm-3 col-form-label" htmlFor="shipment-workflow-document-template-input">
              <Translate id="react.shipmentWorkflow.column.documentTemplate.label" defaultMessage="Document Template" />
            </label>
            <div className="col-sm-6">
              <input
                type="text"
                id="shipment-workflow-document-template-input"
                className="form-control"
                value={documentTemplate}
                onChange={(event) => setDocumentTemplate(event.target.value)}
                data-testid="shipment-workflow-document-template-input"
              />
            </div>
          </div>
          <div className="form-group row">
            <label className="col-sm-3 col-form-label" htmlFor="shipment-workflow-reference-number-types-select">
              <Translate id="react.shipmentWorkflow.column.referenceNumberTypes.label" defaultMessage="Reference Number Types" />
            </label>
            <div className="col-sm-6">
              <Select
                multi
                options={options.referenceNumberTypes ?? []}
                value={referenceNumberTypes}
                onChange={(value) => setReferenceNumberTypes(value ?? [])}
                id="shipment-workflow-reference-number-types-select"
              />
            </div>
          </div>
          <div className="form-group row">
            <label className="col-sm-3 col-form-label" htmlFor="shipment-workflow-container-types-select">
              <Translate id="react.shipmentWorkflow.column.containerTypes.label" defaultMessage="Container Types" />
            </label>
            <div className="col-sm-6">
              <Select
                multi
                options={options.containerTypes ?? []}
                value={containerTypes}
                onChange={(value) => setContainerTypes(value ?? [])}
                id="shipment-workflow-container-types-select"
              />
            </div>
          </div>
          <div className="form-group row">
            <label className="col-sm-3 col-form-label" htmlFor="shipment-workflow-document-templates-select">
              <Translate id="react.shipmentWorkflow.column.documentTemplates.label" defaultMessage="Document Templates" />
            </label>
            <div className="col-sm-6">
              <Select
                multi
                options={options.documentTemplates ?? []}
                value={documentTemplates}
                onChange={(value) => setDocumentTemplates(value ?? [])}
                id="shipment-workflow-document-templates-select"
              />
            </div>
          </div>
          <div className="d-flex justify-content-center">
            <button type="submit" className="btn btn-primary mr-2" disabled={saving} data-testid="shipment-workflow-save-button">
              <Translate id="react.default.button.update.label" defaultMessage="Update" />
            </button>
            <button type="button" className="btn btn-danger mr-2" onClick={remove} disabled={saving} data-testid="shipment-workflow-delete-button">
              <Translate id="react.default.button.delete.label" defaultMessage="Delete" />
            </button>
            <a className="btn btn-outline-secondary" href={SHIPMENT_WORKFLOW_URL.list()}>
              <Translate id="react.default.button.cancel.label" defaultMessage="Cancel" />
            </a>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ShipmentWorkflowEdit;

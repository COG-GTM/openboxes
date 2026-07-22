import React, { useEffect, useState } from 'react';

import moment from 'moment';
import { useParams } from 'react-router-dom';
import Alert from 'react-s-alert';

import shipmentWorkflowApi from 'api/services/ShipmentWorkflowApi';
import { SHIPMENT_WORKFLOW_URL } from 'consts/applicationUrls';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';

const formatDate = (value) => (value ? moment(value).format('DD/MMM/YYYY HH:mm') : '');

const ShipmentWorkflowShow = () => {
  const { shipmentWorkflowId } = useParams();
  const [shipmentWorkflow, setShipmentWorkflow] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useTranslation('shipmentWorkflow', 'default');

  useEffect(() => {
    shipmentWorkflowApi.getShipmentWorkflow(shipmentWorkflowId)
      .then(({ data }) => {
        setShipmentWorkflow(data?.data);
      })
      .catch((err) => {
        const message = err?.response?.data?.errorMessage;
        if (message) {
          Alert.error(message);
        }
      });
  }, [shipmentWorkflowId]);

  const remove = async () => {
    // eslint-disable-next-line no-alert
    if (!window.confirm('Are you sure?')) {
      return;
    }
    setDeleting(true);
    try {
      await shipmentWorkflowApi.deleteShipmentWorkflow(shipmentWorkflowId);
      window.location = SHIPMENT_WORKFLOW_URL.list();
    } catch (error) {
      const message = error?.response?.data?.errorMessage;
      if (message) {
        Alert.error(message);
      }
      setDeleting(false);
    }
  };

  const row = (labelId, defaultLabel, value, testId) => (
    <div className="form-group row mb-1">
      <span className="col-sm-3 col-form-label font-weight-bold">
        <Translate id={labelId} defaultMessage={defaultLabel} />
      </span>
      <span className="col-sm-9 col-form-label" data-testid={testId}>
        {value}
      </span>
    </div>
  );

  return (
    <div className="d-flex flex-column m-3">
      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center">
          <span>
            <Translate id="react.shipmentWorkflow.show.label" defaultMessage="Show Shipment Workflow" />
            {shipmentWorkflow?.name && ` · ${shipmentWorkflow.name}`}
          </span>
          <span>
            <a className="btn btn-primary btn-sm mr-2" href={SHIPMENT_WORKFLOW_URL.edit(shipmentWorkflowId)} data-testid="shipment-workflow-edit-button">
              <Translate id="react.default.button.edit.label" defaultMessage="Edit" />
            </a>
            <button type="button" className="btn btn-danger btn-sm mr-2" onClick={remove} disabled={deleting} data-testid="shipment-workflow-delete-button">
              <Translate id="react.default.button.delete.label" defaultMessage="Delete" />
            </button>
            <a className="btn btn-outline-secondary btn-sm" href={SHIPMENT_WORKFLOW_URL.list()}>
              <Translate id="react.default.button.back.label" defaultMessage="Back" />
            </a>
          </span>
        </div>
        <div className="card-body">
          {row('react.shipmentWorkflow.column.id.label', 'Id', shipmentWorkflow?.id, 'shipment-workflow-id')}
          {row('react.shipmentWorkflow.column.name.label', 'Name', shipmentWorkflow?.name, 'shipment-workflow-name')}
          {row('react.shipmentWorkflow.column.shipmentType.label', 'Shipment Type', shipmentWorkflow?.shipmentType?.name, 'shipment-workflow-shipment-type')}
          {row('react.shipmentWorkflow.column.excludedFields.label', 'Excluded Fields', shipmentWorkflow?.excludedFields, 'shipment-workflow-excluded-fields')}
          {row('react.shipmentWorkflow.column.documentTemplate.label', 'Document Template', shipmentWorkflow?.documentTemplate, 'shipment-workflow-document-template')}
          {row('react.shipmentWorkflow.column.dateCreated.label', 'Date Created', formatDate(shipmentWorkflow?.dateCreated), 'shipment-workflow-date-created')}
          {row('react.shipmentWorkflow.column.lastUpdated.label', 'Last Updated', formatDate(shipmentWorkflow?.lastUpdated), 'shipment-workflow-last-updated')}
          {row(
            'react.shipmentWorkflow.column.referenceNumberTypes.label',
            'Reference Number Types',
            shipmentWorkflow?.referenceNumberTypes?.map((type) => type.name).join(', '),
            'shipment-workflow-reference-number-types',
          )}
          {row(
            'react.shipmentWorkflow.column.containerTypes.label',
            'Container Types',
            shipmentWorkflow?.containerTypes?.map((type) => type.name).join(', '),
            'shipment-workflow-container-types',
          )}
          {row(
            'react.shipmentWorkflow.column.documentTemplates.label',
            'Document Templates',
            shipmentWorkflow?.documentTemplates?.map((doc) => doc.name).join(', '),
            'shipment-workflow-document-templates',
          )}
        </div>
      </div>
    </div>
  );
};

export default ShipmentWorkflowShow;

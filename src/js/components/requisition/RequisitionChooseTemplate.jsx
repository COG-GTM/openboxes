import React, { useEffect, useState } from 'react';

import requisitionApi from 'api/services/RequisitionApi';
import { REQUISITION_TEMPLATE_URL, REQUISITION_URL } from 'consts/applicationUrls';
import useTranslation from 'hooks/useTranslation';
import Select from 'utils/Select';
import Translate from 'utils/Translate';

const RequisitionChooseTemplate = () => {
  const [templates, setTemplates] = useState([]);

  useTranslation('requisition', 'default');

  useEffect(() => {
    requisitionApi.getRequisitionTemplates().then(({ data }) => {
      setTemplates(data?.data?.map((template) => ({
        ...template,
        value: template.id,
        label: `${template.name} - ${template.origin?.name} - ${template.destination?.name}${template.commodityClass ? ` (${template.commodityClass})` : ''}`,
      })) ?? []);
    });
  }, []);

  return (
    <div className="d-flex flex-column m-3">
      <div className="mb-2">
        <a className="btn btn-outline-secondary mr-2" href={`${REQUISITION_TEMPLATE_URL.base}/list`}>
          <Translate id="react.requisition.listTemplates.label" defaultMessage="List stock requisitions" />
        </a>
        <a className="btn btn-outline-primary" href={`${REQUISITION_TEMPLATE_URL.create()}?type=STOCK`}>
          <Translate id="react.requisition.addTemplate.label" defaultMessage="Add stock requisition" />
        </a>
      </div>
      <div className="card">
        <div className="card-header">
          <Translate id="react.requisition.chooseTemplate.label" defaultMessage="Choose stock requisition template" />
        </div>
        <div className="card-body">
          <div className="form-group row">
            <label className="col-sm-3 col-form-label" htmlFor="requisition-template-select">
              <Translate id="react.requisition.template.label" defaultMessage="Requisition template" />
            </label>
            <div className="col-sm-9">
              <Select
                options={templates}
                onChange={(template) => {
                  if (template?.id) {
                    window.location = REQUISITION_URL.createStockFromTemplate(template.id);
                  }
                }}
                placeholder="Select template..."
                id="requisition-template-select"
                dataTestId="requisition-template-select"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RequisitionChooseTemplate;

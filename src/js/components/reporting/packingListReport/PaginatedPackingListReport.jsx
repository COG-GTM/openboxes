import React, { useEffect, useState } from 'react';

import { useDispatch } from 'react-redux';

import { hideSpinner, showSpinner } from 'actions';
import { REPORT_PACKING_LIST, REPORT_PACKING_LIST_SHIPMENTS } from 'api/urls';
import notification from 'components/Layout/notifications/notification';
import Section from 'components/Layout/v2/Section';
import { CONTEXT_PATH, REPORT_URL } from 'consts/applicationUrls';
import NotificationType from 'consts/notificationTypes';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import apiClient from 'utils/apiClient';
import Select from 'utils/Select';
import Translate from 'utils/Translate';
import HeaderWrapper from 'wrappers/HeaderWrapper';
import PageWrapper from 'wrappers/PageWrapper';

const PaginatedPackingListReport = () => {
  useTranslation('packingListReport', 'default');

  const dispatch = useDispatch();
  const translate = useTranslate();

  const [shipments, setShipments] = useState([]);
  const [shipment, setShipment] = useState(null);
  const [packingList, setPackingList] = useState(null);

  useEffect(() => {
    const fetchShipments = async () => {
      try {
        const response = await apiClient.get(REPORT_PACKING_LIST_SHIPMENTS);
        setShipments((response?.data?.data ?? []).map((option) => ({
          id: option.id,
          value: option.id,
          label: option.label,
        })));
      } catch (error) {
        notification(NotificationType.ERROR)({
          message: translate('react.packingListReport.optionsError.label', 'Unable to load shipments'),
        });
      }
    };
    fetchShipments();
  }, []);

  useEffect(() => {
    const fetchPackingList = async () => {
      if (!shipment?.id) {
        setPackingList(null);
        return;
      }
      dispatch(showSpinner());
      try {
        const response = await apiClient.get(REPORT_PACKING_LIST, {
          params: { shipmentId: shipment.id },
        });
        setPackingList(response?.data?.data ?? null);
      } catch (error) {
        notification(NotificationType.ERROR)({
          message: translate('react.packingListReport.fetchError.label', 'Unable to load packing list'),
        });
      } finally {
        dispatch(hideSpinner());
      }
    };
    fetchPackingList();
  }, [shipment?.id]);

  const htmlExportUrl = shipment?.id
    ? `${REPORT_URL.showPaginatedPackingListReport()}?print=true&shipment.id=${shipment.id}`
    : null;
  const pdfExportUrl = shipment?.id
    ? `${REPORT_URL.downloadShippingReport()}?format=pdf&url=${encodeURIComponent(`${CONTEXT_PATH}/report/showPaginatedPackingListReport`)}&shipment.id=${shipment.id}`
    : null;

  return (
    <PageWrapper>
      <HeaderWrapper className="align-items-center h-auto py-3">
        <span className="title">
          <Translate id="react.packingListReport.title.label" defaultMessage="Shipping report" />
        </span>
      </HeaderWrapper>
      <div className="p-3">
        <Section
          title={{ label: 'react.packingListReport.parameters.label', defaultMessage: 'Parameters' }}
        >
          <div className="form-group" style={{ maxWidth: '640px' }}>
            <label htmlFor="shipment-select">
              <Translate id="react.packingListReport.shipment.label" defaultMessage="Shipment" />
            </label>
            <Select
              id="shipment-select"
              dataTestId="shipment-select"
              options={shipments}
              value={shipment}
              onChange={(value) => setShipment(value)}
            />
          </div>
          <div>
            <span className="mr-2">
              <Translate id="react.packingListReport.exportAs.label" defaultMessage="Export as" />
            </span>
            {shipment?.id ? (
              <>
                <a href={htmlExportUrl} target="_blank" rel="noopener noreferrer">
                  <Translate id="react.packingListReport.exportAsHtml.label" defaultMessage="HTML" />
                </a>
                {' | '}
                <a href={pdfExportUrl} target="_blank" rel="noopener noreferrer">
                  <Translate id="react.packingListReport.exportAsPdf.label" defaultMessage="PDF" />
                </a>
              </>
            ) : (
              <Translate id="react.packingListReport.selectShipment.label" defaultMessage="Please select a shipment" />
            )}
          </div>
        </Section>
        {packingList && (
          <Section
            title={{ label: 'react.packingListReport.packingList.label', defaultMessage: 'Packing list' }}
          >
            <h4 data-testid="packing-list-shipment-name">
              {`${packingList.shipment?.shipmentNumber ?? ''} ${packingList.shipment?.name ?? ''}`}
            </h4>
            {(packingList.containers ?? []).map((container) => (
              <div key={container.name || 'unpacked'} className="mb-4">
                <h5>{container.name || translate('react.packingListReport.unpacked.label', 'Unpacked')}</h5>
                <div className="table-responsive">
                  <table className="table table-sm table-bordered" data-testid="packing-list-table">
                    <thead>
                      <tr>
                        <th>{translate('react.packingListReport.number.label', '#')}</th>
                        <th>{translate('react.packingListReport.description.label', 'Description')}</th>
                        <th>{translate('react.packingListReport.lotNumber.label', 'Lot number')}</th>
                        <th>{translate('react.packingListReport.expirationDate.label', 'Expiration date')}</th>
                        <th>{translate('react.packingListReport.recipient.label', 'Recipient')}</th>
                        <th>{translate('react.packingListReport.quantityTotal.label', 'Total qty shipped')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(container.entries ?? []).map((item, index) => (
                        // eslint-disable-next-line react/no-array-index-key
                        <tr key={index}>
                          <td>{index + 1}</td>
                          <td>{item.productName}</td>
                          <td>{item.lotNumber}</td>
                          <td>{item.expirationDate}</td>
                          <td>{item.recipient}</td>
                          <td className="text-center">{item.quantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </Section>
        )}
      </div>
    </PageWrapper>
  );
};

export default PaginatedPackingListReport;

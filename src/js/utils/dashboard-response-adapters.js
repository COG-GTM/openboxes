import { STOCK_MOVEMENT_URL } from 'consts/applicationUrls';

const overdueInboundShipments = (responseData, translate) => {
  const rows = responseData?.data ?? [];

  return {
    link: `${STOCK_MOVEMENT_URL.listInbound()}&overdue=true`,
    data: {
      number: translate('react.dashboard.overdueInbound.column.shipment.label', 'Shipment'),
      name: translate('react.dashboard.overdueInbound.column.origin.label', 'Origin'),
      value: translate('react.dashboard.overdueInbound.column.daysLate.label', 'Days late'),
      emptyMessage: {
        id: 'react.dashboard.overdueInbound.empty.label',
        defaultMessage: 'No overdue inbound shipments',
      },
      body: rows.map((row) => ({
        number: row.shipmentNumber,
        numberLink: row.id ? STOCK_MOVEMENT_URL.show(row.id) : undefined,
        name: row.origin?.name,
        value: `${row.daysLate}`,
      })),
    },
  };
};

/**
 * Maps a response from an API outside /api/dashboard onto the shape a dashboard card expects.
 * Keyed by the responseAdapter declared on the widget in openboxes.dashboardConfig.
 */
const dashboardResponseAdapters = {
  overdueInboundShipments,
};

export default dashboardResponseAdapters;

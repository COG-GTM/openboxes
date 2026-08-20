import dashboardResponseAdapters from 'utils/dashboard-response-adapters';

const translate = (id, defaultMessage) => defaultMessage;

describe('overdueInboundShipments adapter', () => {
  it('maps rows onto the table card shape, preserving the response order', () => {
    const { data, link } = dashboardResponseAdapters.overdueInboundShipments({
      data: [
        {
          id: 'ship1',
          shipmentNumber: 'S1',
          origin: { id: 'a', name: 'Warehouse A' },
          daysLate: 9,
        },
        {
          id: 'ship2',
          shipmentNumber: 'S2',
          origin: { id: 'b', name: 'Warehouse B' },
          daysLate: 2,
        },
      ],
      count: 2,
      totalCount: 2,
    }, translate);

    expect(data.number).toBe('Shipment');
    expect(data.name).toBe('Origin');
    expect(data.value).toBe('Days late');
    expect(data.body).toEqual([
      {
        number: 'S1', numberLink: '/openboxes/stockMovement/show/ship1', name: 'Warehouse A', value: '9',
      },
      {
        number: 'S2', numberLink: '/openboxes/stockMovement/show/ship2', name: 'Warehouse B', value: '2',
      },
    ]);
    expect(link).toContain('overdue=true');
  });

  it('returns an empty body with an empty message when there are no overdue shipments', () => {
    const { data } = dashboardResponseAdapters.overdueInboundShipments({
      data: [],
      count: 0,
      totalCount: 0,
    }, translate);

    expect(data.body).toEqual([]);
    expect(data.emptyMessage.id).toBe('react.dashboard.overdueInbound.empty.label');
  });
});

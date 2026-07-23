import React, { useEffect, useState } from 'react';

import mobileApi from 'api/services/MobileApi';
import MobileLayout from 'components/mobile/MobileLayout';
import ReportPagination from 'components/reporting/ReportPagination';
import { STOCK_MOVEMENT_URL } from 'consts/applicationUrls';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';

const PAGE_SIZE = 10;

const MobileOutboundList = () => {
  useTranslation('mobile', 'default');

  const translate = useTranslate();
  const [stockMovements, setStockMovements] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      const response = await mobileApi.getOutboundItems({
        params: { max: PAGE_SIZE, offset: page * PAGE_SIZE },
      });
      setStockMovements(response?.data?.data ?? []);
      setTotalCount(response?.data?.totalCount ?? 0);
    };
    fetchData();
  }, [page]);

  return (
    <MobileLayout title={translate('react.mobile.outbound.label', 'Outbound Movements')}>
      <div className="row g-0" data-testid="mobile-outbound-list">
        <table className="table table-bordered">
          <thead>
            <tr>
              <th>{translate('react.mobile.outbound.status.label', 'Status')}</th>
              <th>{translate('react.mobile.outbound.identifier.label', 'Identifier')}</th>
              <th>{translate('react.mobile.outbound.destination.label', 'Destination')}</th>
              <th>{translate('react.mobile.outbound.requestedDeliveryDate.label', 'Requested Delivery Date')}</th>
              <th>{translate('react.mobile.outbound.actions.label', 'Actions')}</th>
            </tr>
          </thead>
          <tbody>
            {stockMovements.map((stockMovement) => (
              <tr key={stockMovement.id}>
                <td>
                  <a href={STOCK_MOVEMENT_URL.show(stockMovement.id)} className="text-decoration-none text-reset">
                    {stockMovement.status}
                  </a>
                </td>
                <td>
                  <a href={STOCK_MOVEMENT_URL.show(stockMovement.id)} className="text-decoration-none text-reset">
                    {stockMovement.identifier}
                  </a>
                </td>
                <td>
                  {`${stockMovement.destination?.name ?? ''} ${stockMovement.destination?.locationNumber ?? ''}`}
                </td>
                <td>{stockMovement.requestedDeliveryDate}</td>
                <td>
                  <a href={STOCK_MOVEMENT_URL.show(stockMovement.id)} className="btn btn-primary btn-sm">
                    {translate('react.mobile.outbound.view.label', 'View')}
                    {' '}
                    <i className="fa fa-chevron-right" />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <ReportPagination
          page={page}
          pageSize={PAGE_SIZE}
          total={totalCount}
          onPageChange={setPage}
        />
      </div>
    </MobileLayout>
  );
};

export default MobileOutboundList;

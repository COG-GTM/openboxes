import React, { useEffect, useState } from 'react';

import { useSelector } from 'react-redux';

import mobileApi from 'api/services/MobileApi';
import MobileLayout from 'components/mobile/MobileLayout';
import { MOBILE_URL, ORDER_URL } from 'consts/applicationUrls';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';

const MobileDashboard = () => {
  useTranslation('mobile', 'default');

  const translate = useTranslate();
  const currentLocation = useSelector((state) => state.session.currentLocation);
  const [indicators, setIndicators] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const response = await mobileApi.getDashboard();
      setIndicators(response?.data?.data ?? []);
    };
    fetchData();
  }, []);

  const indicatorUrl = (indicator) => {
    switch (indicator.id) {
      case 'inventoryItems':
        return MOBILE_URL.productList();
      case 'purchaseOrders':
        return `${ORDER_URL.list()}?origin.id=${currentLocation?.id ?? ''}`;
      case 'replenishmentOrders':
        return `${MOBILE_URL.outboundList()}?origin.id=${currentLocation?.id ?? ''}`;
      default:
        return MOBILE_URL.index();
    }
  };

  return (
    <MobileLayout title={translate('react.mobile.dashboard.label', 'Dashboard')}>
      <div className="row" data-testid="mobile-dashboard">
        {indicators.map((indicator) => (
          <div className="col-md-4" key={indicator.id}>
            <div className="card mb-3">
              <div className="card-body">
                <h5 className="card-title">
                  <i className={indicator.class} />
                  {' '}
                  {indicator.name}
                </h5>
                <h2 className="card-text">
                  <a href={indicatorUrl(indicator)} className="text-decoration-none">
                    {indicator.count}
                  </a>
                </h2>
              </div>
            </div>
          </div>
        ))}
      </div>
    </MobileLayout>
  );
};

export default MobileDashboard;

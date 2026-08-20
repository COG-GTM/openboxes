import React, { useMemo, useState } from 'react';

import PropTypes from 'prop-types';
import queryString from 'query-string';
import { connect } from 'react-redux';
import { useLocation, withRouter } from 'react-router-dom';

import filterFields from 'components/stock-movement/inbound/FilterFields';
import StockMovementInboundFilters from 'components/stock-movement/inbound/StockMovementInboundFilters';
import StockMovementInboundHeader from 'components/stock-movement/inbound/StockMovementInboundHeader';
import StockMovementInboundTable from 'components/stock-movement/inbound/StockMovementInboundTable';
import useInboundFilters from 'hooks/list-pages/inbound/useInboundFilters';
import useTranslation from 'hooks/useTranslation';

const StockMovementInboundList = (props) => {
  const {
    selectFiltersForMyStockMovements,
    defaultFilterValues,
    setFilterValues,
    filterParams,
  } = useInboundFilters();
  const { search } = useLocation();
  const [overdue, setOverdue] = useState(
    queryString.parse(search).overdue === 'true',
  );
  const tableFilterParams = useMemo(() => {
    if (Object.keys(filterParams).length === 0 && !overdue) return filterParams;
    return { ...filterParams, overdue };
  }, [filterParams, overdue]);

  useTranslation('stockMovement', 'reactTable');

  return (
    <div className="d-flex flex-column list-page-main">
      <StockMovementInboundHeader showMyStockMovements={selectFiltersForMyStockMovements} />
      <StockMovementInboundFilters
        defaultValues={defaultFilterValues}
        setFilterParams={setFilterValues}
        filterFields={filterFields}
        formProps={{
          shipmentStatuses: props.shipmentStatuses,
          shipmentTypes: props.shipmentTypes,
        }}
        overdue={overdue}
        setOverdue={setOverdue}
      />
      <StockMovementInboundTable filterParams={tableFilterParams} overdue={overdue} />
    </div>
  );
};

const mapStateToProps = (state) => ({
  shipmentStatuses: state.shipmentStatuses.data,
  shipmentTypes: state.stockMovementCommon.shipmentTypes,
});

export default withRouter(connect(mapStateToProps)(StockMovementInboundList));

StockMovementInboundList.propTypes = {
  shipmentStatuses: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string,
    name: PropTypes.string,
    variant: PropTypes.string,
    label: PropTypes.string,
  })).isRequired,
  shipmentTypes: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string,
    name: PropTypes.string,
    label: PropTypes.string,
    description: PropTypes.string,
  })).isRequired,
};

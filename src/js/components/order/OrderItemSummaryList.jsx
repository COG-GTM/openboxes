import React, {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react';

import PropTypes from 'prop-types';
import { getTranslate } from 'react-localize-redux';
import { useSelector } from 'react-redux';

import orderApi from 'api/services/OrderApi';
import { ORDER_SUMMARY_STATUS_OPTIONS } from 'api/urls';
import DataTable from 'components/DataTable';
import { ORDER_URL } from 'consts/applicationUrls';
import useTranslation from 'hooks/useTranslation';
import apiClient from 'utils/apiClient';
import Select from 'utils/Select';
import Translate, { translateWithDefaultMessage } from 'utils/Translate';
import PageWrapper from 'wrappers/PageWrapper';

const PAGE_SIZE = 10;

const yesNo = (value) => {
  if (value == null) return '';
  return value ? 'Yes' : 'No';
};

const OrderItemSummaryList = ({ variant }) => {
  useTranslation('order', 'reactTable');

  const [derivedStatusOptions, setDerivedStatusOptions] = useState([]);
  const [orderNumber, setOrderNumber] = useState('');
  const [derivedStatus, setDerivedStatus] = useState([]);
  const [data, setData] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const pageRef = useRef(0);

  const isDetails = variant === 'details';

  const { translate } = useSelector((state) => ({
    translate: translateWithDefaultMessage(getTranslate(state.localize)),
  }));

  const fetchData = useCallback(async (page = pageRef.current) => {
    pageRef.current = page;
    setLoading(true);
    try {
      const response = await orderApi.getOrderItemSummaries({
        params: {
          max: PAGE_SIZE,
          offset: page * PAGE_SIZE,
          variant: isDetails ? 'details' : null,
          orderNumber: orderNumber || null,
          derivedStatus: isDetails ? null : derivedStatus.map((it) => it.id),
        },
        paramsSerializer: (params) => Object.entries(params)
          .flatMap(([key, value]) => {
            if (value == null || value === '') return [];
            if (Array.isArray(value)) {
              return value.map((v) => `${key}=${encodeURIComponent(v)}`);
            }
            return [`${key}=${encodeURIComponent(value)}`];
          })
          .join('&'),
      });
      setData(response.data.data);
      setTotalCount(response.data.totalCount);
    } finally {
      setLoading(false);
    }
  }, [orderNumber, derivedStatus, isDetails]);

  useEffect(() => {
    apiClient.get(ORDER_SUMMARY_STATUS_OPTIONS)
      .then((response) => setDerivedStatusOptions(response.data.data?.derivedStatuses ?? []));
    fetchData(0);
  }, []);

  const columns = useMemo(() => [
    {
      Header: <Translate id="react.order.itemSummary.orderNumber.label" defaultMessage="Order number" />,
      accessor: 'orderNumber',
      minWidth: 130,
      Cell: (row) => (
        row.original.orderId
          ? <a href={ORDER_URL.show(row.original.orderId)}>{row.value}</a>
          : <span>{row.value}</span>
      ),
    },
    {
      Header: <Translate id="react.order.itemSummary.productCode.label" defaultMessage="Product code" />,
      accessor: 'productCode',
      maxWidth: 110,
    },
    {
      Header: <Translate id="react.order.itemSummary.orderItemStatus.label" defaultMessage="Item status" />,
      accessor: 'orderItemStatus',
      maxWidth: 110,
    },
    {
      Header: <Translate id="react.order.itemSummary.quantityOrdered.label" defaultMessage="Qty ordered" />,
      accessor: 'quantityOrdered',
      className: 'text-right',
      maxWidth: 100,
    },
    {
      Header: <Translate id="react.order.itemSummary.quantityShipped.label" defaultMessage="Qty shipped" />,
      accessor: 'quantityShipped',
      className: 'text-right',
      maxWidth: 100,
    },
    {
      Header: <Translate id="react.order.itemSummary.quantityReceived.label" defaultMessage="Qty received" />,
      accessor: 'quantityReceived',
      className: 'text-right',
      maxWidth: 100,
    },
    ...(isDetails ? [] : [{
      Header: <Translate id="react.order.itemSummary.quantityCanceled.label" defaultMessage="Qty canceled" />,
      accessor: 'quantityCanceled',
      className: 'text-right',
      maxWidth: 100,
    }]),
    {
      Header: <Translate id="react.order.itemSummary.quantityInvoiced.label" defaultMessage="Qty invoiced" />,
      accessor: 'quantityInvoiced',
      className: 'text-right',
      maxWidth: 100,
    },
    ...(isDetails ? [] : [
      {
        Header: <Translate id="react.order.itemSummary.fullyShipped.label" defaultMessage="Fully shipped" />,
        accessor: 'isItemFullyShipped',
        maxWidth: 100,
        Cell: (row) => <span>{yesNo(row.value)}</span>,
      },
      {
        Header: <Translate id="react.order.itemSummary.fullyReceived.label" defaultMessage="Fully received" />,
        accessor: 'isItemFullyReceived',
        maxWidth: 100,
        Cell: (row) => <span>{yesNo(row.value)}</span>,
      },
      {
        Header: <Translate id="react.order.itemSummary.fullyInvoiced.label" defaultMessage="Fully invoiced" />,
        accessor: 'isItemFullyInvoiced',
        maxWidth: 100,
        Cell: (row) => <span>{yesNo(row.value)}</span>,
      },
    ]),
    {
      Header: <Translate id="react.order.itemSummary.derivedStatus.label" defaultMessage="Derived status" />,
      accessor: 'derivedStatus',
      minWidth: 130,
    },
  ], [isDetails]);

  return (
    <PageWrapper>
      <div className="list-page-header p-3 d-flex align-items-center justify-content-between">
        <h5 className="m-0">
          {isDetails
            ? <Translate id="react.order.itemDetails.title.label" defaultMessage="Order item details" />
            : <Translate id="react.order.itemSummary.title.label" defaultMessage="Order item summary" />}
        </h5>
      </div>
      <div className="list-page-filters d-flex align-items-end flex-wrap p-3">
        <div className="mr-3">
          <label htmlFor="order-number-filter">
            <Translate id="react.order.itemSummary.orderNumber.label" defaultMessage="Order number" />
          </label>
          <input
            id="order-number-filter"
            className="form-control"
            type="text"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
          />
        </div>
        {!isDetails && (
          <div className="mr-3" style={{ minWidth: '180px' }}>
            <label htmlFor="derived-status-filter">
              <Translate id="react.order.itemSummary.derivedStatus.label" defaultMessage="Derived status" />
            </label>
            <Select
              id="derived-status-filter"
              multi
              options={derivedStatusOptions}
              value={derivedStatus}
              onChange={(selected) => setDerivedStatus(selected ?? [])}
            />
          </div>
        )}
        <button
          type="button"
          className="btn btn-primary mb-1"
          onClick={() => fetchData(0)}
        >
          <Translate id="react.order.itemSummary.search.label" defaultMessage="Search" />
        </button>
      </div>
      <div className="px-3 pb-2">
        <Translate
          id="react.order.itemSummary.showing.label"
          defaultMessage={`Showing ${totalCount} order items`}
          data={{ count: totalCount }}
        />
      </div>
      <DataTable
        manual
        data={data}
        columns={columns}
        loading={loading}
        page={pageRef.current}
        pages={Math.max(1, Math.ceil(totalCount / PAGE_SIZE))}
        defaultPageSize={PAGE_SIZE}
        showPageSizeOptions={false}
        onPageChange={(page) => fetchData(page)}
        totalData={totalCount}
        noDataText={translate('react.order.itemSummary.empty.label', 'No order items match the given criteria')}
      />
    </PageWrapper>
  );
};

OrderItemSummaryList.propTypes = {
  variant: PropTypes.string,
};

OrderItemSummaryList.defaultProps = {
  variant: 'summary',
};

export default OrderItemSummaryList;

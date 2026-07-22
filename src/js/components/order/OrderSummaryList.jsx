import React, {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react';

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

const OrderSummaryList = () => {
  useTranslation('order', 'reactTable');

  const [statusOptions, setStatusOptions] = useState({});
  const [orderNumber, setOrderNumber] = useState('');
  const [orderStatus, setOrderStatus] = useState([]);
  const [shipmentStatus, setShipmentStatus] = useState([]);
  const [receiptStatus, setReceiptStatus] = useState([]);
  const [paymentStatus, setPaymentStatus] = useState([]);
  const [derivedStatus, setDerivedStatus] = useState([]);
  const [data, setData] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const pageRef = useRef(0);

  const { translate } = useSelector((state) => ({
    translate: translateWithDefaultMessage(getTranslate(state.localize)),
  }));

  const fetchData = useCallback(async (page = pageRef.current) => {
    pageRef.current = page;
    setLoading(true);
    try {
      const response = await orderApi.getOrderSummaries({
        params: {
          max: PAGE_SIZE,
          offset: page * PAGE_SIZE,
          orderNumber: orderNumber || null,
          orderStatus: orderStatus.map((it) => it.id),
          shipmentStatus: shipmentStatus.map((it) => it.id),
          receiptStatus: receiptStatus.map((it) => it.id),
          paymentStatus: paymentStatus.map((it) => it.id),
          derivedStatus: derivedStatus.map((it) => it.id),
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
  }, [orderNumber, orderStatus, shipmentStatus, receiptStatus, paymentStatus, derivedStatus]);

  useEffect(() => {
    apiClient.get(ORDER_SUMMARY_STATUS_OPTIONS)
      .then((response) => setStatusOptions(response.data.data));
    fetchData(0);
  }, []);

  const columns = useMemo(() => [
    {
      Header: <Translate id="react.order.summary.orderNumber.label" defaultMessage="Order number" />,
      accessor: 'orderNumber',
      minWidth: 140,
      Cell: (row) => (
        <a href={ORDER_URL.show(row.original.id)}>{row.value}</a>
      ),
    },
    {
      Header: <Translate id="react.order.summary.itemsOrdered.label" defaultMessage="Items ordered" />,
      accessor: 'itemsOrdered',
      className: 'text-right',
    },
    {
      Header: <Translate id="react.order.summary.itemsShipped.label" defaultMessage="Items shipped" />,
      accessor: 'itemsShipped',
      className: 'text-right',
    },
    {
      Header: <Translate id="react.order.summary.itemsReceived.label" defaultMessage="Items received" />,
      accessor: 'itemsReceived',
      className: 'text-right',
    },
    {
      Header: <Translate id="react.order.summary.itemsInvoiced.label" defaultMessage="Items invoiced" />,
      accessor: 'itemsInvoiced',
      className: 'text-right',
    },
    {
      Header: <Translate id="react.order.summary.orderStatus.label" defaultMessage="Order status" />,
      accessor: 'orderStatus',
    },
    {
      Header: <Translate id="react.order.summary.shipmentStatus.label" defaultMessage="Shipment status" />,
      accessor: 'shipmentStatus',
    },
    {
      Header: <Translate id="react.order.summary.receiptStatus.label" defaultMessage="Receipt status" />,
      accessor: 'receiptStatus',
    },
    {
      Header: <Translate id="react.order.summary.paymentStatus.label" defaultMessage="Payment status" />,
      accessor: 'paymentStatus',
    },
    {
      Header: <Translate id="react.order.summary.derivedStatus.label" defaultMessage="Derived status" />,
      accessor: 'derivedStatus',
    },
  ], []);

  const statusFilter = (id, labelId, defaultLabel, options, value, onChange) => (
    <div className="mr-3" style={{ minWidth: '180px' }}>
      <label htmlFor={id}>
        <Translate id={labelId} defaultMessage={defaultLabel} />
      </label>
      <Select
        id={id}
        multi
        options={options ?? []}
        value={value}
        onChange={(selected) => onChange(selected ?? [])}
      />
    </div>
  );

  return (
    <PageWrapper>
      <div className="list-page-header p-3 d-flex align-items-center justify-content-between">
        <h5 className="m-0">
          <Translate id="react.order.summary.title.label" defaultMessage="Order summary list" />
        </h5>
      </div>
      <div className="list-page-filters d-flex align-items-end flex-wrap p-3">
        <div className="mr-3">
          <label htmlFor="order-number-filter">
            <Translate id="react.order.summary.orderNumber.label" defaultMessage="Order number" />
          </label>
          <input
            id="order-number-filter"
            className="form-control"
            type="text"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
          />
        </div>
        {statusFilter('order-status-filter', 'react.order.summary.orderStatus.label', 'Order status', statusOptions.orderStatuses, orderStatus, setOrderStatus)}
        {statusFilter('shipment-status-filter', 'react.order.summary.shipmentStatus.label', 'Shipment status', statusOptions.shipmentStatuses, shipmentStatus, setShipmentStatus)}
        {statusFilter('receipt-status-filter', 'react.order.summary.receiptStatus.label', 'Receipt status', statusOptions.receiptStatuses, receiptStatus, setReceiptStatus)}
        {statusFilter('payment-status-filter', 'react.order.summary.paymentStatus.label', 'Payment status', statusOptions.paymentStatuses, paymentStatus, setPaymentStatus)}
        {statusFilter('derived-status-filter', 'react.order.summary.derivedStatus.label', 'Derived status', statusOptions.derivedStatuses, derivedStatus, setDerivedStatus)}
        <button
          type="button"
          className="btn btn-primary mb-1"
          onClick={() => fetchData(0)}
        >
          <Translate id="react.order.summary.search.label" defaultMessage="Search" />
        </button>
      </div>
      <div className="px-3 pb-2">
        <Translate
          id="react.order.summary.showing.label"
          defaultMessage={`Showing ${totalCount} orders`}
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
        noDataText={translate('react.order.summary.empty.label', 'No orders match the given criteria')}
      />
    </PageWrapper>
  );
};

export default OrderSummaryList;

import React, {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react';

import queryString from 'query-string';
import { getTranslate } from 'react-localize-redux';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';

import orderApi from 'api/services/OrderApi';
import { ORDER_API } from 'api/urls';
import DataTable from 'components/DataTable';
import { CONTEXT_PATH, ORDER_URL } from 'consts/applicationUrls';
import useTranslation from 'hooks/useTranslation';
import apiClient from 'utils/apiClient';
import { debounceLocationsFetch, debounceUsersFetch } from 'utils/option-utils';
import Select from 'utils/Select';
import Translate, { translateWithDefaultMessage } from 'utils/Translate';
import PageWrapper from 'wrappers/PageWrapper';

const PAGE_SIZE = 10;

const OrderList = () => {
  useTranslation('order', 'reactTable');

  const location = useLocation();
  const initialParams = useMemo(() => queryString.parse(location.search), [location.search]);

  const [statusOptions, setStatusOptions] = useState([]);
  const [q, setQ] = useState(initialParams.q || '');
  const [status, setStatus] = useState(initialParams.status
    ? { id: initialParams.status, value: initialParams.status, label: initialParams.status }
    : null);
  const [origin, setOrigin] = useState(null);
  const [destination, setDestination] = useState(null);
  const [orderedBy, setOrderedBy] = useState(null);
  const [statusStartDate, setStatusStartDate] = useState('');
  const [statusEndDate, setStatusEndDate] = useState('');
  const [data, setData] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPrice, setTotalPrice] = useState(0);
  const [defaultCurrencyCode, setDefaultCurrencyCode] = useState('');
  const [loading, setLoading] = useState(true);
  const pageRef = useRef(0);

  const orderType = initialParams.orderType || null;

  const {
    currentLocation, translate, debounceTime, debounceMinSearchLength,
  } = useSelector((state) => ({
    currentLocation: state.session.currentLocation,
    translate: translateWithDefaultMessage(getTranslate(state.localize)),
    debounceTime: state.session.searchConfig.debounceTime,
    debounceMinSearchLength: state.session.searchConfig.minSearchLength,
  }));

  const debouncedLocationsFetch = useMemo(
    () => debounceLocationsFetch(debounceTime, debounceMinSearchLength, null, true),
    [debounceTime, debounceMinSearchLength],
  );
  const debouncedUsersFetch = useMemo(
    () => debounceUsersFetch(debounceTime, debounceMinSearchLength),
    [debounceTime, debounceMinSearchLength],
  );

  const buildParams = useCallback((extraParams = {}) => ({
    q: q || null,
    orderType: orderType || null,
    status: status?.id || null,
    origin: origin?.id || null,
    destination: destination?.id || undefined,
    orderedBy: orderedBy?.id || null,
    statusStartDate: statusStartDate || null,
    statusEndDate: statusEndDate || null,
    ...extraParams,
  }), [q, orderType, status, origin, destination, orderedBy, statusStartDate, statusEndDate]);

  const fetchData = useCallback(async (page = pageRef.current) => {
    pageRef.current = page;
    setLoading(true);
    try {
      const response = await orderApi.getOrders({
        params: buildParams({
          max: PAGE_SIZE,
          offset: page * PAGE_SIZE,
        }),
      });
      setData(response.data.data);
      setTotalCount(response.data.totalCount);
      setTotalPrice(response.data.totalPrice);
      setDefaultCurrencyCode(response.data.defaultCurrencyCode);
    } finally {
      setLoading(false);
    }
  }, [buildParams]);

  useEffect(() => {
    apiClient.get('/api/orderStatusOptions')
      .then((response) => {
        setStatusOptions(response.data.data);
        const preselected = response.data.data.find((it) => it.id === initialParams.status);
        if (preselected) {
          setStatus(preselected);
        }
      });
  }, []);

  useEffect(() => {
    if (currentLocation?.id) {
      fetchData(0);
    } else {
      setLoading(false);
    }
  }, [currentLocation?.id]);

  const downloadUrl = (downloadParams) => {
    const params = queryString.stringify({
      ...Object.fromEntries(Object.entries(buildParams()).filter(([, v]) => v)),
      ...downloadParams,
    });
    return `${CONTEXT_PATH}${ORDER_API}?${params}`;
  };

  const columns = useMemo(() => [
    {
      Header: <Translate id="react.order.list.status.label" defaultMessage="Status" />,
      accessor: 'derivedStatus',
      minWidth: 120,
      sortable: false,
    },
    {
      Header: <Translate id="react.order.list.type.label" defaultMessage="Type" />,
      accessor: 'orderType.name',
      sortable: false,
    },
    {
      Header: <Translate id="react.order.list.orderNumber.label" defaultMessage="Order number" />,
      accessor: 'orderNumber',
      sortable: false,
      Cell: (row) => (
        <a href={ORDER_URL.show(row.original.id)}>{row.value}</a>
      ),
    },
    {
      Header: <Translate id="react.order.list.name.label" defaultMessage="Name" />,
      accessor: 'name',
      minWidth: 160,
      sortable: false,
      Cell: (row) => (
        <a href={ORDER_URL.show(row.original.id)}>{row.value}</a>
      ),
    },
    {
      Header: <Translate id="react.order.list.origin.label" defaultMessage="Origin" />,
      accessor: 'origin.name',
      sortable: false,
      Cell: (row) => (
        <span>
          {row.value}
          {row.original.origin?.organizationCode && ` (${row.original.origin.organizationCode})`}
        </span>
      ),
    },
    {
      Header: <Translate id="react.order.list.destination.label" defaultMessage="Destination" />,
      accessor: 'destination.name',
      sortable: false,
      Cell: (row) => (
        <span>
          {row.value}
          {row.original.destination?.organizationCode && ` (${row.original.destination.organizationCode})`}
        </span>
      ),
    },
    {
      Header: <Translate id="react.order.list.orderedBy.label" defaultMessage="Ordered by" />,
      accessor: 'orderedBy.name',
      sortable: false,
    },
    {
      Header: <Translate id="react.order.list.dateOrdered.label" defaultMessage="Date ordered" />,
      accessor: 'dateOrdered',
      sortable: false,
    },
    {
      Header: <Translate id="react.order.list.lineItems.label" defaultMessage="Line items" />,
      accessor: 'lineItemsCount',
      className: 'text-right',
      maxWidth: 90,
      sortable: false,
    },
    {
      Header: <Translate id="react.order.list.ordered.label" defaultMessage="Ordered" />,
      accessor: 'orderedItemsCount',
      className: 'text-right',
      maxWidth: 90,
      sortable: false,
    },
    {
      Header: <Translate id="react.order.list.shipped.label" defaultMessage="Shipped" />,
      accessor: 'shippedItemsCount',
      className: 'text-right',
      maxWidth: 90,
      sortable: false,
    },
    {
      Header: <Translate id="react.order.list.received.label" defaultMessage="Received" />,
      accessor: 'receivedItemsCount',
      className: 'text-right',
      maxWidth: 90,
      sortable: false,
    },
    {
      Header: <Translate id="react.order.list.totalLocal.label" defaultMessage="Total (local currency)" />,
      accessor: 'total',
      className: 'text-right',
      sortable: false,
      Cell: (row) => (
        <span>
          {row.value != null && `${Number(row.value).toFixed(2)} ${row.original.currencyCode}`}
        </span>
      ),
    },
    {
      Header: <Translate id="react.order.list.totalDefault.label" defaultMessage="Total (default currency)" />,
      accessor: 'totalNormalized',
      className: 'text-right',
      sortable: false,
      Cell: (row) => (
        <span>
          {row.value != null && `${Number(row.value).toFixed(2)} ${defaultCurrencyCode}`}
        </span>
      ),
    },
  ], [defaultCurrencyCode]);

  return (
    <PageWrapper>
      <div className="list-page-header p-3 d-flex align-items-center justify-content-between">
        <h5 className="m-0">
          <Translate id="react.order.list.title.label" defaultMessage="Orders" />
          {currentLocation?.name && ` — ${currentLocation.name}`}
        </h5>
        <div>
          <a className="btn btn-outline-secondary btn-sm mr-2" href={downloadUrl({ downloadOrders: 'csv' })}>
            <Translate id="react.order.list.downloadOrders.label" defaultMessage="Download orders" />
          </a>
          <a className="btn btn-outline-secondary btn-sm" href={downloadUrl({ format: 'csv' })}>
            <Translate id="react.order.list.downloadLineItems.label" defaultMessage="Download line items" />
          </a>
        </div>
      </div>
      <div className="list-page-filters d-flex align-items-end flex-wrap p-3">
        <div className="mr-3">
          <label htmlFor="order-search-filter">
            <Translate id="react.order.list.search.label" defaultMessage="Search" />
          </label>
          <input
            id="order-search-filter"
            className="form-control"
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="mr-3" style={{ minWidth: '180px' }}>
          <label htmlFor="order-status-filter">
            <Translate id="react.order.list.status.label" defaultMessage="Status" />
          </label>
          <Select
            id="order-status-filter"
            options={statusOptions}
            value={status}
            onChange={(value) => setStatus(value)}
          />
        </div>
        <div className="mr-3" style={{ minWidth: '180px' }}>
          <label htmlFor="order-origin-filter">
            <Translate id="react.order.list.origin.label" defaultMessage="Origin" />
          </label>
          <Select
            id="order-origin-filter"
            async
            loadOptions={debouncedLocationsFetch}
            cache={false}
            options={[]}
            value={origin}
            onChange={(value) => setOrigin(value)}
          />
        </div>
        <div className="mr-3" style={{ minWidth: '180px' }}>
          <label htmlFor="order-destination-filter">
            <Translate id="react.order.list.destination.label" defaultMessage="Destination" />
          </label>
          <Select
            id="order-destination-filter"
            async
            loadOptions={debouncedLocationsFetch}
            cache={false}
            options={[]}
            value={destination}
            onChange={(value) => setDestination(value)}
          />
        </div>
        <div className="mr-3" style={{ minWidth: '180px' }}>
          <label htmlFor="order-ordered-by-filter">
            <Translate id="react.order.list.orderedBy.label" defaultMessage="Ordered by" />
          </label>
          <Select
            id="order-ordered-by-filter"
            async
            loadOptions={debouncedUsersFetch}
            cache={false}
            options={[]}
            value={orderedBy}
            onChange={(value) => setOrderedBy(value)}
          />
        </div>
        <div className="mr-3">
          <label htmlFor="order-date-from-filter">
            <Translate id="react.order.list.lastUpdatedAfter.label" defaultMessage="Last updated after" />
          </label>
          <input
            id="order-date-from-filter"
            className="form-control"
            type="date"
            value={statusStartDate}
            onChange={(e) => setStatusStartDate(e.target.value)}
          />
        </div>
        <div className="mr-3">
          <label htmlFor="order-date-to-filter">
            <Translate id="react.order.list.lastUpdatedBefore.label" defaultMessage="Last updated before" />
          </label>
          <input
            id="order-date-to-filter"
            className="form-control"
            type="date"
            value={statusEndDate}
            onChange={(e) => setStatusEndDate(e.target.value)}
          />
        </div>
        <button
          type="button"
          className="btn btn-primary mb-1"
          onClick={() => fetchData(0)}
        >
          <Translate id="react.order.list.search.label" defaultMessage="Search" />
        </button>
      </div>
      <div className="px-3 pb-2 d-flex justify-content-between">
        <Translate
          id="react.order.list.showing.label"
          defaultMessage={`Showing ${totalCount} orders`}
          data={{ count: totalCount }}
        />
        <span data-testid="order-list-total-price">
          <Translate id="react.order.list.totalPrice.label" defaultMessage="Total price" />
          {`: ${Number(totalPrice || 0).toFixed(2)} ${defaultCurrencyCode}`}
        </span>
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
        noDataText={translate('react.order.list.empty.label', 'No orders match the given criteria')}
      />
    </PageWrapper>
  );
};

export default OrderList;

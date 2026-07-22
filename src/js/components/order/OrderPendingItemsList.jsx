import React, { useEffect, useMemo, useState } from 'react';

import { getTranslate } from 'react-localize-redux';
import { useSelector } from 'react-redux';

import orderApi from 'api/services/OrderApi';
import DataTable from 'components/DataTable';
import { ORDER_URL } from 'consts/applicationUrls';
import useTranslation from 'hooks/useTranslation';
import Translate, { translateWithDefaultMessage } from 'utils/Translate';
import PageWrapper from 'wrappers/PageWrapper';

const OrderPendingItemsList = () => {
  useTranslation('order', 'reactTable');

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const { translate } = useSelector((state) => ({
    translate: translateWithDefaultMessage(getTranslate(state.localize)),
  }));

  useEffect(() => {
    orderApi.getPendingItems()
      .then((response) => setData(response.data.data))
      .finally(() => setLoading(false));
  }, []);

  const columns = useMemo(() => [
    {
      Header: <Translate id="react.order.pendingItems.order.label" defaultMessage="Order" />,
      accessor: 'order.name',
      minWidth: 200,
      Cell: (row) => (
        <a href={ORDER_URL.show(row.original.order?.id)}>{row.value}</a>
      ),
    },
    {
      Header: <Translate id="react.order.pendingItems.description.label" defaultMessage="Description" />,
      accessor: 'description',
      minWidth: 240,
    },
    {
      Header: <Translate id="react.order.pendingItems.quantity.label" defaultMessage="Quantity" />,
      accessor: 'quantity',
      className: 'text-right',
      maxWidth: 100,
    },
    {
      Header: <Translate id="react.order.pendingItems.status.label" defaultMessage="Status" />,
      accessor: 'isCompletelyFulfilled',
      maxWidth: 120,
      Cell: (row) => (
        row.value
          ? <Translate id="react.order.pendingItems.complete.label" defaultMessage="Complete" />
          : <Translate id="react.order.pendingItems.pending.label" defaultMessage="Pending" />
      ),
    },
  ], []);

  return (
    <PageWrapper>
      <div className="list-page-header p-3 d-flex align-items-center justify-content-between">
        <h5 className="m-0">
          <Translate id="react.order.pendingItems.title.label" defaultMessage="Pending order items" />
        </h5>
      </div>
      <div className="px-3 pb-2">
        <Translate
          id="react.order.pendingItems.showing.label"
          defaultMessage={`Showing ${data.length} order items`}
          data={{ count: data.length }}
        />
      </div>
      <DataTable
        data={data}
        columns={columns}
        loading={loading}
        defaultPageSize={10}
        showPageSizeOptions={false}
        totalData={data.length}
        noDataText={translate('react.order.pendingItems.empty.label', 'No pending order items')}
      />
    </PageWrapper>
  );
};

export default OrderPendingItemsList;

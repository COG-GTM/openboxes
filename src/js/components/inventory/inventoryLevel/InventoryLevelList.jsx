import React, {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react';

import { getTranslate } from 'react-localize-redux';
import { useSelector } from 'react-redux';

import { INVENTORY_LEVELS_API } from 'api/urls';
import DataTable from 'components/DataTable';
import { INVENTORY_LEVEL_URL } from 'consts/applicationUrls';
import useTranslation from 'hooks/useTranslation';
import apiClient from 'utils/apiClient';
import { fetchLocations } from 'utils/option-utils';
import Select from 'utils/Select';
import Translate, { translateWithDefaultMessage } from 'utils/Translate';
import PageWrapper from 'wrappers/PageWrapper';

import 'components/inventory/styles.scss';

const PAGE_SIZE = 10;

const InventoryLevelList = () => {
  useTranslation('inventoryLevel', 'reactTable');

  const [q, setQ] = useState('');
  const [locations, setLocations] = useState([]);
  const [location, setLocation] = useState(null);
  const [data, setData] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const pageRef = useRef(0);
  const sortedRef = useRef([]);
  const filtersRef = useRef({});

  const { translate } = useSelector((state) => ({
    translate: translateWithDefaultMessage(getTranslate(state.localize)),
  }));

  const fetchData = useCallback(async (
    page = pageRef.current,
    sorted = sortedRef.current,
    filters = filtersRef.current,
  ) => {
    pageRef.current = page;
    sortedRef.current = sorted;
    filtersRef.current = filters;
    setLoading(true);
    const sortColumn = sorted?.[0];
    try {
      const response = await apiClient.get(INVENTORY_LEVELS_API, {
        params: {
          max: PAGE_SIZE,
          offset: page * PAGE_SIZE,
          sort: sortColumn?.id || null,
          order: sortColumn ? (sortColumn.desc && 'desc') || 'asc' : null,
          q: filters.q || null,
          locationId: filters.location?.id || null,
        },
      });
      setData(response.data.data);
      setTotalCount(response.data.totalCount);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLocations({ activityCodes: ['MANAGE_INVENTORY'] })
      .then((fetchedLocations) => setLocations(fetchedLocations));
    fetchData(0);
  }, []);

  const downloadUrl = useMemo(() => {
    const searchParams = new URLSearchParams();
    searchParams.append('format', 'csv');
    if (q) {
      searchParams.append('q', q);
    }
    if (location?.id) {
      searchParams.append('location.id', location.id);
    }
    return `${INVENTORY_LEVEL_URL.list()}?${searchParams.toString()}`;
  }, [q, location]);

  const columns = useMemo(() => [
    {
      Header: <Translate id="react.inventoryLevel.status.label" defaultMessage="Status" />,
      accessor: 'status',
    },
    {
      Header: <Translate id="react.inventoryLevel.productCode.label" defaultMessage="Product Code" />,
      accessor: 'product.productCode',
      sortable: false,
      Cell: (row) => (
        <a href={INVENTORY_LEVEL_URL.edit(row.original.id)}>{row.value}</a>
      ),
    },
    {
      Header: <Translate id="react.inventoryLevel.product.label" defaultMessage="Product" />,
      accessor: 'product.name',
      minWidth: 200,
      sortable: false,
      Cell: (row) => (
        <a href={INVENTORY_LEVEL_URL.edit(row.original.id)}>{row.value}</a>
      ),
    },
    {
      Header: <Translate id="react.inventoryLevel.inventory.label" defaultMessage="Inventory" />,
      accessor: 'inventory.warehouse',
      id: 'inventory',
    },
    {
      Header: <Translate id="react.inventoryLevel.minQuantity.label" defaultMessage="Min Quantity" />,
      accessor: 'minQuantity',
      className: 'text-right',
    },
    {
      Header: <Translate id="react.inventoryLevel.reorderQuantity.label" defaultMessage="Reorder Quantity" />,
      accessor: 'reorderQuantity',
      className: 'text-right',
    },
    {
      Header: <Translate id="react.inventoryLevel.maxQuantity.label" defaultMessage="Max Quantity" />,
      accessor: 'maxQuantity',
      className: 'text-right',
    },
    {
      Header: <Translate id="react.inventoryLevel.dateCreated.label" defaultMessage="Date Created" />,
      accessor: 'dateCreated',
      minWidth: 140,
    },
  ], []);

  return (
    <PageWrapper className="inventory-level-list-page">
      <div className="list-page-header p-3 d-flex align-items-center justify-content-between">
        <h5 className="m-0">
          <Translate id="react.inventoryLevel.list.title.label" defaultMessage="Inventory Levels" />
        </h5>
        <a className="btn btn-outline-primary" href={INVENTORY_LEVEL_URL.create()}>
          <Translate id="react.inventoryLevel.add.label" defaultMessage="Add Inventory Level" />
        </a>
      </div>
      <div className="list-page-filters d-flex align-items-end flex-wrap p-3">
        <div className="mr-3">
          <label htmlFor="inventory-level-product-filter">
            <Translate id="react.inventoryLevel.product.label" defaultMessage="Product" />
          </label>
          <input
            id="inventory-level-product-filter"
            className="form-control"
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="inventory-filter-select mr-3">
          <label htmlFor="inventory-level-location-filter">
            <Translate id="react.inventoryLevel.inventory.label" defaultMessage="Inventory" />
          </label>
          <Select
            id="inventory-level-location-filter"
            options={locations}
            value={location}
            onChange={(value) => setLocation(value)}
          />
        </div>
        <button
          type="button"
          className="btn btn-primary mb-1 mr-2"
          onClick={() => fetchData(0, sortedRef.current, { q, location })}
        >
          <Translate id="react.default.button.search.label" defaultMessage="Search" />
        </button>
        <a className="btn btn-outline-secondary mb-1" href={downloadUrl}>
          <Translate id="react.default.button.download.label" defaultMessage="Download" />
        </a>
      </div>
      <div className="px-3 pb-2">
        <Translate
          id="react.inventoryLevel.showing.label"
          defaultMessage={`Showing ${totalCount} inventory levels`}
          data={{ count: totalCount }}
        />
      </div>
      <DataTable
        manual
        sortable
        data={data}
        columns={columns}
        loading={loading}
        page={pageRef.current}
        pages={Math.max(1, Math.ceil(totalCount / PAGE_SIZE))}
        defaultPageSize={PAGE_SIZE}
        showPageSizeOptions={false}
        onPageChange={(page) => fetchData(page)}
        onSortedChange={(sorted) => fetchData(0, sorted)}
        totalData={totalCount}
        noDataText={translate('react.inventoryLevel.empty.label', 'No inventory levels')}
      />
    </PageWrapper>
  );
};

export default InventoryLevelList;

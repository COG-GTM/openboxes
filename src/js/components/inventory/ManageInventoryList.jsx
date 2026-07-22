import React, { useEffect, useMemo, useState } from 'react';

import { getTranslate } from 'react-localize-redux';
import { useSelector } from 'react-redux';

import { INVENTORY_BIN_LOCATIONS } from 'api/urls';
import DataTable from 'components/DataTable';
import { INVENTORY_ITEM_URL, INVENTORY_URL } from 'consts/applicationUrls';
import useTranslation from 'hooks/useTranslation';
import apiClient from 'utils/apiClient';
import Translate, { translateWithDefaultMessage } from 'utils/Translate';
import PageWrapper from 'wrappers/PageWrapper';

import 'components/inventory/styles.scss';

const ManageInventoryList = () => {
  useTranslation('inventory', 'reactTable');

  const [data, setData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  const { currentLocation, translate } = useSelector((state) => ({
    currentLocation: state.session.currentLocation,
    translate: translateWithDefaultMessage(getTranslate(state.localize)),
  }));

  useEffect(() => {
    if (!currentLocation?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    apiClient.get(INVENTORY_BIN_LOCATIONS(currentLocation.id))
      .then((response) => setData(response.data.data))
      .finally(() => setLoading(false));
  }, [currentLocation?.id]);

  const filteredData = useMemo(() => {
    if (!searchTerm) return data;
    const term = searchTerm.toLowerCase();
    return data.filter((row) => [
      row.product?.productCode,
      row.product?.name,
      row.binLocation?.name,
      row.inventoryItem?.lotNumber,
    ].some((value) => value && value.toLowerCase().includes(term)));
  }, [data, searchTerm]);

  const columns = useMemo(() => [
    {
      Header: <Translate id="react.inventory.productCode.label" defaultMessage="Code" />,
      accessor: 'product.productCode',
      maxWidth: 100,
    },
    {
      Header: <Translate id="react.inventory.product.label" defaultMessage="Product" />,
      accessor: 'product.name',
      minWidth: 250,
      Cell: (row) => (
        <a href={INVENTORY_ITEM_URL.showStockCard(row.original.product.id)}>
          {row.value}
        </a>
      ),
    },
    {
      Header: <Translate id="react.inventory.binLocation.label" defaultMessage="Bin location" />,
      accessor: 'binLocation.name',
    },
    {
      Header: <Translate id="react.inventory.lotNumber.label" defaultMessage="Lot number" />,
      accessor: 'inventoryItem.lotNumber',
    },
    {
      Header: <Translate id="react.inventory.expirationDate.label" defaultMessage="Expiration date" />,
      accessor: 'inventoryItem.expirationDate',
    },
    {
      Header: <Translate id="react.inventory.quantityOnHand.label" defaultMessage="Quantity on hand" />,
      accessor: 'quantityOnHand',
      className: 'text-right',
      maxWidth: 140,
    },
    {
      Header: <Translate id="react.inventory.manage.adjust.label" defaultMessage="Adjust stock" />,
      accessor: 'inventoryItem.id',
      sortable: false,
      Cell: (row) => (
        <a
          href={INVENTORY_URL.editBinLocation({
            productCode: row.original.product?.productCode,
            binLocation: row.original.binLocation?.name,
            lotNumber: row.original.inventoryItem?.lotNumber,
          })}
        >
          <Translate id="react.inventory.manage.adjust.label" defaultMessage="Adjust stock" />
        </a>
      ),
    },
  ], []);

  return (
    <PageWrapper className="inventory-list-page">
      <div className="list-page-header p-3 d-flex align-items-center justify-content-between">
        <h5 className="m-0">
          <Translate id="react.inventory.manage.title.label" defaultMessage="Manage inventory" />
          {currentLocation?.name && ` — ${currentLocation.name}`}
        </h5>
      </div>
      <div className="list-page-filters d-flex align-items-end p-3">
        <div className="mr-3">
          <label htmlFor="manage-inventory-search">
            <Translate id="react.inventory.manage.search.label" defaultMessage="Search" />
          </label>
          <input
            id="manage-inventory-search"
            className="form-control"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      <DataTable
        data={filteredData}
        columns={columns}
        loading={loading}
        sortable
        defaultPageSize={100}
        totalData={filteredData.length}
        noDataText={translate('react.inventory.empty.label', 'No products found')}
      />
    </PageWrapper>
  );
};

export default ManageInventoryList;

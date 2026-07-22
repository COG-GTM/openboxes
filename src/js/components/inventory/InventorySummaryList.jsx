import React, { useEffect, useMemo, useState } from 'react';

import _ from 'lodash';
import PropTypes from 'prop-types';
import { getTranslate } from 'react-localize-redux';
import { useSelector } from 'react-redux';

import { INVENTORY_SUMMARY } from 'api/urls';
import DataTable from 'components/DataTable';
import { INVENTORY_ITEM_URL, INVENTORY_URL } from 'consts/applicationUrls';
import useTranslation from 'hooks/useTranslation';
import apiClient from 'utils/apiClient';
import { fetchProductsCategories } from 'utils/option-utils';
import Select from 'utils/Select';
import Translate, { translateWithDefaultMessage } from 'utils/Translate';
import PageWrapper from 'wrappers/PageWrapper';

import 'components/inventory/styles.scss';

const InventorySummaryList = ({ lowStock, reorderStock }) => {
  useTranslation('inventory', 'reactTable');

  const [categories, setCategories] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [includeSubcategories, setIncludeSubcategories] = useState(true);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const { currentLocation, translate } = useSelector((state) => ({
    currentLocation: state.session.currentLocation,
    translate: translateWithDefaultMessage(getTranslate(state.localize)),
  }));

  // The API nulls pricing fields for non-finance users, so column visibility
  // follows the data rather than duplicating the server-side role check
  const hasRoleFinance = useMemo(() => data.some((row) => row.unitPrice != null), [data]);

  const statusFilter = useMemo(() => {
    if (lowStock) return 'lowStock';
    if (reorderStock) return 'reorderStock';
    return null;
  }, [lowStock, reorderStock]);

  const fetchData = async (categoriesToFilter = selectedCategories) => {
    setLoading(true);
    try {
      const response = await apiClient.get(INVENTORY_SUMMARY(currentLocation?.id), {
        params: {
          categories: categoriesToFilter.map((it) => it.id),
          includeSubcategories,
          status: statusFilter,
        },
        paramsSerializer: (params) => {
          const searchParams = new URLSearchParams();
          Object.entries(params).forEach(([key, value]) => {
            if (value === null || value === undefined) return;
            if (Array.isArray(value)) {
              value.forEach((v) => searchParams.append(key, v));
              return;
            }
            searchParams.append(key, value);
          });
          return searchParams.toString();
        },
      });
      setData(response.data.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductsCategories().then(setCategories);
  }, []);

  useEffect(() => {
    if (currentLocation?.id) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [currentLocation?.id, statusFilter]);

  const downloadUrl = useMemo(() => {
    const searchParams = new URLSearchParams();
    searchParams.append('button', 'download');
    searchParams.append('_includeSubcategories', '');
    if (includeSubcategories) {
      searchParams.append('includeSubcategories', 'on');
    }
    selectedCategories.forEach((it) => searchParams.append('categories', it.id));
    let base = INVENTORY_URL.list();
    if (lowStock) base = INVENTORY_URL.listLowStock();
    if (reorderStock) base = INVENTORY_URL.listReorderStock();
    return `${base}?${searchParams.toString()}`;
  }, [lowStock, reorderStock, includeSubcategories, selectedCategories]);

  const totalValue = useMemo(
    () => data.reduce((acc, row) => acc + (row.totalValue || 0), 0),
    [data],
  );

  const columns = useMemo(() => {
    const cols = [
      {
        Header: <Translate id="react.inventory.status.label" defaultMessage="Status" />,
        accessor: 'status',
        Cell: (row) => (
          <span>
            {translate(`react.inventory.status.${row.value}.label`, _.startCase(_.camelCase(row.value || '')))}
          </span>
        ),
      },
      {
        Header: <Translate id="react.inventory.productCode.label" defaultMessage="Code" />,
        accessor: 'product.productCode',
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
        Header: <Translate id="react.inventory.productFamily.label" defaultMessage="Product Family" />,
        accessor: 'product.productFamily',
      },
      {
        Header: <Translate id="react.inventory.category.label" defaultMessage="Category" />,
        accessor: 'product.category',
      },
      {
        Header: <Translate id="react.inventory.abcClass.label" defaultMessage="ABC" />,
        accessor: 'abcClass',
      },
      {
        Header: <Translate id="react.inventory.unitOfMeasure.label" defaultMessage="UoM" />,
        accessor: 'product.unitOfMeasure',
      },
      {
        Header: <Translate id="react.inventory.minQuantity.label" defaultMessage="Min" />,
        accessor: 'minQuantity',
        className: 'text-right',
      },
      {
        Header: <Translate id="react.inventory.reorderQuantity.label" defaultMessage="Reorder" />,
        accessor: 'reorderQuantity',
        className: 'text-right',
      },
      {
        Header: <Translate id="react.inventory.maxQuantity.label" defaultMessage="Max" />,
        accessor: 'maxQuantity',
        className: 'text-right',
      },
      {
        Header: <Translate id="react.inventory.currentQuantity.label" defaultMessage="Current" />,
        accessor: 'quantityOnHand',
        className: 'text-right',
      },
      {
        Header: <Translate id="react.inventory.quantityAvailableToPromise.label" defaultMessage="Quantity ATP" />,
        accessor: 'quantityAvailableToPromise',
        className: 'text-right',
      },
    ];
    if (hasRoleFinance) {
      cols.push(
        {
          Header: <Translate id="react.inventory.unitPrice.label" defaultMessage="Unit Price" />,
          accessor: 'unitPrice',
          className: 'text-right',
          Cell: (row) => <span>{(row.value || 0).toFixed(2)}</span>,
        },
        {
          Header: <Translate id="react.inventory.totalValue.label" defaultMessage="Total Value" />,
          accessor: 'totalValue',
          className: 'text-right',
          Cell: (row) => <span>{(row.value || 0).toFixed(2)}</span>,
        },
      );
    }
    return cols;
  }, [hasRoleFinance, translate]);

  return (
    <PageWrapper className="inventory-list-page">
      <div className="list-page-header p-3 d-flex align-items-center justify-content-between">
        <h5 className="m-0">
          {lowStock
            && <Translate id="react.inventory.listLowStock.title.label" defaultMessage="Items that are below minimum level" />}
          {reorderStock
            && <Translate id="react.inventory.listReorderStock.title.label" defaultMessage="Items that are below reorder level" />}
          {!lowStock && !reorderStock
            && <Translate id="react.inventory.list.title.label" defaultMessage="Inventory summary" />}
        </h5>
      </div>
      <div className="list-page-filters d-flex align-items-end p-3">
        <div className="inventory-filter-select mr-3">
          <label htmlFor="categories-filter">
            <Translate id="react.inventory.filters.categories.label" defaultMessage="Categories" />
          </label>
          <Select
            id="categories-filter"
            options={categories}
            valueKey="id"
            labelKey="label"
            multi
            value={selectedCategories}
            onChange={(value) => setSelectedCategories(value || [])}
          />
        </div>
        <div className="form-check mb-2 mr-3">
          <input
            id="includeSubcategories"
            className="form-check-input"
            type="checkbox"
            checked={includeSubcategories}
            onChange={(e) => setIncludeSubcategories(e.target.checked)}
          />
          <label className="form-check-label" htmlFor="includeSubcategories">
            <Translate id="react.inventory.filters.includeSubcategories.label" defaultMessage="Include all subcategories" />
          </label>
        </div>
        <button
          type="button"
          className="btn btn-primary mb-1 mr-2"
          onClick={() => fetchData()}
        >
          <Translate id="react.inventory.filters.runReport.label" defaultMessage="Run Report" />
        </button>
        <a className="btn btn-outline-secondary mb-1" href={downloadUrl}>
          <Translate id="react.inventory.filters.download.label" defaultMessage="Download" />
        </a>
      </div>
      {hasRoleFinance && (
        <div className="px-3 pb-2">
          <Translate id="react.inventory.totalValue.label" defaultMessage="Total Value" />
          {': '}
          <strong>{totalValue.toFixed(2)}</strong>
        </div>
      )}
      <DataTable
        data={data}
        columns={columns}
        loading={loading}
        sortable
        defaultPageSize={100}
        totalData={data.length}
        noDataText={translate('react.inventory.empty.label', 'No products found')}
      />
    </PageWrapper>
  );
};

export default InventorySummaryList;

InventorySummaryList.propTypes = {
  lowStock: PropTypes.bool,
  reorderStock: PropTypes.bool,
};

InventorySummaryList.defaultProps = {
  lowStock: false,
  reorderStock: false,
};

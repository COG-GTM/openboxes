import React, { useEffect, useMemo, useState } from 'react';

import { confirmAlert } from 'react-confirm-alert';
import { getTranslate } from 'react-localize-redux';
import { useSelector } from 'react-redux';

import {
  INVENTORY_ITEM_BY_ID,
  INVENTORY_ITEM_RECALL,
  INVENTORY_ITEM_REVERT_RECALL,
  INVENTORY_ITEMS_API,
  PRODUCT_INVENTORY_ITEMS,
} from 'api/urls';
import DataTable from 'components/DataTable';
import StockCardHeader from 'components/inventory/stockCard/StockCardHeader';
import useProductId from 'components/inventory/stockCard/useProductId';
import notification from 'components/Layout/notifications/notification';
import NotificationType from 'consts/notificationTypes';
import useTranslation from 'hooks/useTranslation';
import apiClient from 'utils/apiClient';
import Translate, { translateWithDefaultMessage } from 'utils/Translate';
import PageWrapper from 'wrappers/PageWrapper';

import 'components/inventory/styles.scss';
import 'react-confirm-alert/src/react-confirm-alert.css';

const LotNumbersPage = () => {
  useTranslation('stockCard', 'inventory', 'reactTable');

  const productId = useProductId();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editedRow, setEditedRow] = useState(null);
  const [newRow, setNewRow] = useState(null);

  const { isSuperuser, translate } = useSelector((state) => ({
    isSuperuser: state.session.isSuperuser,
    translate: translateWithDefaultMessage(getTranslate(state.localize)),
  }));

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(PRODUCT_INVENTORY_ITEMS(productId));
      setData(response.data.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (productId) {
      fetchData();
    }
  }, [productId]);

  const handleError = (error) => {
    const message = error?.response?.data?.errorMessage
      || (error?.response?.data?.errorMessages || []).join(', ')
      || translate('react.stockCard.lotNumbers.error.label', 'An error occurred');
    notification(NotificationType.ERROR_OUTLINED)({ message });
  };

  const saveEdit = async () => {
    try {
      await apiClient.put(INVENTORY_ITEM_BY_ID(editedRow.id), {
        lotNumber: editedRow.lotNumber,
        expirationDate: editedRow.expirationDate || null,
      });
      setEditedRow(null);
      fetchData();
    } catch (error) {
      handleError(error);
    }
  };

  const saveNew = async () => {
    try {
      await apiClient.post(INVENTORY_ITEMS_API, {
        product: { id: productId },
        lotNumber: newRow.lotNumber,
        expirationDate: newRow.expirationDate || null,
      });
      setNewRow(null);
      fetchData();
    } catch (error) {
      handleError(error);
    }
  };

  const deleteItem = (row) => {
    confirmAlert({
      title: translate('react.stockCard.lotNumbers.delete.label', 'Delete lot number'),
      message: translate('react.stockCard.lotNumbers.deleteConfirm.label', 'Are you sure you want to delete this lot number?'),
      buttons: [
        {
          label: translate('react.default.yes.label', 'Yes'),
          onClick: async () => {
            try {
              await apiClient.delete(INVENTORY_ITEM_BY_ID(row.id));
              fetchData();
            } catch (error) {
              handleError(error);
            }
          },
        },
        { label: translate('react.default.no.label', 'No') },
      ],
    });
  };

  const recall = async (row, revert) => {
    try {
      await apiClient.post(
        revert ? INVENTORY_ITEM_REVERT_RECALL(row.id) : INVENTORY_ITEM_RECALL(row.id),
      );
      fetchData();
    } catch (error) {
      handleError(error);
    }
  };

  const columns = useMemo(() => [
    {
      Header: <Translate id="react.stockCard.lotNumber.label" defaultMessage="Lot/Serial Number" />,
      accessor: 'lotNumber',
      Cell: (row) => {
        if (editedRow?.id === row.original.id) {
          return (
            <input
              className="form-control form-control-sm"
              value={editedRow.lotNumber || ''}
              onChange={(e) => setEditedRow({ ...editedRow, lotNumber: e.target.value })}
            />
          );
        }
        return <span>{row.value || translate('react.stockCard.default.label', 'Default')}</span>;
      },
    },
    {
      Header: <Translate id="react.stockCard.expirationDate.label" defaultMessage="Expiration Date" />,
      accessor: 'expirationDate',
      Cell: (row) => {
        if (editedRow?.id === row.original.id) {
          return (
            <input
              type="date"
              className="form-control form-control-sm"
              value={editedRow.expirationDate || ''}
              onChange={(e) => setEditedRow({ ...editedRow, expirationDate: e.target.value })}
            />
          );
        }
        return <span>{row.value || translate('react.stockCard.never.label', 'Never')}</span>;
      },
    },
    {
      Header: <Translate id="react.stockCard.status.label" defaultMessage="Status" />,
      accessor: 'lotStatus',
      Cell: (row) => (
        <span>
          {row.value === 'RECALLED'
            ? translate('react.stockCard.recalled.label', 'Recalled')
            : ''}
        </span>
      ),
    },
    {
      Header: <Translate id="react.stockCard.actions.label" defaultMessage="Actions" />,
      accessor: 'id',
      sortable: false,
      Cell: (row) => {
        if (!isSuperuser) {
          return null;
        }
        if (editedRow?.id === row.original.id) {
          return (
            <span>
              <button type="button" className="btn btn-sm btn-primary mr-1" onClick={saveEdit}>
                <Translate id="react.default.button.save.label" defaultMessage="Save" />
              </button>
              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setEditedRow(null)}>
                <Translate id="react.default.button.cancel.label" defaultMessage="Cancel" />
              </button>
            </span>
          );
        }
        return (
          <span>
            <button type="button" className="btn btn-sm btn-outline-primary mr-1" onClick={() => setEditedRow({ ...row.original })}>
              <Translate id="react.default.button.edit.label" defaultMessage="Edit" />
            </button>
            <button type="button" className="btn btn-sm btn-outline-danger mr-1" onClick={() => deleteItem(row.original)}>
              <Translate id="react.default.button.delete.label" defaultMessage="Delete" />
            </button>
            {row.original.lotStatus === 'RECALLED' ? (
              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => recall(row.original, true)}>
                <Translate id="react.stockCard.revertRecall.label" defaultMessage="Revert Recall" />
              </button>
            ) : (
              <button type="button" className="btn btn-sm btn-outline-warning" onClick={() => recall(row.original, false)}>
                <Translate id="react.stockCard.recall.label" defaultMessage="Recall" />
              </button>
            )}
          </span>
        );
      },
    },
  ], [editedRow, isSuperuser, translate]);

  return (
    <PageWrapper className="lot-numbers-page">
      <StockCardHeader productId={productId} activeScreen="lotNumbers" />
      <div className="p-3 d-flex align-items-center justify-content-between">
        <h5 className="m-0">
          <Translate id="react.stockCard.lotNumbers.title.label" defaultMessage="Lot Numbers" />
        </h5>
        {!newRow && (
          <button type="button" className="btn btn-primary" onClick={() => setNewRow({ lotNumber: '', expirationDate: '' })}>
            <Translate id="react.stockCard.lotNumbers.add.label" defaultMessage="Add Lot Number" />
          </button>
        )}
      </div>
      {newRow && (
        <div className="p-3 d-flex align-items-end">
          <div className="mr-2">
            <label htmlFor="new-lot-number">
              <Translate id="react.stockCard.lotNumber.label" defaultMessage="Lot/Serial Number" />
            </label>
            <input
              id="new-lot-number"
              className="form-control"
              value={newRow.lotNumber}
              onChange={(e) => setNewRow({ ...newRow, lotNumber: e.target.value })}
            />
          </div>
          <div className="mr-2">
            <label htmlFor="new-expiration-date">
              <Translate id="react.stockCard.expirationDate.label" defaultMessage="Expiration Date" />
            </label>
            <input
              id="new-expiration-date"
              type="date"
              className="form-control"
              value={newRow.expirationDate}
              onChange={(e) => setNewRow({ ...newRow, expirationDate: e.target.value })}
            />
          </div>
          <button type="button" className="btn btn-primary mr-2" onClick={saveNew}>
            <Translate id="react.default.button.save.label" defaultMessage="Save" />
          </button>
          <button type="button" className="btn btn-outline-secondary" onClick={() => setNewRow(null)}>
            <Translate id="react.default.button.cancel.label" defaultMessage="Cancel" />
          </button>
        </div>
      )}
      <DataTable
        data={data}
        columns={columns}
        loading={loading}
        sortable
        defaultPageSize={20}
        totalData={data.length}
        noDataText={translate('react.stockCard.lotNumbers.empty.label', 'This product has no lot numbers')}
      />
    </PageWrapper>
  );
};

export default LotNumbersPage;

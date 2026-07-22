import React, { useEffect, useMemo, useState } from 'react';

import { getTranslate } from 'react-localize-redux';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';

import locationApi from 'api/services/LocationApi';
import DataTable, { TableCell } from 'components/DataTable';
import { INVENTORY_ITEM_URL, LOCATION_URL } from 'consts/applicationUrls';
import useTranslation from 'hooks/useTranslation';
import Translate, { translateWithDefaultMessage } from 'utils/Translate';
import ListTableTitleWrapper from 'wrappers/ListTableTitleWrapper';
import ListTableWrapper from 'wrappers/ListTableWrapper';
import PageWrapper from 'wrappers/PageWrapper';

const LocationContents = () => {
  useTranslation('location');

  const { locationId } = useParams();

  const [binLocation, setBinLocation] = useState(null);
  const [contents, setContents] = useState([]);
  const [loading, setLoading] = useState(true);

  const { translate } = useSelector((state) => ({
    translate: translateWithDefaultMessage(getTranslate(state.localize)),
  }));

  useEffect(() => {
    setLoading(true);
    locationApi.getContents(locationId)
      .then((response) => {
        setContents(response.data.data ?? []);
        setBinLocation(response.data.binLocation);
      })
      .finally(() => setLoading(false));
  }, [locationId]);

  const columns = useMemo(() => [
    {
      Header: <Translate id="react.location.column.product.label" defaultMessage="Product" />,
      accessor: 'product.name',
      minWidth: 300,
      Cell: (row) => (
        <TableCell
          {...row}
          tooltip
          value={`${row.original.product?.productCode ?? ''} ${row.original.product?.name ?? ''}`.trim()}
          link={INVENTORY_ITEM_URL.showStockCard(row.original.product?.id)}
        />
      ),
    },
    {
      Header: <Translate id="react.location.column.lotNumber.label" defaultMessage="Lot Number" />,
      accessor: 'inventoryItem.lotNumber',
      minWidth: 150,
      Cell: (row) => <TableCell {...row} tooltip />,
    },
    {
      Header: <Translate id="react.location.column.expirationDate.label" defaultMessage="Expiration Date" />,
      accessor: 'inventoryItem.expirationDate',
      minWidth: 150,
      Cell: (row) => <TableCell {...row} />,
    },
    {
      Header: <Translate id="react.location.column.quantity.label" defaultMessage="Quantity" />,
      accessor: 'quantity',
      minWidth: 100,
      className: 'text-right',
      Cell: (row) => <TableCell {...row} />,
    },
  ], []);

  return (
    <PageWrapper>
      <ListTableWrapper>
        <ListTableTitleWrapper>
          <span>
            <Translate id="react.location.contents.label" defaultMessage="Contents" />
            {binLocation?.name ? `: ${binLocation.name}` : ''}
            &nbsp;
            (
            {contents.length}
            )
          </span>
          <a className="btn btn-outline-primary btn-xs" href={LOCATION_URL.edit(locationId)}>
            <Translate id="react.location.backToLocation.label" defaultMessage="Back to location" />
          </a>
        </ListTableTitleWrapper>
        <DataTable
          columns={columns}
          data={contents}
          loading={loading}
          defaultPageSize={10}
          noDataText={translate('react.location.empty.label', 'Empty')}
        />
      </ListTableWrapper>
    </PageWrapper>
  );
};

export default LocationContents;

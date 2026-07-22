import React, { useMemo } from 'react';

import PropTypes from 'prop-types';
import { useSelector } from 'react-redux';
import { useHistory } from 'react-router-dom';

import DataTable, { TableCell } from 'components/DataTable';
import Button from 'components/form-elements/Button';
import { LOCATION_URL } from 'consts/applicationUrls';
import useLocationListTableData from 'hooks/list-pages/location/useLocationListTableData';
import StatusIndicator from 'utils/StatusIndicator';
import Translate from 'utils/Translate';
import splitTranslation from 'utils/translation-utils';
import ListTableTitleWrapper from 'wrappers/ListTableTitleWrapper';
import ListTableWrapper from 'wrappers/ListTableWrapper';

const LocationListTable = ({ filterParams }) => {
  const {
    tableRef,
    tableData,
    onFetchHandler,
    loading,
  } = useLocationListTableData(filterParams);

  const history = useHistory();

  const { locale } = useSelector((state) => ({
    locale: state.session.activeLanguage,
  }));

  const columns = useMemo(() => [
    {
      Header: <Translate id="react.location.column.name.label" defaultMessage="Name" />,
      accessor: 'name',
      minWidth: 250,
      Cell: (row) => (
        <TableCell
          {...row}
          tooltip
          link={LOCATION_URL.edit(row.original.id)}
        />
      ),
    },
    {
      Header: <Translate id="react.location.column.locationNumber.label" defaultMessage="Location Number" />,
      accessor: 'locationNumber',
      minWidth: 150,
      Cell: (row) => <TableCell {...row} tooltip />,
    },
    {
      Header: <Translate id="react.location.column.locationType.label" defaultMessage="Location Type" />,
      accessor: 'locationType.name',
      minWidth: 150,
      sortable: false,
      Cell: (row) => (
        <TableCell
          {...row}
          value={splitTranslation(row.original.locationType?.name, locale)}
        />
      ),
    },
    {
      Header: <Translate id="react.location.column.locationGroup.label" defaultMessage="Location Group" />,
      accessor: 'locationGroup.name',
      minWidth: 150,
      sortable: false,
      Cell: (row) => <TableCell {...row} tooltip />,
    },
    {
      Header: <Translate id="react.location.column.organization.label" defaultMessage="Organization" />,
      accessor: 'organization.name',
      minWidth: 150,
      sortable: false,
      Cell: (row) => <TableCell {...row} tooltip />,
    },
    {
      Header: <Translate id="react.location.column.supportedActivities.label" defaultMessage="Supported Activities" />,
      accessor: 'supportedActivities',
      minWidth: 250,
      sortable: false,
      Cell: (row) => (
        <TableCell
          {...row}
          tooltip
          value={(row.original.supportedActivities ?? []).join(', ')}
        />
      ),
    },
    {
      Header: <Translate id="react.location.column.status.label" defaultMessage="Status" />,
      accessor: 'active',
      minWidth: 100,
      maxWidth: 150,
      sortable: false,
      className: 'active-circle d-flex justify-content-center',
      headerClassName: 'header justify-content-center',
      Cell: (row) => (
        <StatusIndicator
          variant={row.original.active ? 'success' : 'danger'}
          status={row.original.active ? 'Active' : 'Inactive'}
        />
      ),
    },
    {
      Header: <Translate id="react.location.column.color.label" defaultMessage="Color" />,
      accessor: 'bgColor',
      width: 80,
      sortable: false,
      Cell: (row) => (
        <div
          className="d-flex align-items-center justify-content-center h-100 w-100"
          style={{
            backgroundColor: row.original.bgColor || 'transparent',
            color: row.original.fgColor || 'inherit',
          }}
        >
          {row.original.name?.substring(0, 3)}
        </div>
      ),
    },
  ], [locale]);

  return (
    <ListTableWrapper>
      <ListTableTitleWrapper>
        <span>
          <Translate id="react.location.listLocations.label" defaultMessage="List Locations" />
          &nbsp;
          (
          {tableData?.totalCount}
          )
        </span>
        <Button
          defaultLabel="Add location"
          label="react.location.addLocation.label"
          variant="primary"
          onClick={() => {
            history.push(LOCATION_URL.create());
          }}
        />
      </ListTableTitleWrapper>
      <DataTable
        manual
        sortable
        ref={tableRef}
        columns={columns}
        data={tableData.data}
        loading={loading}
        defaultPageSize={10}
        pages={tableData.pages}
        totalData={tableData.totalCount}
        onFetchData={onFetchHandler}
        noDataText="No locations match the given criteria"
        footerComponent={() => (
          <span className="title-text p-1 d-flex flex-1 justify-content-end" />
        )}
      />
    </ListTableWrapper>
  );
};

export default LocationListTable;

LocationListTable.propTypes = {
  filterParams: PropTypes.shape({}).isRequired,
};

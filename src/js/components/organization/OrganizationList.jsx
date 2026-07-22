import React, { useEffect, useMemo, useState } from 'react';

import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';

import organizationApi from 'api/services/OrganizationApi';
import { ORGANIZATION_SEARCH_API } from 'api/urls';
import DataTable, { TableCell } from 'components/DataTable';
import Button from 'components/form-elements/Button';
import SelectField from 'components/form-elements/v2/SelectField';
import { ORGANIZATION_URL } from 'consts/applicationUrls';
import useTableData from 'hooks/list-pages/useTableData';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import StatusIndicator from 'utils/StatusIndicator';
import Translate from 'utils/Translate';

const OrganizationList = () => {
  useTranslation('organization', 'reactTable', 'default');

  const translate = useTranslate();

  const isUserAdmin = useSelector((state) => state.session.isUserAdmin);

  const [searchTerm, setSearchTerm] = useState('');
  const [roleTypes, setRoleTypes] = useState([]);
  const [roleTypeOptions, setRoleTypeOptions] = useState([]);
  const [filterParams, setFilterParams] = useState({ q: '', roleType: [] });

  useEffect(() => {
    organizationApi.getOrganizationRoleTypeOptions()
      .then((response) => {
        setRoleTypeOptions(response?.data?.data?.map((option) => ({
          id: option.id,
          value: option.id,
          label: option.label,
        })) ?? []);
      });
  }, []);

  const getParams = ({ offset, state, sortingParams }) => ({
    offset: `${offset}`,
    max: `${state.pageSize}`,
    ...sortingParams,
    ...(filterParams.q ? { q: filterParams.q } : {}),
    ...(filterParams.roleType?.length ? { roleType: filterParams.roleType } : {}),
  });

  const {
    tableRef,
    loading,
    tableData,
    onFetchHandler,
  } = useTableData({
    filterParams,
    url: ORGANIZATION_SEARCH_API,
    errorMessageId: 'react.organization.fetch.fail.label',
    defaultErrorMessage: 'Unable to fetch organizations',
    defaultSorting: {
      sort: 'name',
      order: 'asc',
    },
    getParams,
  });

  const columns = useMemo(() => [
    {
      Header: <Translate id="react.organization.column.active.label" defaultMessage="Active" />,
      accessor: 'active',
      className: 'active-circle d-flex justify-content-center align-items-center',
      headerClassName: 'header justify-content-center',
      maxWidth: 150,
      Cell: (row) => (<StatusIndicator status={row.value ? 'Active' : 'Inactive'} variant={row.value ? 'success' : 'danger'} />),
    },
    {
      Header: <Translate id="react.organization.column.code.label" defaultMessage="Code" />,
      accessor: 'code',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
      maxWidth: 150,
      Cell: (row) => <TableCell {...row} link={ORGANIZATION_URL.edit(row.original.id)} />,
    },
    {
      Header: <Translate id="react.organization.column.name.label" defaultMessage="Name" />,
      accessor: 'name',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
      Cell: (row) => <TableCell {...row} link={ORGANIZATION_URL.edit(row.original.id)} />,
    },
    {
      Header: <Translate id="react.organization.column.defaultLocation.label" defaultMessage="Default Location" />,
      accessor: 'defaultLocation',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
      sortable: false,
    },
    {
      Header: <Translate id="react.organization.column.roles.label" defaultMessage="Roles" />,
      accessor: 'roles',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
      sortable: false,
      Cell: (row) => <TableCell {...row} value={(row.value ?? []).join(', ')} link={ORGANIZATION_URL.show(row.original.id)} />,
    },
  ], []);

  return (
    <div className="d-flex flex-column list-page-main">
      <div className="d-flex list-page-header">
        <span className="d-flex align-self-center title">
          <Translate id="react.organization.list.label" defaultMessage="List Organizations" />
        </span>
        <div className="d-flex justify-content-end buttons align-items-center">
          <a
            href={ORGANIZATION_URL.download({
              ...(filterParams.q ? { q: filterParams.q } : {}),
              ...(filterParams.roleType?.length ? { roleType: filterParams.roleType } : {}),
            })}
          >
            <Button
              defaultLabel="Download"
              label="react.default.button.download.label"
              variant="secondary"
            />
          </a>
          {isUserAdmin && (
            <Link to={ORGANIZATION_URL.create()}>
              <Button
                defaultLabel="Add Organization"
                label="react.organization.addOrganization.label"
                variant="primary"
              />
            </Link>
          )}
        </div>
      </div>
      <div className="list-page-list-section">
        <div className="title-text p-3 d-flex justify-content-between align-items-center">
          <span>
            <Translate id="react.organization.list.label" defaultMessage="List Organizations" />
          </span>
          <form
            className="d-flex align-items-center gap-8"
            onSubmit={(e) => {
              e.preventDefault();
              setFilterParams({
                q: searchTerm,
                roleType: roleTypes.map((option) => option.id),
              });
            }}
          >
            <div style={{ minWidth: '250px' }} data-testid="role-type-select">
              <SelectField
                multiple
                placeholder={translate('react.organization.filterByRoleType.label', 'Filter by role type')}
                options={roleTypeOptions}
                value={roleTypes}
                onChange={(value) => setRoleTypes(value ?? [])}
              />
            </div>
            <input
              className="form-control"
              type="text"
              placeholder={translate('react.organization.searchByName.label', 'Search organizations')}
              aria-label={translate('react.organization.searchByName.label', 'Search organizations')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Button
              type="submit"
              defaultLabel="Find"
              label="react.default.button.find.label"
              variant="primary-outline"
            />
          </form>
        </div>
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
          noDataText={translate('react.organization.empty.label', 'No organizations match the given criteria')}
        />
      </div>
    </div>
  );
};

export default OrganizationList;

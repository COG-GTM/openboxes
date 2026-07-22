import React, { useEffect, useMemo, useState } from 'react';

import _ from 'lodash';
import { Link, useHistory } from 'react-router-dom';
import Alert from 'react-s-alert';

import attributeApi from 'api/services/AttributeApi';
import Button from 'components/form-elements/Button';
import { ATTRIBUTE_URL } from 'consts/applicationUrls';
import RoleType from 'consts/roleType';
import useQueryParams from 'hooks/useQueryParams';
import useSpinner from 'hooks/useSpinner';
import useTranslation from 'hooks/useTranslation';
import useUserHasPermissions from 'hooks/useUserHasPermissions';
import Translate from 'utils/Translate';
import PageWrapper from 'wrappers/PageWrapper';

import './styles.scss';

const PAGE_SIZE = 10;

const formatBoolean = (value) => (value ? 'true' : 'false');

const AttributeList = () => {
  useTranslation('attribute', 'default');
  const history = useHistory();
  const queryParams = useQueryParams();
  const spinner = useSpinner();
  const isAdmin = useUserHasPermissions({ minRequiredRole: RoleType.ROLE_ADMIN });

  const [attributes, setAttributes] = useState([]);
  const [searchTerm, setSearchTerm] = useState(queryParams?.q ?? '');
  const [sort, setSort] = useState({ column: 'name', order: 'asc' });
  const [page, setPage] = useState(0);

  const fetchAttributes = async (q) => {
    spinner.show();
    try {
      const { data } = await attributeApi.searchAttributes({
        params: { q: q || null, includeInactive: true },
      });
      setAttributes(data?.data ?? []);
      setPage(0);
    } catch (error) {
      Alert.error(error.response?.data?.errorMessage ?? 'Unable to load attributes');
    } finally {
      spinner.hide();
    }
  };

  useEffect(() => {
    fetchAttributes(queryParams?.q ?? '');
  }, [queryParams?.q]);

  const onSearchSubmit = (event) => {
    event.preventDefault();
    history.push(`${ATTRIBUTE_URL.list()}?q=${encodeURIComponent(searchTerm)}`);
  };

  const onSortColumn = (column) => {
    setSort((prevSort) => ({
      column,
      order: prevSort.column === column && prevSort.order === 'asc' ? 'desc' : 'asc',
    }));
    setPage(0);
  };

  const sortedAttributes = useMemo(() => {
    const sorted = _.sortBy(attributes, (attribute) => {
      const value = attribute[sort.column];
      if (sort.column === 'options') {
        return attribute.options?.length ?? 0;
      }
      return typeof value === 'string' ? value.toLowerCase() : value;
    });
    return sort.order === 'desc' ? sorted.reverse() : sorted;
  }, [attributes, sort]);

  const pagedAttributes = useMemo(
    () => sortedAttributes.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [sortedAttributes, page],
  );

  const pageCount = Math.ceil(sortedAttributes.length / PAGE_SIZE);

  const columns = [
    { id: 'code', label: 'react.attribute.column.code.label', defaultLabel: 'Code' },
    { id: 'name', label: 'react.attribute.column.name.label', defaultLabel: 'Name' },
    { id: 'entityTypeCode', label: 'react.attribute.column.entityTypeCode.label', defaultLabel: 'Entity Type' },
    { id: 'options', label: 'react.attribute.column.options.label', defaultLabel: 'Options' },
    { id: 'active', label: 'react.attribute.column.active.label', defaultLabel: 'Active' },
    { id: 'required', label: 'react.attribute.column.required.label', defaultLabel: 'Required' },
    { id: 'allowOther', label: 'react.attribute.column.allowOther.label', defaultLabel: 'Allow Free-Text' },
  ];

  return (
    <PageWrapper>
      <div className="d-flex flex-column attribute-page p-3">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h3 className="mb-0">
            <Translate id="react.attribute.list.title.label" defaultMessage="Attributes" />
          </h3>
          <div className="d-flex gap-8">
            {isAdmin && (
              <Button
                label="react.attribute.addAttribute.label"
                defaultLabel="Add attribute"
                variant="primary"
                onClick={() => history.push(ATTRIBUTE_URL.create())}
              />
            )}
          </div>
        </div>
        <form className="d-flex align-items-center mb-3 gap-8" onSubmit={onSearchSubmit}>
          <input
            type="text"
            className="form-control attribute-search-input"
            data-testid="attribute-search-input"
            placeholder="Name"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
          <Button
            label="react.default.button.search.label"
            defaultLabel="Search"
            variant="primary-outline"
            type="submit"
          />
        </form>
        <div className="table-responsive">
          <table className="table table-striped table-sm" data-testid="attribute-list-table">
            <thead>
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.id}
                    className="attribute-sortable-column"
                    onClick={() => onSortColumn(column.id)}
                  >
                    <Translate id={column.label} defaultMessage={column.defaultLabel} />
                    {sort.column === column.id && (sort.order === 'asc' ? ' ▲' : ' ▼')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pagedAttributes.map((attribute) => (
                <tr key={attribute.id}>
                  <td><Link to={ATTRIBUTE_URL.edit(attribute.id)}>{attribute.code}</Link></td>
                  <td><Link to={ATTRIBUTE_URL.edit(attribute.id)}>{attribute.name}</Link></td>
                  <td>{attribute.entityTypeCode}</td>
                  <td>
                    {attribute.options?.length ?? 0}
                    {' '}
                    <Translate id="react.attribute.column.options.label" defaultMessage="Options" />
                  </td>
                  <td>{formatBoolean(attribute.active)}</td>
                  <td>{formatBoolean(attribute.required)}</td>
                  <td>{formatBoolean(attribute.allowOther)}</td>
                </tr>
              ))}
              {!pagedAttributes.length && (
                <tr>
                  <td colSpan={columns.length} className="text-center">
                    <Translate id="react.default.noResults.label" defaultMessage="No results found" />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {pageCount > 1 && (
          <div className="d-flex justify-content-center gap-8">
            {_.range(pageCount).map((pageNumber) => (
              <button
                key={pageNumber}
                type="button"
                className={`btn btn-sm ${pageNumber === page ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setPage(pageNumber)}
              >
                {pageNumber + 1}
              </button>
            ))}
          </div>
        )}
      </div>
    </PageWrapper>
  );
};

export default AttributeList;

import React, {
  useEffect, useMemo, useRef, useState,
} from 'react';

import { confirmAlert } from 'react-confirm-alert';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';

import { hideSpinner, showSpinner } from 'actions';
import localizationOverrideApi from 'api/services/LocalizationOverrideApi';
import { LOCALIZATION_OVERRIDE_API } from 'api/urls';
import DataTable, { TableCell } from 'components/DataTable';
import DateCell from 'components/DataTable/DateCell';
import Button from 'components/form-elements/Button';
import notification from 'components/Layout/notifications/notification';
import { LOCALIZATION_URL } from 'consts/applicationUrls';
import NotificationType from 'consts/notificationTypes';
import useTableData from 'hooks/list-pages/useTableData';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';

const LocalizationList = () => {
  useTranslation('localization', 'reactTable', 'default');

  const translate = useTranslate();
  const dispatch = useDispatch();

  const isUserAdmin = useSelector((state) => state.session.isUserAdmin);
  const activeLanguage = useSelector((state) => state.session.activeLanguage);

  const [localeOptions, setLocaleOptions] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [locale, setLocale] = useState(activeLanguage || 'en');
  const [filterParams, setFilterParams] = useState({ q: '', locale: activeLanguage || 'en' });
  const [showImport, setShowImport] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    localizationOverrideApi.getLocaleOptions()
      .then((response) => setLocaleOptions(response?.data?.data ?? []));
  }, []);

  const getParams = ({ offset, state, sortingParams }) => ({
    offset: `${offset}`,
    max: `${state.pageSize}`,
    ...sortingParams,
    locale: filterParams.locale,
    ...(filterParams.q ? { q: filterParams.q } : {}),
  });

  const {
    tableRef,
    loading,
    tableData,
    onFetchHandler,
  } = useTableData({
    filterParams,
    url: LOCALIZATION_OVERRIDE_API,
    errorMessageId: 'react.localization.fetch.fail.label',
    defaultErrorMessage: 'Unable to fetch localizations',
    defaultSorting: {
      sort: 'code',
      order: 'asc',
    },
    getParams,
  });

  const refetchList = () => {
    setFilterParams({ q: searchTerm, locale });
  };

  const deleteLocalization = async (id) => {
    dispatch(showSpinner());
    try {
      const { status } = await localizationOverrideApi.deleteLocalization(id);
      if (status === 204) {
        notification(NotificationType.SUCCESS)({
          message: translate('react.localization.delete.success.label', 'Localization has been deleted successfully'),
        });
        refetchList();
      }
    } finally {
      dispatch(hideSpinner());
    }
  };

  const onDelete = (id) => {
    confirmAlert({
      title: translate('react.default.areYouSure.label', 'Are you sure?'),
      message: translate(
        'react.localization.delete.confirm.label',
        'Are you sure you want to delete this localization?',
      ),
      buttons: [
        { label: translate('react.default.yes.label', 'Yes'), onClick: () => deleteLocalization(id) },
        { label: translate('react.default.no.label', 'No') },
      ],
    });
  };

  const onImport = async (e) => {
    e.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      notification(NotificationType.ERROR_OUTLINED)({
        message: translate('react.localization.import.missingFile.label', 'Please select a messages.properties file to import'),
      });
      return;
    }
    const formData = new FormData();
    formData.append('locale', locale);
    formData.append('messageProperties', file);
    dispatch(showSpinner());
    try {
      await localizationOverrideApi.importLocalizations(formData);
      notification(NotificationType.SUCCESS)({
        message: translate(
          'react.localization.import.success.label',
          'Localizations have been imported successfully',
        ),
      });
      setShowImport(false);
      refetchList();
    } finally {
      dispatch(hideSpinner());
    }
  };

  const columns = useMemo(() => [
    {
      Header: <Translate id="react.localization.column.id.label" defaultMessage="Id" />,
      accessor: 'id',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
      maxWidth: 150,
      Cell: (row) => <TableCell {...row} link={LOCALIZATION_URL.edit(row.original.id)} />,
    },
    {
      Header: <Translate id="react.localization.column.code.label" defaultMessage="Code" />,
      accessor: 'code',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
      Cell: (row) => <TableCell {...row} link={LOCALIZATION_URL.edit(row.original.id)} />,
    },
    {
      Header: <Translate id="react.localization.column.locale.label" defaultMessage="Locale" />,
      accessor: 'locale',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
      maxWidth: 100,
    },
    {
      Header: <Translate id="react.localization.column.text.label" defaultMessage="Text" />,
      accessor: 'text',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
    },
    {
      Header: <Translate id="react.localization.column.dateCreated.label" defaultMessage="Date Created" />,
      accessor: 'dateCreated',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
      Cell: (row) => <DateCell {...row} />,
    },
    {
      Header: <Translate id="react.localization.column.lastUpdated.label" defaultMessage="Last Updated" />,
      accessor: 'lastUpdated',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
      Cell: (row) => <DateCell {...row} />,
    },
    {
      Header: <Translate id="react.localization.column.actions.label" defaultMessage="Actions" />,
      accessor: 'actions',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
      sortable: false,
      maxWidth: 120,
      Cell: (row) => row.original && (
        <Button
          defaultLabel="Delete"
          label="react.default.button.delete.label"
          variant="danger-outline"
          onClick={() => onDelete(row.original.id)}
        />
      ),
    },
  ], [filterParams]);

  return (
    <div className="d-flex flex-column list-page-main">
      <div className="d-flex list-page-header">
        <span className="d-flex align-self-center title">
          <Translate id="react.localization.list.label" defaultMessage="List Localizations" />
        </span>
        {isUserAdmin && (
          <div className="d-flex justify-content-end buttons align-items-center gap-8">
            <Link to={LOCALIZATION_URL.create()}>
              <Button
                defaultLabel="Add Localization"
                label="react.localization.addLocalization.label"
                variant="primary"
              />
            </Link>
            <a href={LOCALIZATION_URL.export(filterParams.locale)}>
              <Button
                defaultLabel="Export Localizations"
                label="react.localization.exportLocalizations.label"
                variant="primary-outline"
              />
            </a>
            <Button
              defaultLabel="Import Localizations"
              label="react.localization.importLocalizations.label"
              variant="primary-outline"
              onClick={() => setShowImport(!showImport)}
            />
          </div>
        )}
      </div>
      {showImport && (
        <div className="list-page-list-section mb-2">
          <form className="d-flex align-items-center gap-8 p-3" onSubmit={onImport}>
            <span className="font-weight-bold">
              <Translate id="react.localization.importLocalizations.label" defaultMessage="Import Localizations" />
            </span>
            <input
              type="file"
              ref={fileInputRef}
              accept=".properties"
              aria-label={translate('react.localization.selectFile.label', 'Select file')}
            />
            <Button
              type="submit"
              defaultLabel="Upload"
              label="react.default.button.upload.label"
              variant="primary"
            />
          </form>
        </div>
      )}
      <div className="list-page-list-section">
        <div className="title-text p-3 d-flex justify-content-between align-items-center">
          <span>
            <Translate id="react.localization.list.label" defaultMessage="List Localizations" />
            {` (${tableData.totalCount})`}
          </span>
          <form
            className="d-flex align-items-center gap-8"
            onSubmit={(e) => {
              e.preventDefault();
              refetchList();
            }}
          >
            <select
              className="form-control"
              aria-label={translate('react.localization.locale.label', 'Locale')}
              value={locale}
              onChange={(e) => setLocale(e.target.value)}
            >
              <option value="">{translate('react.localization.allLocales.label', 'All locales')}</option>
              {localeOptions.map((option) => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </select>
            <input
              className="form-control"
              type="text"
              placeholder={translate('react.localization.searchByCodeOrText.label', 'Search by code or text')}
              aria-label={translate('react.localization.searchByCodeOrText.label', 'Search by code or text')}
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
          noDataText={translate('react.localization.empty.label', 'No localizations match the given criteria')}
        />
      </div>
    </div>
  );
};

export default LocalizationList;

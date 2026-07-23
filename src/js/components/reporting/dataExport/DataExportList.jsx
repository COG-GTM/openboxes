import React, { useEffect, useState } from 'react';

import { useDispatch } from 'react-redux';

import { hideSpinner, showSpinner } from 'actions';
import reportApi from 'api/services/ReportApi';
import notification from 'components/Layout/notifications/notification';
import Section from 'components/Layout/v2/Section';
import { DATA_EXPORT_URL } from 'consts/applicationUrls';
import NotificationType from 'consts/notificationTypes';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';
import HeaderWrapper from 'wrappers/HeaderWrapper';
import PageWrapper from 'wrappers/PageWrapper';

const DataExportList = () => {
  useTranslation('dataExport', 'default');

  const dispatch = useDispatch();
  const translate = useTranslate();
  const [documents, setDocuments] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      dispatch(showSpinner());
      try {
        const response = await reportApi.getDataExports();
        setDocuments(response?.data?.data ?? []);
      } catch (error) {
        notification(NotificationType.ERROR)({
          message: translate('react.dataExport.fetchError.label', 'Unable to load data exports'),
        });
      } finally {
        dispatch(hideSpinner());
      }
    };
    fetchData();
  }, []);

  return (
    <PageWrapper>
      <HeaderWrapper className="align-items-center h-auto py-3">
        <span className="title">
          <Translate id="react.dataExport.label" defaultMessage="Data Exports" />
        </span>
      </HeaderWrapper>
      <div className="p-3">
        <Section
          title={{ label: 'react.dataExport.label', defaultMessage: 'Data Exports' }}
        >
          <table className="table table-sm" data-testid="data-export-list">
            <tbody>
              {documents.map((document) => (
                <tr key={document.id}>
                  <td className="align-middle">{document.name}</td>
                  <td className="text-right">
                    <a
                      className="btn btn-outline-primary btn-sm mr-2"
                      href={DATA_EXPORT_URL.render(document.id, 'csv')}
                    >
                      CSV
                    </a>
                    <a
                      className="btn btn-outline-primary btn-sm"
                      href={DATA_EXPORT_URL.render(document.id, 'json')}
                    >
                      JSON
                    </a>
                  </td>
                </tr>
              ))}
              {!documents.length && (
                <tr>
                  <td colSpan={2} className="text-center text-muted">
                    <Translate id="react.dataExport.noExports.label" defaultMessage="No data exports" />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Section>
      </div>
    </PageWrapper>
  );
};

export default DataExportList;

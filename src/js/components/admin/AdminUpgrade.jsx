import React, { useEffect, useState } from 'react';

import { getTranslate } from 'react-localize-redux';
import { useDispatch, useSelector } from 'react-redux';
import Alert from 'react-s-alert';

import { hideSpinner, showSpinner } from 'actions';
import adminApi from 'api/services/AdminApi';
import Translate, { translateWithDefaultMessage } from 'utils/Translate';
import PageWrapper from 'wrappers/PageWrapper';

const AdminUpgrade = () => {
  const dispatch = useDispatch();
  const [upgrade, setUpgrade] = useState(null);
  const [remoteWebArchiveUrl, setRemoteWebArchiveUrl] = useState('');
  const [localWebArchivePath, setLocalWebArchivePath] = useState('');

  const { translate } = useSelector((state) => ({
    translate: translateWithDefaultMessage(getTranslate(state.localize)),
  }));

  const applyUpgradeState = (data) => {
    setUpgrade(data);
    if (data?.remoteWebArchiveUrl) {
      setRemoteWebArchiveUrl(data.remoteWebArchiveUrl);
    }
    if (data?.localWebArchivePath) {
      setLocalWebArchivePath(data.localWebArchivePath);
    }
  };

  useEffect(() => {
    adminApi.getUpgrade().then((response) => applyUpgradeState(response.data.data));
  }, []);

  const download = () => {
    dispatch(showSpinner());
    adminApi.downloadUpgrade({ remoteWebArchiveUrl })
      .then((response) => {
        dispatch(hideSpinner());
        applyUpgradeState(response.data.data);
        if (response.data.message) {
          Alert.success(response.data.message, { timeout: 5000 });
        }
      })
      .catch(() => dispatch(hideSpinner()));
  };

  const deploy = () => {
    dispatch(showSpinner());
    adminApi.deployUpgrade({ localWebArchivePath })
      .then((response) => {
        dispatch(hideSpinner());
        applyUpgradeState(response.data.data);
        Alert.success(translate('react.admin.upgrade.deploySuccess.label', 'Web archive has been deployed'), { timeout: 5000 });
      })
      .catch(() => dispatch(hideSpinner()));
  };

  return (
    <PageWrapper>
      <div className="classic-form with-description">
        <div className="form-title">
          <Translate id="react.admin.upgrade.label" defaultMessage="Upgrade" />
        </div>
        <div className="d-flex flex-column p-3" style={{ gap: '12px' }}>
          <div className="form-group">
            <label htmlFor="remoteWebArchiveUrl" className="font-weight-bold">
              <Translate id="react.admin.upgrade.downloadWar.label" defaultMessage="Download web archive (WAR)" />
            </label>
            <div className="d-flex align-items-center" style={{ gap: '8px' }}>
              <input
                id="remoteWebArchiveUrl"
                type="text"
                className="form-control"
                style={{ maxWidth: '600px' }}
                value={remoteWebArchiveUrl}
                onChange={(e) => setRemoteWebArchiveUrl(e.target.value)}
              />
              <button
                type="button"
                id="downloadButton"
                className="btn btn-outline-primary"
                onClick={download}
              >
                <Translate id="react.admin.upgrade.download.label" defaultMessage="Download" />
              </button>
            </div>
          </div>
          {upgrade?.remoteWebArchiveUrl && (
            <div id="downloadDetails">
              <div className="font-weight-bold">
                <Translate id="react.admin.upgrade.downloadDetails.label" defaultMessage="Download details" />
              </div>
              <ul>
                <li>
                  <Translate id="react.admin.upgrade.remoteFileSize.label" defaultMessage="Remote file size" />
                  {': '}
                  {upgrade.remoteFileSize}
                </li>
                <li>
                  <Translate id="react.admin.upgrade.localFileSize.label" defaultMessage="Local file size" />
                  {': '}
                  {upgrade.localFileSize ?? 0}
                </li>
                <li id="progressPercentage">
                  {upgrade.progressPercentage}
                  %
                  {' '}
                  <Translate id="react.admin.upgrade.complete.label" defaultMessage="complete" />
                </li>
                {upgrade.downloadCancelled && (
                  <li><Translate id="react.admin.upgrade.downloadCancelled.label" defaultMessage="Download was cancelled" /></li>
                )}
                {upgrade.downloadDone && (
                  <li><Translate id="react.admin.upgrade.downloadComplete.label" defaultMessage="Download is complete" /></li>
                )}
              </ul>
            </div>
          )}
          <div className="form-group">
            <label htmlFor="localWebArchivePath" className="font-weight-bold">
              <Translate id="react.admin.upgrade.deployWar.label" defaultMessage="Deploy web archive (WAR)" />
            </label>
            <div className="d-flex align-items-center" style={{ gap: '8px' }}>
              <input
                id="localWebArchivePath"
                type="text"
                className="form-control"
                style={{ maxWidth: '600px' }}
                value={localWebArchivePath}
                onChange={(e) => setLocalWebArchivePath(e.target.value)}
              />
              <button
                type="button"
                id="deployButton"
                className="btn btn-outline-primary"
                disabled={!upgrade?.downloadDone}
                onClick={deploy}
              >
                <Translate id="react.admin.upgrade.deploy.label" defaultMessage="Deploy" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
};

export default AdminUpgrade;

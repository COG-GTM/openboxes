import React, { useEffect, useState } from 'react';

import { getTranslate } from 'react-localize-redux';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory, useParams } from 'react-router-dom';
import Alert from 'react-s-alert';

import { hideSpinner, showSpinner } from 'actions';
import locationApi from 'api/services/LocationApi';
import { LOCATION_URL } from 'consts/applicationUrls';
import useTranslation from 'hooks/useTranslation';
import { convertToBase64 } from 'utils/file-utils';
import Translate, { translateWithDefaultMessage } from 'utils/Translate';
import PageWrapper from 'wrappers/PageWrapper';

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/gif'];
const MAX_SIZE = 1024 * 1000;

const LocationUploadLogo = () => {
  useTranslation('location');

  const { locationId } = useParams();
  const history = useHistory();
  const dispatch = useDispatch();

  const [location, setLocation] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [logoVersion, setLogoVersion] = useState(0);

  const { translate } = useSelector((state) => ({
    translate: translateWithDefaultMessage(getTranslate(state.localize)),
  }));

  const fetchLocation = () => {
    locationApi.getLocationDetails(locationId)
      .then((response) => setLocation(response.data.data));
  };

  useEffect(() => {
    fetchLocation();
  }, [locationId]);

  const uploadLogo = () => {
    if (!logoFile) {
      return;
    }
    if (!ALLOWED_TYPES.includes(logoFile.type)) {
      Alert.error(translate('react.location.uploadLogo.invalidType.label', `Photo must be one of: ${ALLOWED_TYPES.join(', ')}`));
      return;
    }
    if (logoFile.size >= MAX_SIZE) {
      Alert.error(translate('react.location.uploadLogo.tooLarge.label', 'Photo is too large (must be less than 1 MB)'));
      return;
    }
    dispatch(showSpinner());
    convertToBase64(logoFile)
      .then((logo) => locationApi.updateLocation(locationId, { logo }))
      .then(() => {
        dispatch(hideSpinner());
        Alert.success(translate('react.location.uploadLogo.success.label', 'Logo has been uploaded successfully!'), { timeout: 3000 });
        setLogoFile(null);
        setLogoVersion((version) => version + 1);
        fetchLocation();
      })
      .catch(() => {
        dispatch(hideSpinner());
        return Promise.reject(new Error(translate('react.location.uploadLogo.error.label', 'Could not upload logo')));
      });
  };

  const deleteLogo = () => {
    dispatch(showSpinner());
    locationApi.deleteLogo(locationId)
      .then(() => {
        dispatch(hideSpinner());
        Alert.success(translate('react.location.deleteLogo.success.label', 'Logo has been deleted'), { timeout: 3000 });
        setLogoVersion((version) => version + 1);
        fetchLocation();
      })
      .catch(() => {
        dispatch(hideSpinner());
        return Promise.reject(new Error(translate('react.location.deleteLogo.error.label', 'Could not delete logo')));
      });
  };

  return (
    <PageWrapper>
      <div className="classic-form with-description">
        <div className="form-title">
          <Translate id="react.location.uploadLogo.label" defaultMessage="Upload Logo" />
          {location?.name ? `: ${location.name}` : ''}
        </div>
        <div className="form-subtitle">
          <Translate
            id="react.location.uploadLogo.description.label"
            defaultMessage="Upload a logo for this location. Acceptable formats are PNG, JPEG and GIF. Images must be less than 1 MB."
          />
        </div>
        <div className="d-flex flex-column p-3" style={{ gap: '12px' }}>
          <div className="d-flex align-items-center" style={{ gap: '12px' }}>
            <span className="font-weight-bold">
              <Translate id="react.location.currentLogo.label" defaultMessage="Current logo" />
              :
            </span>
            {location?.hasLogo
              ? (
                <>
                  <img
                    src={`${LOCATION_URL.viewLogo(locationId)}?v=${logoVersion}`}
                    alt={location?.name}
                    style={{ maxHeight: '128px' }}
                  />
                  <button
                    type="button"
                    className="btn btn-outline-danger btn-xs"
                    onClick={deleteLogo}
                  >
                    <i className="fa fa-trash-o mr-1" aria-hidden="true" />
                    <Translate id="react.location.deleteLogo.label" defaultMessage="Delete logo" />
                  </button>
                </>
              )
              : <Translate id="react.default.none.label" defaultMessage="None" />}
          </div>
          <div className="d-flex align-items-center" style={{ gap: '12px' }}>
            <input
              type="file"
              accept={ALLOWED_TYPES.join(',')}
              onChange={(event) => setLogoFile(event.target.files?.[0] ?? null)}
            />
          </div>
          <div className="submit-buttons d-flex" style={{ gap: '3px' }}>
            <button
              type="button"
              className="btn btn-primary btn-xs"
              disabled={!logoFile}
              onClick={uploadLogo}
            >
              <i className="fa fa-photo mr-1" aria-hidden="true" />
              <Translate id="react.location.uploadLogo.button.label" defaultMessage="Upload logo" />
            </button>
            <button
              type="button"
              className="btn btn-outline-primary btn-xs"
              onClick={() => history.push(LOCATION_URL.edit(locationId))}
            >
              <Translate id="react.default.button.cancel.label" defaultMessage="Cancel" />
            </button>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
};

export default LocationUploadLogo;

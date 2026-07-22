import React, { useEffect, useState } from 'react';

import Alert from 'react-s-alert';

import productApi from 'api/services/ProductApi';
import useQueryParams from 'hooks/useQueryParams';
import useSpinner from 'hooks/useSpinner';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';
import PageWrapper from 'wrappers/PageWrapper';

import './styles.scss';

const ProductBatchEditProperties = () => {
  useTranslation('product', 'default');
  const queryParams = useQueryParams();
  const spinner = useSpinner();

  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    (async () => {
      spinner.show();
      try {
        const { data } = await productApi.getBatchEditProducts({ params: queryParams });
        setTotalCount(data?.totalCount ?? 0);
      } catch (error) {
        Alert.error(error.response?.data?.errorMessage ?? 'Unable to load products');
      } finally {
        spinner.hide();
      }
    })();
  }, []);

  return (
    <PageWrapper>
      <div className="d-flex flex-column product-page p-3">
        <h2 data-testid="batch-edit-properties-title">
          <Translate id="react.default.results.label" defaultMessage="Results" />
        </h2>
        <div data-testid="batch-edit-properties-count">
          {totalCount}
        </div>
      </div>
    </PageWrapper>
  );
};

export default ProductBatchEditProperties;

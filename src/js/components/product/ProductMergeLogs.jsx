import React, { useEffect, useState } from 'react';

import Alert from 'react-s-alert';

import productApi from 'api/services/ProductApi';
import Button from 'components/form-elements/Button';
import useSpinner from 'hooks/useSpinner';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';
import PageWrapper from 'wrappers/PageWrapper';

import './styles.scss';

const PAGE_SIZE = 10;

const ProductMergeLogs = () => {
  useTranslation('product', 'default');
  const spinner = useSpinner();
  const translate = useTranslate();

  const [mergeLogs, setMergeLogs] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [primaryProductCode, setPrimaryProductCode] = useState('');
  const [obsoleteProductCode, setObsoleteProductCode] = useState('');
  const [page, setPage] = useState(0);

  const fetchMergeLogs = async (pageToFetch = 0) => {
    spinner.show();
    try {
      const { data } = await productApi.getMergeLogs({
        params: {
          primaryProductCode: primaryProductCode || null,
          obsoleteProductCode: obsoleteProductCode || null,
          max: PAGE_SIZE,
          offset: pageToFetch * PAGE_SIZE,
        },
      });
      setMergeLogs(data?.data ?? []);
      setTotalCount(data?.totalCount ?? 0);
      setPage(pageToFetch);
    } catch (error) {
      Alert.error(error.response?.data?.errorMessage ?? 'Unable to load product merge logs');
    } finally {
      spinner.hide();
    }
  };

  useEffect(() => {
    fetchMergeLogs(0);
  }, []);

  const onSearch = (event) => {
    event.preventDefault();
    fetchMergeLogs(0);
  };

  const pageCount = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <PageWrapper>
      <div className="d-flex flex-column product-page p-3">
        <h3 className="mb-3" data-testid="merge-logs-title">
          <Translate id="react.product.mergeLogs.title.label" defaultMessage="Product Merge Logs" />
        </h3>
        <form className="d-flex align-items-center mb-3 gap-8" onSubmit={onSearch} data-testid="merge-logs-filters">
          <input
            type="text"
            className="form-control merge-log-filter-input"
            data-testid="primary-product-code-input"
            placeholder="Search by primary product code"
            value={primaryProductCode}
            onChange={(event) => setPrimaryProductCode(event.target.value)}
          />
          <input
            type="text"
            className="form-control merge-log-filter-input"
            data-testid="obsolete-product-code-input"
            placeholder="Search by obsolete product code"
            value={obsoleteProductCode}
            onChange={(event) => setObsoleteProductCode(event.target.value)}
          />
          <Button
            type="submit"
            label="react.default.button.search.label"
            defaultLabel="Search"
            variant="primary"
          />
        </form>
        <div className="mb-2" data-testid="merge-logs-count">
          <Translate id="react.default.results.label" defaultMessage="Results" />
          {`: ${totalCount}`}
        </div>
        <table className="table table-sm" data-testid="merge-logs-table">
          <thead>
            <tr>
              <th>{translate('react.product.mergeLogs.logId.label', 'Log ID')}</th>
              <th>{translate('react.product.mergeLogs.primaryProduct.label', 'Primary Product')}</th>
              <th>{translate('react.product.mergeLogs.obsoleteProduct.label', 'Obsolete Product')}</th>
              <th>{translate('react.product.mergeLogs.relatedObjectId.label', 'Related Object ID')}</th>
              <th>{translate('react.product.mergeLogs.relatedObjectClassName.label', 'Related Object class name')}</th>
              <th>{translate('react.product.mergeLogs.dateMerged.label', 'Date Merged')}</th>
              <th>{translate('react.product.mergeLogs.createdBy.label', 'Created By')}</th>
            </tr>
          </thead>
          <tbody>
            {mergeLogs.map((mergeLog) => (
              <tr key={mergeLog.id}>
                <td>{mergeLog.id}</td>
                <td>{mergeLog.primaryProduct?.productCode}</td>
                <td>{mergeLog.obsoleteProduct?.productCode}</td>
                <td>{mergeLog.relatedObjectId}</td>
                <td>{mergeLog.relatedObjectClassName}</td>
                <td>{mergeLog.dateMerged}</td>
                <td>{mergeLog.createdBy}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {pageCount > 1 && (
          <div className="d-flex align-items-center gap-8">
            <Button
              label="react.default.button.previous.label"
              defaultLabel="Previous"
              variant="primary-outline"
              disabled={page === 0}
              onClick={() => fetchMergeLogs(page - 1)}
            />
            <span>{`${page + 1} / ${pageCount}`}</span>
            <Button
              label="react.default.button.next.label"
              defaultLabel="Next"
              variant="primary-outline"
              disabled={page + 1 >= pageCount}
              onClick={() => fetchMergeLogs(page + 1)}
            />
          </div>
        )}
      </div>
    </PageWrapper>
  );
};

export default ProductMergeLogs;

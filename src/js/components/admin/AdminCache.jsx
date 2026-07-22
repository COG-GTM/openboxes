import React, { useEffect, useState } from 'react';

import adminApi from 'api/services/AdminApi';
import Button from 'components/form-elements/Button';
import notification from 'components/Layout/notifications/notification';
import Section from 'components/Layout/v2/Section';
import NotificationType from 'consts/notificationTypes';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';
import HeaderWrapper from 'wrappers/HeaderWrapper';
import PageWrapper from 'wrappers/PageWrapper';

const AdminCache = () => {
  useTranslation('admin', 'default');

  const translate = useTranslate();

  const [cache, setCache] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchCache = async () => {
    setLoading(true);
    try {
      const response = await adminApi.getCache();
      setCache(response?.data?.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCache();
  }, []);

  const evictDomain = async (name) => {
    const response = await adminApi.evictDomainCache(name);
    notification(NotificationType.SUCCESS)({
      message: response?.data?.data?.message,
    });
    fetchCache();
  };

  const evictQueries = async (name) => {
    const response = await adminApi.evictQueryCache(name);
    notification(NotificationType.SUCCESS)({
      message: response?.data?.data?.message,
    });
    fetchCache();
  };

  if (loading) {
    return (
      <PageWrapper>
        <div className="text-center text-muted p-3">
          <Translate id="react.default.loading.label" defaultMessage="Loading..." />
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <HeaderWrapper className="align-items-center h-auto py-3">
        <span className="title">
          <Translate id="react.admin.cache.label" defaultMessage="Cache" />
        </span>
      </HeaderWrapper>
      <div className="p-3">
        <Section
          title={{ label: 'react.admin.cache.settings.label', defaultMessage: 'Cache settings' }}
        >
          <table className="table table-sm" data-testid="cache-settings">
            <tbody>
              <tr>
                <td>{translate('react.admin.cache.enabled.label', 'Cached enabled?')}</td>
                <td style={{ wordBreak: 'break-all' }}>{cache?.hibernateConfig}</td>
              </tr>
              <tr>
                <td>{translate('react.admin.cache.statistics.label', 'Cache statistics')}</td>
                <td style={{ wordBreak: 'break-all' }}>{cache?.statistics}</td>
              </tr>
            </tbody>
          </table>
        </Section>
        <Section
          title={{ label: 'react.admin.cache.secondLevel.label', defaultMessage: 'Second-level cache statistics' }}
        >
          <table className="table table-sm" data-testid="cache-second-level">
            <thead>
              <tr>
                <th>{translate('react.admin.cache.regionName.label', 'Region name')}</th>
                <th>{translate('react.admin.cache.hitCount.label', 'Hit count')}</th>
                <th>{translate('react.admin.cache.missCount.label', 'Miss count')}</th>
                <th>{translate('react.admin.cache.putCount.label', 'Put count')}</th>
                <th>{translate('react.admin.cache.elementCountInMemory.label', 'Element Count In Memory')}</th>
                <th>{translate('react.admin.cache.elementCountOnDisk.label', 'Element Count On Disk')}</th>
                <th>{translate('react.admin.cache.sizeInMemory.label', 'Size In Memory')}</th>
                <th aria-label="actions" />
              </tr>
            </thead>
            <tbody>
              {(cache?.secondLevelCache ?? []).map((region) => (
                <tr key={region.regionName}>
                  <td>{region.regionName}</td>
                  <td className="text-center">{region.hitCount}</td>
                  <td className="text-center">{region.missCount}</td>
                  <td className="text-center">{region.putCount}</td>
                  <td className="text-center">{region.elementCountInMemory}</td>
                  <td className="text-center">{region.elementCountOnDisk}</td>
                  <td className="text-center">{region.sizeInMemory}</td>
                  <td>
                    <Button
                      defaultLabel="Evict"
                      label="react.admin.cache.evict.label"
                      variant="secondary"
                      onClick={() => evictDomain(region.regionName)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
        <Section
          title={{ label: 'react.admin.cache.queryCache.label', defaultMessage: 'Query cache statistics' }}
        >
          <div className="pb-2">
            <Button
              defaultLabel="Evict all"
              label="react.admin.cache.evictAll.label"
              variant="secondary"
              onClick={() => evictQueries()}
            />
          </div>
          <table className="table table-sm" data-testid="cache-queries">
            <thead>
              <tr>
                <th>{translate('react.admin.cache.queryName.label', 'Region')}</th>
                <th>{translate('react.admin.cache.hits.label', 'Hits')}</th>
                <th>{translate('react.admin.cache.misses.label', 'Misses')}</th>
                <th>{translate('react.admin.cache.puts.label', 'Puts')}</th>
                <th>{translate('react.admin.cache.executionCount.label', 'Count')}</th>
                <th>{translate('react.admin.cache.executionMinTime.label', 'Min Time')}</th>
                <th>{translate('react.admin.cache.executionMaxTime.label', 'Max Time')}</th>
                <th>{translate('react.admin.cache.executionAvgTime.label', 'Avg Time')}</th>
                <th>{translate('react.admin.cache.executionRowCount.label', 'Row Count')}</th>
                <th aria-label="actions" />
              </tr>
            </thead>
            <tbody>
              {(cache?.queries ?? []).map((query) => (
                <tr key={query.queryName}>
                  <td style={{ wordBreak: 'break-all' }}>{query.queryName}</td>
                  <td className="text-center">{query.cacheHitCount}</td>
                  <td className="text-center">{query.cacheMissCount}</td>
                  <td className="text-center">{query.cachePutCount}</td>
                  <td className="text-center">{query.executionCount}</td>
                  <td className="text-center">{query.executionMinTime}</td>
                  <td className="text-center">{query.executionMaxTime}</td>
                  <td className="text-center">{query.executionAvgTime}</td>
                  <td className="text-center">{query.executionRowCount}</td>
                  <td>
                    <Button
                      defaultLabel="Evict"
                      label="react.admin.cache.evict.label"
                      variant="secondary"
                      onClick={() => evictQueries(query.queryName)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
        <Section
          title={{ label: 'react.admin.cache.entityCache.label', defaultMessage: 'Entity cache statistics' }}
        >
          <table className="table table-sm" data-testid="cache-entities">
            <thead>
              <tr>
                <th>{translate('react.admin.cache.entityName.label', 'Entity')}</th>
                <th>{translate('react.admin.cache.loadCount.label', 'Loads')}</th>
                <th>{translate('react.admin.cache.deleteCount.label', 'Deletes')}</th>
                <th>{translate('react.admin.cache.fetchCount.label', 'Fetches')}</th>
                <th>{translate('react.admin.cache.insertCount.label', 'Inserts')}</th>
                <th>{translate('react.admin.cache.updateCount.label', 'Updates')}</th>
                <th>{translate('react.admin.cache.optimisticFailureCount.label', 'Optimistic failures')}</th>
              </tr>
            </thead>
            <tbody>
              {(cache?.entities ?? []).map((entity) => (
                <tr key={entity.entityName}>
                  <td>{entity.entityName}</td>
                  <td className="text-center">{entity.loadCount}</td>
                  <td className="text-center">{entity.deleteCount}</td>
                  <td className="text-center">{entity.fetchCount}</td>
                  <td className="text-center">{entity.insertCount}</td>
                  <td className="text-center">{entity.updateCount}</td>
                  <td className="text-center">{entity.optimisticFailureCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      </div>
    </PageWrapper>
  );
};

export default AdminCache;

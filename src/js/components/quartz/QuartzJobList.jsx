import React, { useCallback, useEffect, useState } from 'react';

import { useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';

import { hideSpinner, showSpinner } from 'actions';
import jobApi from 'api/services/JobApi';
import Button from 'components/form-elements/Button';
import notification from 'components/Layout/notifications/notification';
import { JOB_URL } from 'consts/applicationUrls';
import NotificationType from 'consts/notificationTypes';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';
import HeaderWrapper from 'wrappers/HeaderWrapper';
import PageWrapper from 'wrappers/PageWrapper';

const formatDate = (value) => (value ? new Date(value).toLocaleString() : '');

const QuartzJobList = () => {
  useTranslation('job', 'default');

  const dispatch = useDispatch();
  const translate = useTranslate();

  const [schedulerInStandbyMode, setSchedulerInStandbyMode] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchJobs = useCallback(() => {
    jobApi.getJobs()
      .then((response) => {
        setSchedulerInStandbyMode(response?.data?.data?.schedulerInStandbyMode);
        setJobs(response?.data?.data?.jobs ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const withSpinner = async (call, successMessage) => {
    dispatch(showSpinner());
    try {
      await call();
      notification(NotificationType.SUCCESS)({ message: successMessage });
      fetchJobs();
    } finally {
      dispatch(hideSpinner());
    }
  };

  const isJobPaused = (job) =>
    job.triggers?.length > 0 && job.triggers.every((trigger) => trigger.state === 'PAUSED');

  return (
    <PageWrapper>
      <HeaderWrapper className="align-items-center h-auto py-3">
        <span className="title">
          <Translate id="react.job.list.label" defaultMessage="Quartz Jobs" />
        </span>
        <div className="d-flex justify-content-end buttons align-items-center gap-8">
          {schedulerInStandbyMode === false && (
            <Button
              defaultLabel="Pause scheduler"
              label="react.job.pauseScheduler.label"
              variant="danger-outline"
              onClick={() => withSpinner(
                jobApi.standbyScheduler,
                translate('react.job.scheduler.standby.success.label', 'Scheduler has been put in standby mode'),
              )}
            />
          )}
          {schedulerInStandbyMode === true && (
            <Button
              defaultLabel="Start scheduler"
              label="react.job.startScheduler.label"
              variant="primary"
              onClick={() => withSpinner(
                jobApi.startScheduler,
                translate('react.job.scheduler.start.success.label', 'Scheduler has been started'),
              )}
            />
          )}
        </div>
      </HeaderWrapper>
      <div className="p-3">
        {schedulerInStandbyMode && (
          <div className="alert alert-warning" role="alert">
            <Translate
              id="react.job.scheduler.standby.label"
              defaultMessage="The scheduler is in standby mode - no jobs will run until it is started"
            />
          </div>
        )}
        {loading ? (
          <div className="text-center text-muted p-3">
            <Translate id="react.default.loading.label" defaultMessage="Loading..." />
          </div>
        ) : (
          <table className="table table-sm" data-testid="quartz-jobs">
            <thead>
              <tr>
                <th aria-label={translate('react.job.name.label', 'Name')}>
                  <Translate id="react.job.name.label" defaultMessage="Name" />
                </th>
                <th aria-label={translate('react.job.triggerName.label', 'Trigger Name')}>
                  <Translate id="react.job.triggerName.label" defaultMessage="Trigger Name" />
                </th>
                <th aria-label={translate('react.job.lastRun.label', 'Last Run')}>
                  <Translate id="react.job.lastRun.label" defaultMessage="Last Run" />
                </th>
                <th aria-label={translate('react.job.nextScheduledRun.label', 'Next Scheduled Run')}>
                  <Translate id="react.job.nextScheduledRun.label" defaultMessage="Next Scheduled Run" />
                </th>
                <th aria-label={translate('react.job.actions.label', 'Actions')}>
                  <Translate id="react.job.actions.label" defaultMessage="Actions" />
                </th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={`${job.group}:${job.name}`}>
                  <td>
                    <Link to={JOB_URL.show(job.name)}>{job.name}</Link>
                  </td>
                  <td>{job.triggers?.map((trigger) => trigger.name).join(', ')}</td>
                  <td>
                    {formatDate(job.triggers
                      ?.map((trigger) => trigger.previousFireTime)
                      .filter(Boolean)
                      .sort()
                      .pop())}
                  </td>
                  <td>
                    {formatDate(job.triggers
                      ?.map((trigger) => trigger.nextFireTime)
                      .filter(Boolean)
                      .sort()
                      .shift())}
                  </td>
                  <td>
                    <div className="d-flex gap-8">
                      <Button
                        defaultLabel="Run now"
                        label="react.job.runNow.label"
                        variant="primary-outline"
                        onClick={() => withSpinner(
                          () => jobApi.runJobNow(job.name, job.group),
                          translate('react.job.runNow.success.label', 'Job has been triggered'),
                        )}
                      />
                      {job.triggers?.length > 0 && (isJobPaused(job) ? (
                        <Button
                          defaultLabel="Resume"
                          label="react.job.resume.label"
                          variant="primary-outline"
                          onClick={() => withSpinner(
                            () => jobApi.resumeJob(job.name, job.group),
                            translate('react.job.resume.success.label', 'Job has been resumed'),
                          )}
                        />
                      ) : (
                        <Button
                          defaultLabel="Pause"
                          label="react.job.pause.label"
                          variant="danger-outline"
                          onClick={() => withSpinner(
                            () => jobApi.pauseJob(job.name, job.group),
                            translate('react.job.pause.success.label', 'Job has been paused'),
                          )}
                        />
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
              {!jobs.length && (
                <tr>
                  <td colSpan={5}>
                    <Translate id="react.job.noJobs.label" defaultMessage="There are no jobs" />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </PageWrapper>
  );
};

export default QuartzJobList;

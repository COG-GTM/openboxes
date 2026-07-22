import React, { useCallback, useEffect, useState } from 'react';

import { confirmAlert } from 'react-confirm-alert';
import { useDispatch } from 'react-redux';
import { useLocation, useParams } from 'react-router-dom';

import { hideSpinner, showSpinner } from 'actions';
import jobApi from 'api/services/JobApi';
import Button from 'components/form-elements/Button';
import notification from 'components/Layout/notifications/notification';
import Section from 'components/Layout/v2/Section';
import { JOB_URL } from 'consts/applicationUrls';
import NotificationType from 'consts/notificationTypes';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';
import HeaderWrapper from 'wrappers/HeaderWrapper';
import PageWrapper from 'wrappers/PageWrapper';

const formatDate = (value) => (value ? new Date(value).toLocaleString() : '');

const JobShow = () => {
  useTranslation('job', 'default');

  const { jobName } = useParams();
  const { search } = useLocation();
  const dispatch = useDispatch();
  const translate = useTranslate();

  const group = new URLSearchParams(search).get('group') ?? undefined;

  const [job, setJob] = useState(null);
  const [cronExpression, setCronExpression] = useState('');

  const fetchJob = useCallback(() => {
    jobApi.getJob(jobName, group)
      .then((response) => setJob(response?.data?.data));
  }, [jobName, group]);

  useEffect(() => {
    fetchJob();
  }, [fetchJob]);

  const onAddTrigger = async (e) => {
    e.preventDefault();
    dispatch(showSpinner());
    try {
      await jobApi.createTrigger({
        jobName,
        ...(group ? { jobGroup: group } : {}),
        cronExpression,
      });
      notification(NotificationType.SUCCESS)({
        message: translate('react.job.trigger.create.success.label', 'Trigger has been scheduled successfully'),
      });
      setCronExpression('');
      fetchJob();
    } finally {
      dispatch(hideSpinner());
    }
  };

  const deleteTrigger = async (trigger) => {
    dispatch(showSpinner());
    try {
      const { status } = await jobApi.deleteTrigger(trigger.name, trigger.group);
      if (status === 204) {
        notification(NotificationType.SUCCESS)({
          message: translate('react.job.trigger.delete.success.label', 'Trigger has been deleted successfully'),
        });
        fetchJob();
      }
    } finally {
      dispatch(hideSpinner());
    }
  };

  const onDeleteTrigger = (trigger) => {
    confirmAlert({
      title: translate('react.default.areYouSure.label', 'Are you sure?'),
      message: translate(
        'react.job.trigger.delete.confirm.label',
        'Are you sure you want to delete this trigger?',
      ),
      buttons: [
        { label: translate('react.default.yes.label', 'Yes'), onClick: () => deleteTrigger(trigger) },
        { label: translate('react.default.no.label', 'No') },
      ],
    });
  };

  const details = [
    { label: 'react.job.name.label', defaultMessage: 'Name', value: job?.name },
    { label: 'react.job.group.label', defaultMessage: 'Group', value: job?.group },
    { label: 'react.job.jobClass.label', defaultMessage: 'Job Class', value: job?.jobClass },
    { label: 'react.job.description.label', defaultMessage: 'Description', value: job?.description },
    {
      label: 'react.job.durable.label',
      defaultMessage: 'Durable',
      value: job == null ? '' : String(job.durable),
    },
    {
      label: 'react.job.concurrentExecutionDisallowed.label',
      defaultMessage: 'Concurrent Execution Disallowed',
      value: job == null ? '' : String(job.concurrentExecutionDisallowed),
    },
    {
      label: 'react.job.requestsRecovery.label',
      defaultMessage: 'Requests Recovery',
      value: job == null ? '' : String(job.requestsRecovery),
    },
  ];

  return (
    <PageWrapper>
      <HeaderWrapper className="align-items-center h-auto py-3">
        <span className="title">
          <Translate id="react.job.show.label" defaultMessage="Job" />
          {job?.key ? `: ${job.key}` : ''}
        </span>
        <div className="d-flex justify-content-end buttons align-items-center gap-8">
          <a href={JOB_URL.backgroundJobSettings()}>
            <Button
              defaultLabel="Back to Settings"
              label="react.job.backToSettings.label"
              variant="primary-outline"
            />
          </a>
          <a href={JOB_URL.quartzList()}>
            <Button
              defaultLabel="List Jobs"
              label="react.job.listJobs.label"
              variant="primary-outline"
            />
          </a>
        </div>
      </HeaderWrapper>
      <div className="p-3">
        <Section
          title={{ label: 'react.job.detailsSection.label', defaultMessage: 'Job Details' }}
        >
          <table className="table table-sm w-auto" data-testid="job-details">
            <tbody>
              {details.map((detail) => (
                <tr key={detail.label}>
                  <td className="font-weight-bold pr-4">
                    <Translate id={detail.label} defaultMessage={detail.defaultMessage} />
                  </td>
                  <td aria-label={detail.defaultMessage}>{detail.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
        <Section
          title={{ label: 'react.job.triggersSection.label', defaultMessage: 'Triggers' }}
        >
          <table className="table table-sm" data-testid="job-triggers">
            <thead>
              <tr>
                <th aria-label={translate('react.job.trigger.id.label', 'ID')}>
                  <Translate id="react.job.trigger.id.label" defaultMessage="ID" />
                </th>
                <th aria-label={translate('react.job.trigger.summary.label', 'Summary')}>
                  <Translate id="react.job.trigger.summary.label" defaultMessage="Summary" />
                </th>
                <th aria-label={translate('react.job.trigger.previousFireTime.label', 'Previous fire time')}>
                  <Translate id="react.job.trigger.previousFireTime.label" defaultMessage="Previous fire time" />
                </th>
                <th aria-label={translate('react.job.trigger.nextFireTime.label', 'Next fire time')}>
                  <Translate id="react.job.trigger.nextFireTime.label" defaultMessage="Next fire time" />
                </th>
                <th aria-label={translate('react.job.trigger.actions.label', 'Actions')}>
                  <Translate id="react.job.trigger.actions.label" defaultMessage="Actions" />
                </th>
              </tr>
            </thead>
            <tbody>
              {(job?.triggers ?? []).map((trigger) => (
                <tr key={trigger.key}>
                  <td>{trigger.key}</td>
                  <td>
                    {trigger.cronExpression
                      ? `${trigger.cronExpression} (${trigger.expressionSummary})`
                      : ''}
                  </td>
                  <td>{formatDate(trigger.previousFireTime)}</td>
                  <td>{formatDate(trigger.nextFireTime)}</td>
                  <td>
                    <Button
                      defaultLabel="Delete"
                      label="react.default.button.delete.label"
                      variant="danger-outline"
                      onClick={() => onDeleteTrigger(trigger)}
                    />
                  </td>
                </tr>
              ))}
              {job && !job.triggers?.length && (
                <tr>
                  <td colSpan={5}>
                    <Translate
                      id="react.job.noTriggers.label"
                      defaultMessage="There are no triggers for this job"
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <form className="d-flex align-items-center gap-8 pt-3" onSubmit={onAddTrigger}>
            <input
              className="form-control"
              type="text"
              placeholder="0 0 22 * * ?"
              aria-label={translate('react.job.cronExpression.label', 'Cron expression')}
              value={cronExpression}
              onChange={(e) => setCronExpression(e.target.value)}
            />
            <Button
              type="submit"
              defaultLabel="Add trigger"
              label="react.job.addTrigger.label"
              variant="primary"
              disabled={!cronExpression}
            />
          </form>
        </Section>
      </div>
    </PageWrapper>
  );
};

export default JobShow;

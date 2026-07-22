import React, { useEffect, useState } from 'react';

import { confirmAlert } from 'react-confirm-alert';
import { Controller, useForm } from 'react-hook-form';
import { useDispatch } from 'react-redux';
import { useHistory, useParams } from 'react-router-dom';

import { hideSpinner, showSpinner } from 'actions';
import organizationApi from 'api/services/OrganizationApi';
import Button from 'components/form-elements/Button';
import Checkbox from 'components/form-elements/v2/Checkbox';
import SelectField from 'components/form-elements/v2/SelectField';
import TextInput from 'components/form-elements/v2/TextInput';
import notification from 'components/Layout/notifications/notification';
import Section from 'components/Layout/v2/Section';
import { CONTEXT_PATH, ORGANIZATION_URL } from 'consts/applicationUrls';
import NotificationType from 'consts/notificationTypes';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';
import HeaderWrapper from 'wrappers/HeaderWrapper';
import PageWrapper from 'wrappers/PageWrapper';

const OrganizationForm = () => {
  useTranslation('organization', 'default');

  const { organizationId } = useParams();
  const history = useHistory();
  const dispatch = useDispatch();
  const translate = useTranslate();

  const [partyTypeOptions, setPartyTypeOptions] = useState([]);
  const [details, setDetails] = useState(null);

  useEffect(() => {
    organizationApi.getPartyTypeOptions()
      .then((response) => {
        setPartyTypeOptions(response?.data?.data?.map((option) => ({
          id: option.id,
          value: option.id,
          label: option.label,
        })) ?? []);
      });
  }, []);

  const getOrganization = async () => {
    const response = await organizationApi.getOrganizationDetails(organizationId);
    const organization = response?.data?.data;
    setDetails(organization);
    return {
      active: organization?.active ?? true,
      code: organization?.code ?? '',
      name: organization?.name ?? '',
      description: organization?.description ?? '',
      partyType: organization?.partyType
        ? {
          id: organization.partyType.id,
          value: organization.partyType.id,
          label: organization.partyType.name,
        }
        : null,
      defaultLocation: organization?.defaultLocation
        ? {
          id: organization.defaultLocation.id,
          value: organization.defaultLocation.id,
          label: organization.defaultLocation.name,
        }
        : null,
      sequences: organization?.sequences ?? {},
    };
  };

  const emptyValues = {
    active: true,
    code: '',
    name: '',
    description: '',
    partyType: null,
    defaultLocation: null,
    sequences: {},
  };

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    mode: 'onBlur',
    defaultValues: emptyValues,
  });

  // Fetch and reset on every organizationId change so the form is correctly
  // populated even when routed between create/edit without a remount.
  useEffect(() => {
    if (organizationId) {
      getOrganization().then((values) => reset(values));
      return;
    }
    setDetails(null);
    reset(emptyValues);
  }, [organizationId]);

  const locationOptions = (details?.locations ?? []).map((location) => ({
    id: location.id,
    value: location.id,
    label: location.name,
  }));

  const saveOrganization = async (values) => {
    if (organizationId) {
      const payload = {
        active: values.active,
        code: values.code,
        name: values.name,
        description: values.description,
        partyType: values.partyType?.id ?? null,
        defaultLocation: values.defaultLocation?.id ?? null,
        ...(details?.isSuperuser ? { sequences: values.sequences ?? {} } : {}),
      };
      try {
        await organizationApi.updateOrganization(organizationId, payload);
      } catch (error) {
        // apiClient's response interceptor already notifies the user
        return;
      }
      notification(NotificationType.SUCCESS)({
        message: translate('react.organization.update.success.label', 'Organization has been updated successfully'),
      });
      history.push(ORGANIZATION_URL.list());
      return;
    }
    const payload = {
      code: values.code,
      name: values.name,
      description: values.description,
      partyType: values.partyType?.id ? { id: values.partyType.id } : null,
    };
    let response;
    try {
      response = await organizationApi.createOrganization(payload);
    } catch (error) {
      // apiClient's response interceptor already notifies the user
      return;
    }
    notification(NotificationType.SUCCESS)({
      message: translate('react.organization.create.success.label', 'Organization has been created successfully'),
    });
    const createdId = response?.data?.data?.id;
    if (createdId) {
      history.push(ORGANIZATION_URL.edit(createdId));
      return;
    }
    history.push(ORGANIZATION_URL.list());
  };

  const onSubmit = async (values) => {
    // Match the legacy edit screen, which asked for confirmation before
    // saving an organization as inactive.
    if (organizationId && details?.active && !values.active) {
      confirmAlert({
        title: translate('react.default.areYouSure.label', 'Are you sure?'),
        message: translate(
          'react.organization.confirm.inactive.label',
          'Marking an organization as inactive will make it unavailable. Are you sure?',
        ),
        buttons: [
          {
            label: translate('react.default.yes.label', 'Yes'),
            onClick: () => saveOrganization(values),
          },
          {
            label: translate('react.default.no.label', 'No'),
          },
        ],
      });
      return;
    }
    await saveOrganization(values);
  };

  const deleteOrganization = async () => {
    dispatch(showSpinner());
    try {
      const { status } = await organizationApi.deleteOrganization(organizationId);
      if (status === 204) {
        notification(NotificationType.SUCCESS)({
          message: translate('react.organization.delete.success.label', 'Organization has been deleted successfully'),
        });
        history.push(ORGANIZATION_URL.list());
      }
    } finally {
      dispatch(hideSpinner());
    }
  };

  const onDelete = () => {
    confirmAlert({
      title: translate('react.default.areYouSure.label', 'Are you sure?'),
      message: translate(
        'react.organization.delete.confirm.label',
        'Are you sure you want to delete this organization?',
      ),
      buttons: [
        {
          label: translate('react.default.yes.label', 'Yes'),
          onClick: deleteOrganization,
        },
        {
          label: translate('react.default.no.label', 'No'),
        },
      ],
    });
  };

  return (
    <PageWrapper>
      <HeaderWrapper className="align-items-center h-auto py-3">
        <span className="title">
          {organizationId
            ? <Translate id="react.organization.edit.label" defaultMessage="Edit Organization" />
            : <Translate id="react.organization.create.label" defaultMessage="Create Organization" />}
        </span>
      </HeaderWrapper>
      <form onSubmit={handleSubmit(onSubmit)} className="p-3">
        <Section
          title={{ label: 'react.organization.detailsSection.label', defaultMessage: 'Organization Details' }}
        >
          <div className="row">
            {organizationId && (
              <div className="col-lg-4 col-md-6 px-2 pt-2">
                <Controller
                  name="active"
                  control={control}
                  render={({ field }) => (
                    <Checkbox
                      title={{ id: 'react.organization.active.label', defaultMessage: 'Active' }}
                      {...field}
                    />
                  )}
                />
              </div>
            )}
            <div className="col-lg-4 col-md-6 px-2 pt-2">
              <Controller
                name="partyType"
                control={control}
                render={({ field }) => (
                  <SelectField
                    title={{ id: 'react.organization.partyType.label', defaultMessage: 'Party Type' }}
                    options={partyTypeOptions}
                    {...field}
                  />
                )}
              />
            </div>
            <div className="col-lg-4 col-md-6 px-2 pt-2">
              <Controller
                name="code"
                control={control}
                render={({ field }) => (
                  <TextInput
                    title={{ id: 'react.organization.code.label', defaultMessage: 'Code' }}
                    disabled={Boolean(organizationId) && details?.isCodeEditable === false}
                    placeholder={organizationId ? undefined
                      : translate('react.organization.code.placeholder.label', 'Leave blank to generate a code')}
                    {...field}
                  />
                )}
              />
            </div>
            <div className="col-lg-4 col-md-6 px-2 pt-2">
              <Controller
                name="name"
                control={control}
                rules={{
                  required: translate('react.default.error.requiredField.label', 'This field is required'),
                }}
                render={({ field }) => (
                  <TextInput
                    title={{ id: 'react.organization.name.label', defaultMessage: 'Name' }}
                    required
                    errorMessage={errors.name?.message}
                    {...field}
                  />
                )}
              />
            </div>
            <div className="col-lg-4 col-md-6 px-2 pt-2">
              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <TextInput
                    title={{ id: 'react.organization.description.label', defaultMessage: 'Description' }}
                    {...field}
                  />
                )}
              />
            </div>
            {organizationId && (
              <div className="col-lg-4 col-md-6 px-2 pt-2">
                <Controller
                  name="defaultLocation"
                  control={control}
                  render={({ field }) => (
                    <SelectField
                      title={{ id: 'react.organization.defaultLocation.label', defaultMessage: 'Default Location' }}
                      options={locationOptions}
                      {...field}
                    />
                  )}
                />
              </div>
            )}
          </div>
        </Section>
        {organizationId && (
          <Section
            title={{ label: 'react.organization.rolesSection.label', defaultMessage: 'Roles' }}
          >
            <ul aria-label="Added Roles" data-testid="organization-roles">
              {(details?.roles ?? []).map((role) => (
                <li key={role.id}>
                  <a href={`${CONTEXT_PATH}/partyRole/show/${role.id}`}>{role.name}</a>
                </li>
              ))}
            </ul>
            <a href={`${CONTEXT_PATH}/partyRole/create?party.id=${organizationId}`}>
              <Translate id="react.organization.addRole.label" defaultMessage="Add Party Role" />
            </a>
          </Section>
        )}
        {organizationId && (
          <Section
            title={{ label: 'react.organization.sequencesSection.label', defaultMessage: 'Sequences' }}
          >
            <table className="table table-sm w-auto" data-testid="organization-sequences">
              <tbody>
                <tr>
                  <td className="font-weight-bold pr-4">
                    <Translate id="react.organization.maxPurchaseOrderNumber.label" defaultMessage="Last PO Number" />
                  </td>
                  <td aria-label="Last PO Number">{details?.maxPurchaseOrderNumber ?? translate('react.default.none.label', 'None')}</td>
                </tr>
                {!details?.isSuperuser && (
                  <tr>
                    <td className="font-weight-bold pr-4">
                      <Translate id="react.organization.sequences.label" defaultMessage="Sequences" />
                    </td>
                    <td aria-label="Sequences">
                      {Object.keys(details?.sequences ?? {}).length
                        ? JSON.stringify(details.sequences)
                        : translate('react.default.none.label', 'None')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            {details?.isSuperuser && (
              <div className="row">
                {(details?.identifierTypeCodes ?? []).map((identifierTypeCode) => (
                  <div className="col-lg-4 col-md-6 px-2 pt-2" key={identifierTypeCode}>
                    <Controller
                      name={`sequences.${identifierTypeCode}`}
                      control={control}
                      render={({ field }) => (
                        <TextInput
                          title={{ id: `react.organization.sequences.${identifierTypeCode}.label`, defaultMessage: identifierTypeCode }}
                          {...field}
                          value={field.value ?? ''}
                        />
                      )}
                    />
                  </div>
                ))}
              </div>
            )}
          </Section>
        )}
        <div className="d-flex gap-8 pt-3">
          <Button
            type="submit"
            defaultLabel={organizationId ? 'Update' : 'Create'}
            label={organizationId ? 'react.default.button.update.label' : 'react.default.button.create.label'}
            variant="primary"
            disabled={isSubmitting}
          />
          {organizationId && (
            <Button
              defaultLabel="Delete"
              label="react.default.button.delete.label"
              variant="danger-outline"
              onClick={onDelete}
            />
          )}
          <Button
            defaultLabel="Cancel"
            label="react.default.button.cancel.label"
            variant="primary-outline"
            onClick={() => history.push(ORGANIZATION_URL.list())}
          />
        </div>
      </form>
    </PageWrapper>
  );
};

export default OrganizationForm;

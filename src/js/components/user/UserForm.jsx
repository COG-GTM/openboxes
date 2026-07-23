import React, { useCallback, useEffect, useState } from 'react';

import { confirmAlert } from 'react-confirm-alert';
import { Controller, useForm } from 'react-hook-form';
import { useSelector } from 'react-redux';
import { useHistory, useParams } from 'react-router-dom';

import localizationOverrideApi from 'api/services/LocalizationOverrideApi';
import userApi from 'api/services/UserApi';
import Button from 'components/form-elements/Button';
import Checkbox from 'components/form-elements/v2/Checkbox';
import SelectField from 'components/form-elements/v2/SelectField';
import TextInput from 'components/form-elements/v2/TextInput';
import notification from 'components/Layout/notifications/notification';
import Section from 'components/Layout/v2/Section';
import UserDetailsHeader from 'components/user/UserDetailsHeader';
import { USER_URL } from 'consts/applicationUrls';
import NotificationType from 'consts/notificationTypes';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';
import PageWrapper from 'wrappers/PageWrapper';

import 'react-confirm-alert/src/react-confirm-alert.css';

const toOption = (option) => ({ id: option.id, value: option.id, label: option.label });

const timezoneOptions = () => {
  try {
    return Intl.supportedValuesOf('timeZone')
      .map((timezone) => ({ id: timezone, value: timezone, label: timezone }));
  } catch (e) {
    return [];
  }
};

const TABS = {
  DETAILS: 'details',
  PASSWORD: 'password',
  AUTHORIZATION: 'authorization',
};

const UserForm = () => {
  useTranslation('user', 'default');

  const { userId } = useParams();
  const history = useHistory();
  const translate = useTranslate();

  const isUserAdmin = useSelector((state) => state.session.isUserAdmin);

  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState(TABS.DETAILS);
  const [localeOptions, setLocaleOptions] = useState([]);
  const [roleOptions, setRoleOptions] = useState([]);
  const [locationOptions, setLocationOptions] = useState([]);
  const [showAddLocationRole, setShowAddLocationRole] = useState(false);

  const fetchUser = useCallback(async () => {
    const response = await userApi.getUser(userId);
    const fetchedUser = response?.data?.data;
    setUser(fetchedUser);
    return fetchedUser;
  }, [userId]);

  useEffect(() => {
    localizationOverrideApi.getLocaleOptions()
      .then((response) => setLocaleOptions(response?.data?.data?.map(toOption) ?? []));
    userApi.getLoginLocationOptions()
      .then((response) => setLocationOptions(response?.data?.data?.map(toOption) ?? []));
    if (isUserAdmin) {
      userApi.getRoleOptions()
        .then((response) => setRoleOptions(response?.data?.data?.map(toOption) ?? []));
    }
  }, [isUserAdmin]);

  const detailsForm = useForm({
    mode: 'onBlur',
    defaultValues: {
      active: false,
      email: '',
      username: '',
      firstName: '',
      lastName: '',
      locale: null,
      timezone: null,
    },
  });

  const passwordForm = useForm({
    mode: 'onBlur',
    defaultValues: { password: '', passwordConfirm: '' },
  });

  const authorizationForm = useForm({
    mode: 'onBlur',
    defaultValues: {
      warehouse: null,
      rememberLastLocation: false,
      roles: [],
    },
  });

  const locationRoleForm = useForm({
    mode: 'onBlur',
    defaultValues: { location: null, roles: [] },
  });

  // Fetch and reset on userId change: the route can swap users without a
  // remount, so async defaultValues would keep showing the previous user.
  useEffect(() => {
    fetchUser().then((fetchedUser) => {
      detailsForm.reset({
        active: fetchedUser?.active ?? false,
        email: fetchedUser?.email ?? '',
        username: fetchedUser?.username ?? '',
        firstName: fetchedUser?.firstName ?? '',
        lastName: fetchedUser?.lastName ?? '',
        locale: fetchedUser?.locale
          ? {
            id: fetchedUser.locale,
            value: fetchedUser.locale,
            label: fetchedUser.localeDisplayName,
          }
          : null,
        timezone: fetchedUser?.timezone
          ? { id: fetchedUser.timezone, value: fetchedUser.timezone, label: fetchedUser.timezone }
          : null,
      });
      authorizationForm.reset({
        warehouse: fetchedUser?.warehouse
          ? {
            id: fetchedUser.warehouse.id,
            value: fetchedUser.warehouse.id,
            label: fetchedUser.warehouse.name,
          }
          : null,
        rememberLastLocation: fetchedUser?.rememberLastLocation ?? false,
        roles: fetchedUser?.roles?.map((role) => ({
          id: role.id,
          value: role.id,
          label: role.description,
        })) ?? [],
      });
      passwordForm.reset();
    });
  }, [userId]);

  const onSubmitDetails = async (values) => {
    const payload = {
      active: values.active,
      email: values.email,
      username: values.username,
      firstName: values.firstName,
      lastName: values.lastName,
      locale: values.locale?.id ?? '',
      timezone: values.timezone?.id ?? '',
    };
    const response = await userApi.updateUser(userId, payload);
    setUser(response?.data?.data);
    notification(NotificationType.SUCCESS)({
      message: translate('react.user.update.success.label', 'User has been updated successfully'),
    });
  };

  const onSubmitPassword = async (values) => {
    await userApi.changePassword(userId, {
      password: values.password,
      passwordConfirm: values.passwordConfirm,
    });
    passwordForm.reset();
    notification(NotificationType.SUCCESS)({
      message: translate('react.user.update.success.label', 'User has been updated successfully'),
    });
  };

  const onSubmitAuthorization = async (values) => {
    const payload = {
      warehouse: { id: values.warehouse?.id ?? null },
      rememberLastLocation: values.rememberLastLocation,
      ...(isUserAdmin ? { roles: values.roles?.map((role) => role.id) ?? [] } : {}),
    };
    const response = await userApi.updateUser(userId, payload);
    setUser(response?.data?.data);
    notification(NotificationType.SUCCESS)({
      message: translate('react.user.update.success.label', 'User has been updated successfully'),
    });
  };

  const onAddLocationRole = async (values) => {
    const response = await userApi.addLocationRoles(userId, {
      location: { id: values.location?.id },
      role: values.roles?.map((role) => ({ id: role.id })),
    });
    setUser(response?.data?.data);
    locationRoleForm.reset();
    setShowAddLocationRole(false);
    notification(NotificationType.SUCCESS)({
      message: translate('react.user.update.success.label', 'User has been updated successfully'),
    });
  };

  const deleteLocationRole = async (locationRoleId) => {
    const response = await userApi.deleteLocationRole(userId, locationRoleId);
    setUser(response?.data?.data);
    notification(NotificationType.SUCCESS)({
      message: translate('react.user.update.success.label', 'User has been updated successfully'),
    });
  };

  const onDeleteLocationRole = (locationRoleId) => {
    confirmAlert({
      title: translate('react.default.areYouSure.label', 'Are you sure?'),
      message: translate(
        'react.user.locationRole.delete.confirm.label',
        'Are you sure you want to delete this location role?',
      ),
      buttons: [
        {
          label: translate('react.default.yes.label', 'Yes'),
          onClick: () => deleteLocationRole(locationRoleId),
        },
        { label: translate('react.default.no.label', 'No') },
      ],
    });
  };

  const cancelButton = (
    <Button
      defaultLabel="Cancel"
      label="react.default.button.cancel.label"
      variant="primary-outline"
      onClick={() => history.push(USER_URL.show(userId))}
    />
  );

  return (
    <PageWrapper>
      <UserDetailsHeader user={user} />
      <div className="p-3">
        <ul className="nav nav-tabs" role="tablist">
          {[
            { key: TABS.DETAILS, labelId: 'react.user.details.label', defaultLabel: 'User Details' },
            { key: TABS.PASSWORD, labelId: 'react.user.changePassword.label', defaultLabel: 'Change Password' },
            { key: TABS.AUTHORIZATION, labelId: 'react.user.authorization.label', defaultLabel: 'Authorization' },
          ].map((tab) => (
            <li className="nav-item" key={tab.key}>
              <button
                type="button"
                role="tab"
                className={`nav-link btn btn-link ${activeTab === tab.key ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                <Translate id={tab.labelId} defaultMessage={tab.defaultLabel} />
              </button>
            </li>
          ))}
        </ul>
        {activeTab === TABS.DETAILS && (
          <form onSubmit={detailsForm.handleSubmit(onSubmitDetails)} className="pt-3" aria-label="User Details">
            <Section title={{ label: 'react.user.details.label', defaultMessage: 'User Details' }}>
              <div className="row">
                <div className="col-lg-4 col-md-6 px-2 pt-2 d-flex align-items-end">
                  <Controller
                    name="active"
                    control={detailsForm.control}
                    render={({ field }) => (
                      <Checkbox
                        title={{ id: 'react.user.active.label', defaultMessage: 'Active' }}
                        value={field.value}
                        {...field}
                      />
                    )}
                  />
                </div>
                <div className="col-lg-4 col-md-6 px-2 pt-2">
                  <Controller
                    name="email"
                    control={detailsForm.control}
                    render={({ field }) => (
                      <TextInput
                        title={{ id: 'react.user.email.label', defaultMessage: 'Email' }}
                        errorMessage={detailsForm.formState.errors.email?.message}
                        {...field}
                      />
                    )}
                  />
                </div>
                <div className="col-lg-4 col-md-6 px-2 pt-2">
                  <Controller
                    name="username"
                    control={detailsForm.control}
                    rules={{
                      required: translate('react.default.error.requiredField.label', 'This field is required'),
                    }}
                    render={({ field }) => (
                      <TextInput
                        title={{ id: 'react.user.username.label', defaultMessage: 'Username' }}
                        required
                        errorMessage={detailsForm.formState.errors.username?.message}
                        {...field}
                      />
                    )}
                  />
                </div>
                <div className="col-lg-4 col-md-6 px-2 pt-2">
                  <Controller
                    name="firstName"
                    control={detailsForm.control}
                    rules={{
                      required: translate('react.default.error.requiredField.label', 'This field is required'),
                    }}
                    render={({ field }) => (
                      <TextInput
                        title={{ id: 'react.user.firstName.label', defaultMessage: 'First Name' }}
                        required
                        errorMessage={detailsForm.formState.errors.firstName?.message}
                        {...field}
                      />
                    )}
                  />
                </div>
                <div className="col-lg-4 col-md-6 px-2 pt-2">
                  <Controller
                    name="lastName"
                    control={detailsForm.control}
                    rules={{
                      required: translate('react.default.error.requiredField.label', 'This field is required'),
                    }}
                    render={({ field }) => (
                      <TextInput
                        title={{ id: 'react.user.lastName.label', defaultMessage: 'Last Name' }}
                        required
                        errorMessage={detailsForm.formState.errors.lastName?.message}
                        {...field}
                      />
                    )}
                  />
                </div>
                <div className="col-lg-4 col-md-6 px-2 pt-2" data-testid="locale-select">
                  <Controller
                    name="locale"
                    control={detailsForm.control}
                    render={({ field }) => (
                      <SelectField
                        title={{ id: 'react.user.locale.label', defaultMessage: 'Locale' }}
                        options={localeOptions}
                        {...field}
                      />
                    )}
                  />
                </div>
                <div className="col-lg-4 col-md-6 px-2 pt-2" data-testid="timezone-select">
                  <Controller
                    name="timezone"
                    control={detailsForm.control}
                    render={({ field }) => (
                      <SelectField
                        title={{ id: 'react.user.timezone.label', defaultMessage: 'Timezone' }}
                        options={timezoneOptions()}
                        {...field}
                      />
                    )}
                  />
                </div>
              </div>
              <div className="d-flex gap-8 pt-3">
                <Button
                  type="submit"
                  defaultLabel="Save"
                  label="react.default.button.save.label"
                  variant="primary"
                  disabled={detailsForm.formState.isSubmitting}
                />
                {cancelButton}
              </div>
            </Section>
          </form>
        )}
        {activeTab === TABS.PASSWORD && (
          <form onSubmit={passwordForm.handleSubmit(onSubmitPassword)} className="pt-3" aria-label="Change Password">
            <Section title={{ label: 'react.user.changePassword.label', defaultMessage: 'Change Password' }}>
              <div className="row">
                <div className="col-lg-4 col-md-6 px-2 pt-2">
                  <Controller
                    name="password"
                    control={passwordForm.control}
                    rules={{
                      required: translate('react.default.error.requiredField.label', 'This field is required'),
                    }}
                    render={({ field }) => (
                      <TextInput
                        type="password"
                        title={{ id: 'react.user.password.label', defaultMessage: 'Password' }}
                        required
                        errorMessage={passwordForm.formState.errors.password?.message}
                        {...field}
                      />
                    )}
                  />
                </div>
                <div className="col-lg-4 col-md-6 px-2 pt-2">
                  <Controller
                    name="passwordConfirm"
                    control={passwordForm.control}
                    rules={{
                      required: translate('react.default.error.requiredField.label', 'This field is required'),
                    }}
                    render={({ field }) => (
                      <TextInput
                        type="password"
                        title={{ id: 'react.user.confirmPassword.label', defaultMessage: 'Confirm Password' }}
                        required
                        errorMessage={passwordForm.formState.errors.passwordConfirm?.message}
                        {...field}
                      />
                    )}
                  />
                </div>
              </div>
              <div className="d-flex gap-8 pt-3">
                <Button
                  type="submit"
                  defaultLabel="Save"
                  label="react.default.button.save.label"
                  variant="primary"
                  disabled={passwordForm.formState.isSubmitting}
                />
                {cancelButton}
              </div>
            </Section>
          </form>
        )}
        {activeTab === TABS.AUTHORIZATION && (
          <div className="pt-3" aria-label="Authorization">
            <form onSubmit={authorizationForm.handleSubmit(onSubmitAuthorization)}>
              <Section title={{ label: 'react.user.authorization.label', defaultMessage: 'Authorization' }}>
                <div className="row">
                  <div className="col-lg-4 col-md-6 px-2 pt-2" data-testid="default-location-select">
                    <Controller
                      name="warehouse"
                      control={authorizationForm.control}
                      render={({ field }) => (
                        <SelectField
                          title={{ id: 'react.user.defaultLocation.label', defaultMessage: 'Default Location' }}
                          options={locationOptions}
                          {...field}
                        />
                      )}
                    />
                  </div>
                  <div className="col-lg-4 col-md-6 px-2 pt-2 d-flex align-items-end">
                    <Controller
                      name="rememberLastLocation"
                      control={authorizationForm.control}
                      render={({ field }) => (
                        <Checkbox
                          title={{ id: 'react.user.rememberLastLocation.label', defaultMessage: 'Remember last location' }}
                          value={field.value}
                          {...field}
                        />
                      )}
                    />
                  </div>
                  {isUserAdmin && (
                    <div className="col-lg-4 col-md-6 px-2 pt-2" data-testid="default-roles-select">
                      <Controller
                        name="roles"
                        control={authorizationForm.control}
                        render={({ field }) => (
                          <SelectField
                            title={{ id: 'react.user.roles.label', defaultMessage: 'Roles' }}
                            options={roleOptions}
                            multiple
                            {...field}
                          />
                        )}
                      />
                    </div>
                  )}
                </div>
                <div className="d-flex gap-8 pt-3">
                  <Button
                    type="submit"
                    defaultLabel="Save"
                    label="react.default.button.save.label"
                    variant="primary"
                    disabled={authorizationForm.formState.isSubmitting}
                  />
                  {cancelButton}
                </div>
              </Section>
            </form>
            {isUserAdmin && (
              <div className="pt-3">
                <Section title={{ label: 'react.user.locationRoles.label', defaultMessage: 'Location Roles' }}>
                  <table className="table table-sm" aria-label="Location Roles">
                    <thead>
                      <tr>
                        <th aria-label="Location"><Translate id="react.user.location.label" defaultMessage="Location" /></th>
                        <th aria-label="Location Group"><Translate id="react.user.locationGroup.label" defaultMessage="Location Group" /></th>
                        <th aria-label="Location Type"><Translate id="react.user.locationType.label" defaultMessage="Location Type" /></th>
                        <th aria-label="Role"><Translate id="react.user.role.label" defaultMessage="Role" /></th>
                        <th aria-label="Actions"><Translate id="react.default.actions.label" defaultMessage="Actions" /></th>
                      </tr>
                    </thead>
                    <tbody>
                      {user?.locationRoles?.length
                        ? user.locationRoles.map((locationRole) => (
                          <tr key={locationRole.id} className={locationRole.highestActive ? '' : 'text-muted'}>
                            <td>{locationRole.location?.name}</td>
                            <td>{locationRole.location?.locationGroup}</td>
                            <td>{locationRole.location?.locationType}</td>
                            <td>{locationRole.role?.description}</td>
                            <td>
                              <Button
                                defaultLabel="Delete"
                                label="react.default.button.delete.label"
                                variant="danger-outline"
                                onClick={() => onDeleteLocationRole(locationRole.id)}
                              />
                            </td>
                          </tr>
                        ))
                        : (
                          <tr>
                            <td colSpan="5" className="text-muted text-center">
                              <Translate id="react.user.locationRoles.empty.label" defaultMessage="No location roles" />
                            </td>
                          </tr>
                        )}
                    </tbody>
                  </table>
                  {showAddLocationRole ? (
                    <form onSubmit={locationRoleForm.handleSubmit(onAddLocationRole)}>
                      <div className="row">
                        <div className="col-lg-4 col-md-6 px-2 pt-2" data-testid="location-role-location-select">
                          <Controller
                            name="location"
                            control={locationRoleForm.control}
                            rules={{
                              required: translate('react.default.error.requiredField.label', 'This field is required'),
                            }}
                            render={({ field }) => (
                              <SelectField
                                title={{ id: 'react.user.location.label', defaultMessage: 'Location' }}
                                options={locationOptions}
                                required
                                errorMessage={locationRoleForm.formState.errors.location?.message}
                                {...field}
                              />
                            )}
                          />
                        </div>
                        <div className="col-lg-4 col-md-6 px-2 pt-2" data-testid="location-role-role-select">
                          <Controller
                            name="roles"
                            control={locationRoleForm.control}
                            rules={{
                              validate: (value) => (value?.length > 0)
                                || translate('react.default.error.requiredField.label', 'This field is required'),
                            }}
                            render={({ field }) => (
                              <SelectField
                                title={{ id: 'react.user.role.label', defaultMessage: 'Role' }}
                                options={roleOptions}
                                multiple
                                required
                                errorMessage={locationRoleForm.formState.errors.roles?.message}
                                {...field}
                              />
                            )}
                          />
                        </div>
                      </div>
                      <div className="d-flex gap-8 pt-3">
                        <Button
                          type="submit"
                          defaultLabel="Save"
                          label="react.default.button.save.label"
                          variant="primary"
                          disabled={locationRoleForm.formState.isSubmitting}
                        />
                        <Button
                          defaultLabel="Cancel"
                          label="react.default.button.cancel.label"
                          variant="primary-outline"
                          onClick={() => {
                            locationRoleForm.reset();
                            setShowAddLocationRole(false);
                          }}
                        />
                      </div>
                    </form>
                  ) : (
                    <Button
                      defaultLabel="Add Location Roles"
                      label="react.user.addLocationRoles.label"
                      variant="primary-outline"
                      onClick={() => setShowAddLocationRole(true)}
                    />
                  )}
                </Section>
              </div>
            )}
          </div>
        )}
      </div>
    </PageWrapper>
  );
};

export default UserForm;

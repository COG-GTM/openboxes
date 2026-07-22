import React, { useEffect, useState } from 'react';

import { confirmAlert } from 'react-confirm-alert';
import { useHistory, useParams } from 'react-router-dom';
import Alert from 'react-s-alert';

import attributeApi from 'api/services/AttributeApi';
import Button from 'components/form-elements/Button';
import { ATTRIBUTE_URL } from 'consts/applicationUrls';
import EntityTypeCode from 'consts/entityTypeCode';
import useSpinner from 'hooks/useSpinner';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';
import PageWrapper from 'wrappers/PageWrapper';

import './styles.scss';

const emptyAttribute = {
  entityTypeCode: '',
  code: '',
  name: '',
  description: '',
  unitOfMeasureClass: null,
  options: [],
  active: true,
  required: false,
  allowOther: false,
};

const AttributeForm = () => {
  useTranslation('attribute', 'default');
  const history = useHistory();
  const { id } = useParams();
  const spinner = useSpinner();
  const translate = useTranslate();

  const [attribute, setAttribute] = useState(emptyAttribute);
  const [uomClasses, setUomClasses] = useState([]);
  const [errors, setErrors] = useState([]);

  useEffect(() => {
    (async () => {
      spinner.show();
      try {
        const { data } = await attributeApi.getUnitOfMeasureClasses();
        setUomClasses(data?.data ?? []);
        if (id) {
          const response = await attributeApi.getAttribute(id);
          setAttribute({ ...emptyAttribute, ...response.data });
        } else {
          setAttribute(emptyAttribute);
        }
      } catch (error) {
        // Like the legacy edit action: not-found redirects back to the list.
        Alert.error(error.response?.data?.errorMessage
          ?? translate('react.attribute.notFound.message', 'Attribute not found'));
        history.push(ATTRIBUTE_URL.list());
      } finally {
        spinner.hide();
      }
    })();
  }, [id]);

  const setField = (field, value) => {
    setAttribute((prevAttribute) => ({ ...prevAttribute, [field]: value }));
  };

  const setOption = (index, value) => {
    setAttribute((prevAttribute) => {
      const options = [...prevAttribute.options];
      options[index] = value;
      return { ...prevAttribute, options };
    });
  };

  const onSave = async (event) => {
    event.preventDefault();
    setErrors([]);
    const payload = {
      ...attribute,
      entityTypeCode: attribute.entityTypeCode || null,
      unitOfMeasureClass: attribute.unitOfMeasureClass?.id
        ? { id: attribute.unitOfMeasureClass.id } : null,
      options: attribute.options.filter((option) => option),
    };
    spinner.show();
    try {
      if (id) {
        const { data } = await attributeApi.updateAttribute(id, payload);
        setAttribute({ ...emptyAttribute, ...data });
        Alert.success(translate('react.attribute.saved.message', 'Attribute saved'));
      } else {
        const { data } = await attributeApi.createAttribute(payload);
        Alert.success(translate('react.attribute.saved.message', 'Attribute saved'));
        history.push(ATTRIBUTE_URL.edit(data.id));
      }
    } catch (error) {
      const errorMessages = error.response?.data?.errorMessages
        ?? [error.response?.data?.errorMessage ?? 'Unable to save attribute'];
      setErrors(errorMessages);
    } finally {
      spinner.hide();
    }
  };

  const onDelete = () => {
    confirmAlert({
      title: translate('react.default.areYouSure.label', 'Are you sure?'),
      message: translate('react.attribute.delete.confirm.message', 'Are you sure you want to delete this attribute?'),
      buttons: [
        {
          label: translate('react.default.yes.label', 'Yes'),
          onClick: async () => {
            spinner.show();
            try {
              await attributeApi.deleteAttribute(id);
              Alert.success(translate('react.attribute.deleted.message', 'Attribute deleted'));
              history.push(ATTRIBUTE_URL.list());
            } catch (error) {
              const errorMessage = error.response?.data?.errorMessage
                ?? 'Unable to delete attribute';
              Alert.error(errorMessage);
            } finally {
              spinner.hide();
            }
          },
        },
        { label: translate('react.default.no.label', 'No') },
      ],
    });
  };

  return (
    <PageWrapper>
      <div className="d-flex flex-column attribute-page p-3">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h3 className="mb-0">
            {id
              ? <Translate id="react.attribute.editAttribute.label" defaultMessage="Edit attribute" />
              : <Translate id="react.attribute.addAttribute.label" defaultMessage="Add attribute" />}
            {attribute.name ? ` — ${attribute.name}` : ''}
          </h3>
          <Button
            label="react.attribute.listAttributes.label"
            defaultLabel="List attributes"
            variant="primary-outline"
            onClick={() => history.push(ATTRIBUTE_URL.list())}
          />
        </div>
        {errors.length > 0 && (
          <div className="alert alert-danger" role="alert" aria-label="error-message">
            <ul className="mb-0">
              {errors.map((error) => <li key={error}>{error}</li>)}
            </ul>
          </div>
        )}
        <form className="attribute-form" onSubmit={onSave} data-testid="attribute-form">
          <div className="form-group row">
            <label className="col-sm-3 col-form-label" htmlFor="entityTypeCode">
              <Translate id="react.attribute.column.entityTypeCode.label" defaultMessage="Entity Type" />
            </label>
            <div className="col-sm-9">
              <select
                id="entityTypeCode"
                className="form-control"
                value={attribute.entityTypeCode ?? ''}
                onChange={(event) => setField('entityTypeCode', event.target.value)}
              >
                <option value="" aria-label="empty" />
                {Object.keys(EntityTypeCode).map((entityTypeCode) => (
                  <option key={entityTypeCode} value={entityTypeCode}>{entityTypeCode}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-group row">
            <label className="col-sm-3 col-form-label" htmlFor="code">
              <Translate id="react.attribute.column.code.label" defaultMessage="Code" />
            </label>
            <div className="col-sm-9">
              <input
                id="code"
                type="text"
                className="form-control"
                value={attribute.code ?? ''}
                onChange={(event) => setField('code', event.target.value)}
              />
            </div>
          </div>
          <div className="form-group row">
            <label className="col-sm-3 col-form-label" htmlFor="name">
              <Translate id="react.attribute.column.name.label" defaultMessage="Name" />
            </label>
            <div className="col-sm-9">
              <input
                id="name"
                type="text"
                className="form-control"
                value={attribute.name ?? ''}
                onChange={(event) => setField('name', event.target.value)}
              />
            </div>
          </div>
          <div className="form-group row">
            <label className="col-sm-3 col-form-label" htmlFor="description">
              <Translate id="react.attribute.description.label" defaultMessage="Description" />
            </label>
            <div className="col-sm-9">
              <textarea
                id="description"
                className="form-control"
                value={attribute.description ?? ''}
                onChange={(event) => setField('description', event.target.value)}
              />
            </div>
          </div>
          <div className="form-group row">
            <label className="col-sm-3 col-form-label" htmlFor="unitOfMeasureClass">
              <Translate id="react.attribute.unitOfMeasureClass.label" defaultMessage="Unit of Measure Class" />
            </label>
            <div className="col-sm-9">
              <select
                id="unitOfMeasureClass"
                className="form-control"
                value={attribute.unitOfMeasureClass?.id ?? ''}
                onChange={(event) => setField('unitOfMeasureClass', event.target.value ? { id: event.target.value } : null)}
              >
                <option value="" aria-label="empty" />
                {uomClasses.map((uomClass) => (
                  <option key={uomClass.id} value={uomClass.id}>{uomClass.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-group row">
            <span className="col-sm-3 col-form-label">
              <Translate id="react.attribute.column.options.label" defaultMessage="Options" />
            </span>
            <div className="col-sm-9">
              {attribute.options.map((option, index) => (
                // eslint-disable-next-line react/no-array-index-key
                <div className="d-flex align-items-center mb-1 gap-8" key={index}>
                  <input
                    type="text"
                    className="form-control attribute-option-input"
                    value={option}
                    onChange={(event) => setOption(index, event.target.value)}
                  />
                  <Button
                    label="react.default.button.delete.label"
                    defaultLabel="Delete"
                    variant="danger"
                    onClick={() => setField('options', attribute.options.filter((o, i) => i !== index))}
                  />
                </div>
              ))}
              <Button
                label="react.attribute.addOption.label"
                defaultLabel="Add option"
                variant="primary-outline"
                onClick={() => setField('options', [...attribute.options, ''])}
              />
            </div>
          </div>
          {[
            { field: 'active', label: 'react.attribute.column.active.label', defaultLabel: 'Active' },
            { field: 'required', label: 'react.attribute.column.required.label', defaultLabel: 'Required' },
            { field: 'allowOther', label: 'react.attribute.column.allowOther.label', defaultLabel: 'Allow Free-Text' },
          ].map(({ field, label, defaultLabel }) => (
            <div className="form-group row" key={field}>
              <label className="col-sm-3 col-form-label" htmlFor={field}>
                <Translate id={label} defaultMessage={defaultLabel} />
              </label>
              <div className="col-sm-9 d-flex align-items-center">
                <input
                  id={field}
                  type="checkbox"
                  checked={!!attribute[field]}
                  onChange={(event) => setField(field, event.target.checked)}
                />
              </div>
            </div>
          ))}
          <div className="d-flex gap-8">
            <Button
              label="react.default.button.save.label"
              defaultLabel="Save"
              variant="primary"
              type="submit"
            />
            {id && (
              <Button
                label="react.default.button.delete.label"
                defaultLabel="Delete"
                variant="danger"
                onClick={onDelete}
              />
            )}
            <Button
              label="react.default.button.cancel.label"
              defaultLabel="Cancel"
              variant="transparent"
              onClick={() => history.push(ATTRIBUTE_URL.list())}
            />
          </div>
        </form>
      </div>
    </PageWrapper>
  );
};

export default AttributeForm;

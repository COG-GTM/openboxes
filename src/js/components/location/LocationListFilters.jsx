import React, { useCallback } from 'react';

import PropTypes from 'prop-types';
import { useSelector } from 'react-redux';

import FilterForm from 'components/Filter/FilterForm';
import { debounceLocationGroupsFetch, debounceOrganizationsFetch } from 'utils/option-utils';
import ListFilterFormWrapper from 'wrappers/ListFilterFormWrapper';

const LocationListFilters = ({
  filterFields,
  setFilterParams,
  defaultValues,
  locationTypes,
}) => {
  const {
    debounceTime,
    minSearchLength,
  } = useSelector((state) => ({
    debounceTime: state.session.searchConfig.debounceTime,
    minSearchLength: state.session.searchConfig.minSearchLength,
  }));

  const debouncedLocationGroupsFetch = useCallback(
    debounceLocationGroupsFetch(
      debounceTime,
      minSearchLength,
    ), [debounceTime, minSearchLength],
  );

  const debouncedOrganizationsFetch = useCallback(
    debounceOrganizationsFetch(
      debounceTime,
      minSearchLength,
      [],
      false,
    ), [debounceTime, minSearchLength],
  );

  return (
    <ListFilterFormWrapper>
      <FilterForm
        filterFields={filterFields}
        updateFilterParams={(values) => setFilterParams({ ...values })}
        formProps={{
          debouncedLocationGroupsFetch,
          debouncedOrganizationsFetch,
          locationTypes,
        }}
        defaultValues={defaultValues}
        allowEmptySubmit
        searchFieldDefaultPlaceholder="Search by location name"
        searchFieldPlaceholder="react.location.searchField.placeholder.label"
        hidden={false}
        ignoreClearFilters={[]}
      />
    </ListFilterFormWrapper>
  );
};

export default LocationListFilters;

LocationListFilters.propTypes = {
  setFilterParams: PropTypes.func.isRequired,
  filterFields: PropTypes.shape({}).isRequired,
  defaultValues: PropTypes.shape({}).isRequired,
  locationTypes: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
};

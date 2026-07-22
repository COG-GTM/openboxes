import React from 'react';

import filterFields from 'components/location/FilterFields';
import LocationListFilters from 'components/location/LocationListFilters';
import LocationListTable from 'components/location/LocationListTable';
import useLocationFilters from 'hooks/list-pages/location/useLocationFilters';
import useTranslation from 'hooks/useTranslation';
import PageWrapper from 'wrappers/PageWrapper';

const LocationList = () => {
  useTranslation('location');

  const {
    defaultFilterValues,
    setFilterValues,
    filterParams,
    locationTypes,
  } = useLocationFilters();

  return (
    <PageWrapper>
      <LocationListFilters
        defaultValues={defaultFilterValues}
        setFilterParams={setFilterValues}
        filterFields={filterFields}
        locationTypes={locationTypes}
      />
      <LocationListTable filterParams={filterParams} />
    </PageWrapper>
  );
};

export default LocationList;

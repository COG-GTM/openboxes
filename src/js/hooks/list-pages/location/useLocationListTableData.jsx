import _ from 'lodash';

import { LOCATION_SEARCH_API } from 'api/urls';
import useTableData from 'hooks/list-pages/useTableData';

const useLocationListTableData = (filterParams) => {
  const errorMessageId = 'react.location.error.locationList.label';
  const defaultErrorMessage = 'Unable to fetch locations';

  const defaultSorting = {
    sort: 'name',
    order: 'asc',
  };

  const getParams = ({
    offset,
    state,
    sortingParams,
  }) => {
    const {
      searchTerm,
      locationType,
      locationGroup,
      organization,
    } = filterParams;
    return _.omitBy({
      offset: `${offset}`,
      max: `${state.pageSize}`,
      ...sortingParams,
      q: searchTerm,
      'locationType.id': locationType?.id,
      'locationGroup.id': locationGroup?.id,
      'organization.id': organization?.id,
    }, (val) => _.isEmpty(val));
  };

  const {
    tableRef,
    loading,
    onFetchHandler,
    tableData,
    fireFetchData,
  } = useTableData({
    filterParams,
    url: LOCATION_SEARCH_API,
    errorMessageId,
    defaultErrorMessage,
    defaultSorting,
    getParams,
  });

  return {
    tableData,
    loading,
    tableRef,
    onFetchHandler,
    fireFetchData,
  };
};

export default useLocationListTableData;

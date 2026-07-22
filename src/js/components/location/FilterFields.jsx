import FilterSelectField from 'components/form-elements/FilterSelectField';

export default {
  locationType: {
    type: FilterSelectField,
    attributes: {
      valueKey: 'id',
      labelKey: 'label',
      filterElement: true,
      placeholder: 'react.location.filters.locationType.placeholder.label',
      defaultPlaceholder: 'Location Type',
      showLabelTooltip: true,
    },
    getDynamicAttr: ({ locationTypes }) => ({
      options: locationTypes,
    }),
  },
  locationGroup: {
    type: FilterSelectField,
    attributes: {
      async: true,
      openOnClick: false,
      autoload: false,
      cache: false,
      valueKey: 'id',
      labelKey: 'name',
      options: [],
      filterOptions: (options) => options,
      filterElement: true,
      placeholder: 'react.location.filters.locationGroup.placeholder.label',
      defaultPlaceholder: 'Location Group',
      showLabelTooltip: true,
    },
    getDynamicAttr: ({ debouncedLocationGroupsFetch }) => ({
      loadOptions: debouncedLocationGroupsFetch,
    }),
  },
  organization: {
    type: FilterSelectField,
    attributes: {
      async: true,
      openOnClick: false,
      autoload: false,
      cache: false,
      valueKey: 'id',
      labelKey: 'name',
      options: [],
      filterOptions: (options) => options,
      filterElement: true,
      placeholder: 'react.location.filters.organization.placeholder.label',
      defaultPlaceholder: 'Organization',
      showLabelTooltip: true,
    },
    getDynamicAttr: ({ debouncedOrganizationsFetch }) => ({
      loadOptions: debouncedOrganizationsFetch,
    }),
  },
};

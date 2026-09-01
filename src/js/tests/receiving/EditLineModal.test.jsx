import { EditLineModalComponent } from 'components/receiving/modals/EditLineModal';

describe('EditLineModal lifecycle', () => {
  it('derives field attributes from the field configuration and props', () => {
    const getDynamicAttr = jest.fn(({ disabled }) => ({
      className: disabled ? 'disabled' : 'enabled',
    }));
    const props = {
      disabled: true,
      fieldConfig: {
        attributes: {
          type: 'text',
        },
        getDynamicAttr,
      },
    };

    expect(EditLineModalComponent.getDerivedStateFromProps(props)).toEqual({
      attr: {
        type: 'text',
        className: 'disabled',
      },
    });
    expect(getDynamicAttr).toHaveBeenCalledWith(props);
  });
});

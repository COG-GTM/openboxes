const { TextEncoder } = require('util');

global.TextEncoder = TextEncoder;

jest.mock('components/Router', () => () => null);

// eslint-disable-next-line import/no-commonjs
const { MainRouter } = require('MainRouter');

describe('MainRouter lifecycle', () => {
  const makeProps = (locale) => ({
    locale,
    fetchTranslations: jest.fn(),
    fetchMenuConfig: jest.fn(),
    setActiveLanguage: jest.fn(),
  });

  it('refetches translations and menu configuration when the locale changes', () => {
    const previousProps = makeProps('en');
    const props = makeProps('fr');
    const instance = new MainRouter(props);

    instance.componentDidUpdate(previousProps);

    expect(props.setActiveLanguage).toHaveBeenCalledWith('fr');
    expect(props.fetchMenuConfig).toHaveBeenCalledTimes(1);
    expect(props.fetchTranslations).toHaveBeenCalledTimes(7);
  });

  it('does not refetch translations when the first locale arrives', () => {
    const previousProps = makeProps(undefined);
    const props = makeProps('en');
    const instance = new MainRouter(props);

    instance.componentDidUpdate(previousProps);

    expect(props.setActiveLanguage).toHaveBeenCalledWith('en');
    expect(props.fetchMenuConfig).toHaveBeenCalledTimes(1);
    expect(props.fetchTranslations).not.toHaveBeenCalled();
  });
});

import React from 'react';

import { render, screen } from '@testing-library/react';

import VerticalTabs from 'components/Layout/VerticalTabs';

import '@testing-library/jest-dom';

jest.mock('react-localize-redux', () => ({
  Translate: ({ id }) => id,
}));

describe('VerticalTabs', () => {
  it('resets the active tab when the tab set size changes', () => {
    const { rerender } = render(
      <VerticalTabs
        tabs={{
          first: <div>First content</div>,
          second: <div>Second content</div>,
        }}
      />,
    );

    rerender(
      <VerticalTabs
        tabs={{
          replacement: <div>Replacement content</div>,
        }}
      />,
    );

    expect(screen.getByText('Replacement content')).toBeInTheDocument();
  });
});

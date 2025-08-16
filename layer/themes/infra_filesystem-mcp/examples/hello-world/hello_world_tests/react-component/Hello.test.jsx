import React from 'react';
import { render, screen } from '@testing-library/react';
import Hello from './Hello';

test('renders hello message', () => {
    render(<Hello />);
    const element = screen.getByText(/Hello from React!/i);
    expect(element).toBeInTheDocument();
});

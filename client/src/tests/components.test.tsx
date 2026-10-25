import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from '../components/StatusBadge';
import { Header } from '../components/Header';

describe('Frontend UI Components', () => {
  describe('Header Component', () => {
    it('renders the brand name and tagline', () => {
      render(<Header />);
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('ReleaseCheck');
      expect(
        screen.getByText('Your all-in-one release checklist tool')
      ).toBeInTheDocument();
    });
  });

  describe('StatusBadge Component', () => {
    it('renders Planned with planned class', () => {
      render(<StatusBadge status="PLANNED" />);
      const badge = screen.getByText('Planned');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('status-planned');
    });

    it('renders Ongoing with ongoing class', () => {
      render(<StatusBadge status="ONGOING" />);
      const badge = screen.getByText('Ongoing');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('status-ongoing');
    });

    it('renders Done with done class', () => {
      render(<StatusBadge status="DONE" />);
      const badge = screen.getByText('Done');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('status-done');
    });
  });
});

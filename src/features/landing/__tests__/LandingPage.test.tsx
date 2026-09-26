import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Lenis needs a real scrolling viewport; stub it for jsdom.
vi.mock('lenis', () => {
  class LenisStub {
    raf = vi.fn();
    destroy = vi.fn();
    scrollTo = vi.fn();
    stop = vi.fn();
    start = vi.fn();
  }
  return { default: LenisStub };
});

// Avoid real network calls from the ticket dialog.
vi.mock('@/api/tickets', () => ({
  createTicket: vi.fn(async () => ({ ticketId: 'PAM-TEST1234' })),
}));

import { LandingPage } from '../LandingPage';
import { createTicket } from '@/api/tickets';

function renderLanding() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <LandingPage />
    </MemoryRouter>,
  );
}

describe('LandingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders hero, nav links and primary actions', () => {
    renderLanding();

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      /Every privileged session/i,
    );
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Raise a Ticket/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Login/i })).toBeInTheDocument();

    // Section anchors exist for the navbar buttons
    expect(document.getElementById('features')).toBeInTheDocument();
    expect(document.getElementById('how-it-works')).toBeInTheDocument();
    expect(document.getElementById('security')).toBeInTheDocument();
    expect(document.getElementById('faq')).toBeInTheDocument();
  });

  it('opens the ticket dialog, validates and submits a ticket', async () => {
    renderLanding();

    fireEvent.click(screen.getByRole('button', { name: /Raise a Ticket/i }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeInTheDocument();

    // Submit empty -> validation error notice
    fireEvent.submit(document.querySelector('.lnd-form')!);
    expect(await screen.findByRole('alert')).toHaveTextContent(/Please fill in/i);
    expect(createTicket).not.toHaveBeenCalled();

    // Fill the form and submit
    fireEvent.change(screen.getByLabelText(/Full name \*/i), { target: { value: 'Alex Kumar' } });
    fireEvent.change(screen.getByLabelText(/Work email \*/i), {
      target: { value: 'alex@company.com' },
    });
    fireEvent.change(screen.getByLabelText(/Request type \*/i), { target: { value: 'demo' } });
    fireEvent.change(screen.getByLabelText(/Message \*/i), {
      target: { value: 'We need PAM for 50 servers.' },
    });
    fireEvent.submit(document.querySelector('.lnd-form')!);

    await waitFor(() => expect(createTicket).toHaveBeenCalledTimes(1));
    expect(await screen.findByText(/Ticket submitted/i)).toBeInTheDocument();
    expect(screen.getByText('PAM-TEST1234')).toBeInTheDocument();
  });

  it('closes the ticket dialog via the close button', async () => {
    renderLanding();
    fireEvent.click(screen.getByRole('button', { name: /Raise a Ticket/i }));
    await screen.findByRole('dialog');

    fireEvent.click(screen.getByRole('button', { name: /close dialog/i }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});

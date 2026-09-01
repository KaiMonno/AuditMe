import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App.jsx';

function jsonResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  };
}

beforeEach(() => {
  global.fetch = vi.fn();
});

describe('App', () => {
  it('renders the audit form', () => {
    render(<App />);
    expect(screen.getByPlaceholderText('https://example.com')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Run audit' })).toBeInTheDocument();
  });

  it('submits the url and browser choice to POST /api/audits', async () => {
    const user = userEvent.setup();
    global.fetch.mockResolvedValue(
      jsonResponse(200, {
        url: 'https://example.com/',
        auditedAt: '2026-01-01T00:00:00.000Z',
        summary: { error: 0, warning: 0, info: 0, total: 0 },
        findings: [],
      })
    );

    render(<App />);
    await user.type(screen.getByPlaceholderText('https://example.com'), 'https://example.com');
    await user.selectOptions(screen.getByRole('combobox'), 'firefox');
    await user.click(screen.getByRole('button', { name: 'Run audit' }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toBe('/api/audits');
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body)).toEqual({
      url: 'https://example.com',
      browser: 'firefox',
    });
  });

  it('shows a loading state while the request is in flight', async () => {
    const user = userEvent.setup();
    let resolveFetch;
    global.fetch.mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve;
      })
    );

    render(<App />);
    await user.type(screen.getByPlaceholderText('https://example.com'), 'https://example.com');
    await user.click(screen.getByRole('button', { name: 'Run audit' }));

    expect(screen.getByRole('button', { name: 'Auditing…' })).toBeDisabled();

    resolveFetch(
      jsonResponse(200, {
        url: 'https://example.com/',
        auditedAt: '2026-01-01T00:00:00.000Z',
        summary: { error: 0, warning: 0, info: 0, total: 0 },
        findings: [],
      })
    );

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Run audit' })).not.toBeDisabled()
    );
  });

  it('renders the summary and findings table on success', async () => {
    const user = userEvent.setup();
    global.fetch.mockResolvedValue(
      jsonResponse(200, {
        url: 'https://example.com/',
        auditedAt: '2026-01-01T00:00:00.000Z',
        summary: { error: 1, warning: 2, info: 0, total: 3 },
        findings: [
          {
            category: 'functional',
            rule: 'http-error-response',
            severity: 'error',
            message: 'HTTP 500',
            url: 'https://example.com/',
          },
          {
            category: 'metadata',
            rule: 'missing-canonical',
            severity: 'warning',
            message: 'Missing <link rel="canonical">',
          },
        ],
      })
    );

    render(<App />);
    await user.type(screen.getByPlaceholderText('https://example.com'), 'https://example.com');
    await user.click(screen.getByRole('button', { name: 'Run audit' }));

    await waitFor(() => expect(screen.getByText('Total 3')).toBeInTheDocument());
    expect(screen.getByText('Errors 1')).toBeInTheDocument();
    expect(screen.getByText('Warnings 2')).toBeInTheDocument();
    expect(screen.getByText('HTTP 500')).toBeInTheDocument();
    expect(screen.getByText('missing-canonical')).toBeInTheDocument();
  });

  it('shows an empty-findings message for a clean audit', async () => {
    const user = userEvent.setup();
    global.fetch.mockResolvedValue(
      jsonResponse(200, {
        url: 'https://example.com/',
        auditedAt: '2026-01-01T00:00:00.000Z',
        summary: { error: 0, warning: 0, info: 0, total: 0 },
        findings: [],
      })
    );

    render(<App />);
    await user.type(screen.getByPlaceholderText('https://example.com'), 'https://example.com');
    await user.click(screen.getByRole('button', { name: 'Run audit' }));

    await waitFor(() =>
      expect(screen.getByText('No findings — clean audit.')).toBeInTheDocument()
    );
  });

  it('shows the API error message when the request fails', async () => {
    const user = userEvent.setup();
    global.fetch.mockResolvedValue(jsonResponse(400, { error: '"nope" is not a valid URL' }));

    render(<App />);
    await user.type(screen.getByPlaceholderText('https://example.com'), 'nope');
    await user.click(screen.getByRole('button', { name: 'Run audit' }));

    await waitFor(() =>
      expect(screen.getByText('"nope" is not a valid URL')).toBeInTheDocument()
    );
  });

  it('shows a generic error message when fetch itself rejects', async () => {
    const user = userEvent.setup();
    global.fetch.mockRejectedValue(new TypeError('Failed to fetch'));

    render(<App />);
    await user.type(screen.getByPlaceholderText('https://example.com'), 'https://example.com');
    await user.click(screen.getByRole('button', { name: 'Run audit' }));

    await waitFor(() => expect(screen.getByText('Failed to fetch')).toBeInTheDocument());
  });
});

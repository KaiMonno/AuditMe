import { useState } from 'react';

const BROWSERS = ['chromium', 'firefox', 'webkit'];

function LogoMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M11 4a7 7 0 1 0 4.35 12.5l4.57 4.58a1 1 0 0 0 1.42-1.42l-4.58-4.57A7 7 0 0 0 11 4Zm-5 7a5 5 0 1 1 10 0 5 5 0 0 1-10 0Z"
          fill="currentColor"
        />
        <path d="M8.5 11.5 10 13l3.5-3.5" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

function ErrorIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M10 2 1 17h18L10 2Zm0 5v5m0 3h.01"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M10 2 11.6 7.4 17 9l-5.4 1.6L10 16l-1.6-5.4L3 9l5.4-1.6L10 2Z"
        fill="currentColor"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="8.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M6.5 10.2 8.8 12.5 13.5 7.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SummaryBar({ summary }) {
  return (
    <div className="summary">
      <span className="summary-item total">
        <span className="dot" />
        Total {summary.total}
      </span>
      <span className="summary-item error">
        <span className="dot" />
        Errors {summary.error}
      </span>
      <span className="summary-item warning">
        <span className="dot" />
        Warnings {summary.warning}
      </span>
      <span className="summary-item info">
        <span className="dot" />
        Info {summary.info}
      </span>
    </div>
  );
}

function AiSummaryPanel({ result }) {
  const [status, setStatus] = useState('idle'); // idle | loading | error | done
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);

  async function handleClick() {
    setStatus('loading');
    setError(null);

    try {
      const res = await fetch('/api/summary', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ result }),
      });
      const body = await res.json();

      if (!res.ok) {
        setError(body.error || `Request failed with status ${res.status}`);
        setStatus('error');
        return;
      }

      setSummary(body.summary);
      setStatus('done');
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  }

  return (
    <div className="ai-summary">
      {status === 'idle' && (
        <button type="button" className="summarize-button" onClick={handleClick}>
          <SparkleIcon />
          Summarize with AI
        </button>
      )}
      {status === 'loading' && (
        <p className="ai-summary-loading">
          <span className="spinner dark" />
          Generating summary…
        </p>
      )}
      {status === 'error' && (
        <p className="error-banner">
          <ErrorIcon />
          {error}
        </p>
      )}
      {status === 'done' && <p className="ai-summary-text">{summary}</p>}
    </div>
  );
}

function FindingsTable({ findings }) {
  if (findings.length === 0) {
    return (
      <p className="empty-state">
        <CheckIcon />
        No findings — clean audit.
      </p>
    );
  }

  return (
    <div className="findings-wrap">
      <table className="findings">
        <thead>
          <tr>
            <th>Severity</th>
            <th>Category</th>
            <th>Rule</th>
            <th>Message</th>
            <th>URL</th>
          </tr>
        </thead>
        <tbody>
          {findings.map((f, i) => (
            <tr key={i} className={f.severity}>
              <td>
                <span className="severity-cell">
                  <span className="dot" />
                  {f.severity}
                </span>
              </td>
              <td>{f.category}</td>
              <td className="rule-cell">{f.rule}</td>
              <td>{f.message}</td>
              <td className="url-cell">{f.url || ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function App() {
  const [url, setUrl] = useState('');
  const [browser, setBrowser] = useState('chromium');
  const [status, setStatus] = useState('idle'); // idle | loading | error | done
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('loading');
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/audits', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url, browser }),
      });
      const body = await res.json();

      if (!res.ok) {
        setError(body.error || `Request failed with status ${res.status}`);
        setStatus('error');
        return;
      }

      setResult(body);
      setStatus('done');
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  }

  const loading = status === 'loading';

  return (
    <main className="page">
      <header>
        <div className="brand">
          <LogoMark />
          <h1>AuditMe</h1>
        </div>
        <p className="subtitle">
          Functional, metadata/SEO, and accessibility audit for a single URL.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="audit-form">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com"
          required
          disabled={loading}
        />
        <select value={browser} onChange={(e) => setBrowser(e.target.value)} disabled={loading}>
          {BROWSERS.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
        <button type="submit" disabled={loading}>
          {loading && <span className="spinner" />}
          {loading ? 'Auditing…' : 'Run audit'}
        </button>
      </form>

      {status === 'error' && (
        <p className="error-banner">
          <ErrorIcon />
          {error}
        </p>
      )}

      {status === 'done' && result && (
        <section className="results">
          <p className="audited-url">
            <a href={result.url} target="_blank" rel="noreferrer">
              {result.url}
            </a>{' '}
            <span className="audited-at">audited {result.auditedAt}</span>
          </p>
          <SummaryBar summary={result.summary} />
          <AiSummaryPanel key={result.auditedAt} result={result} />
          <FindingsTable findings={result.findings} />
        </section>
      )}
    </main>
  );
}

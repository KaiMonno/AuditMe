import { useState } from 'react';

const BROWSERS = ['chromium', 'firefox', 'webkit'];

function SummaryBar({ summary }) {
  return (
    <div className="summary">
      <span className="summary-item total">Total {summary.total}</span>
      <span className="summary-item error">Errors {summary.error}</span>
      <span className="summary-item warning">Warnings {summary.warning}</span>
      <span className="summary-item info">Info {summary.info}</span>
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
          Summarize with AI
        </button>
      )}
      {status === 'loading' && <p className="ai-summary-loading">Generating summary…</p>}
      {status === 'error' && <p className="error-banner">{error}</p>}
      {status === 'done' && <p className="ai-summary-text">{summary}</p>}
    </div>
  );
}

function FindingsTable({ findings }) {
  if (findings.length === 0) {
    return <p className="empty-state">No findings — clean audit.</p>;
  }

  return (
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
            <td>{f.severity}</td>
            <td>{f.category}</td>
            <td>{f.rule}</td>
            <td>{f.message}</td>
            <td className="url-cell">{f.url || ''}</td>
          </tr>
        ))}
      </tbody>
    </table>
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
        <h1>AuditMe</h1>
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
          {loading ? 'Auditing…' : 'Run audit'}
        </button>
      </form>

      {status === 'error' && <p className="error-banner">{error}</p>}

      {status === 'done' && result && (
        <section className="results">
          <p className="audited-url">
            {result.url} <span className="audited-at">audited {result.auditedAt}</span>
          </p>
          <SummaryBar summary={result.summary} />
          <AiSummaryPanel key={result.auditedAt} result={result} />
          <FindingsTable findings={result.findings} />
        </section>
      )}
    </main>
  );
}

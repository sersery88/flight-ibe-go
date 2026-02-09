'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div style={{ padding: 40, fontFamily: 'monospace' }}>
          <h2 style={{ color: 'red' }}>Application Error</h2>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: 12 }}>
            {error.message}
            {'\n\n'}
            {error.stack}
          </pre>
          <button onClick={reset} style={{ padding: '8px 16px', cursor: 'pointer' }}>
            Retry
          </button>
        </div>
      </body>
    </html>
  );
}

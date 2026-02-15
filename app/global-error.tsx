'use client';

export default function GlobalError({ error }: { error: Error }) {
  return (
    <html lang="fr">
      <body style={{ margin: 0, background: '#020617', color: '#e2e8f0', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ maxWidth: 900, margin: '40px auto', padding: '0 16px' }}>
          <div style={{ border: '1px solid #334155', borderRadius: 12, background: 'rgba(15,23,42,.8)', padding: 16 }}>
            <p style={{ margin: 0, color: '#fda4af', fontWeight: 700 }}>Erreur globale</p>
            <p style={{ marginTop: 8, fontSize: 12, color: '#94a3b8' }}>{error.message}</p>
          </div>
        </div>
      </body>
    </html>
  );
}

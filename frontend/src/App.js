import React, { useCallback, useEffect, useState } from 'react';
import './App.css';

/** URL de base de l'API — calculée au runtime dans le navigateur */
export function getApiBase() {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    // Static Site React sur Render → requêtes relatives + _redirects
    if (host.endsWith('.onrender.com') && host.startsWith('react-')) {
      return '';
    }
  }
  const fromEnv = process.env.REACT_APP_API_URL || '';
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  if (process.env.NODE_ENV === 'development') return 'http://localhost:5000';
  return '';
}

const apiFetch = async (apiBase, path, retries = 5) => {
  const url = `${apiBase}${path}`;
  for (let i = 0; i < retries; i += 1) {
    try {
      const res = await fetch(url);
      if (res.ok) return res;
      if (res.status >= 500 && i < retries - 1) {
        await new Promise((r) => setTimeout(r, 6000));
        continue;
      }
      throw new Error(`${url} → HTTP ${res.status}`);
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise((r) => setTimeout(r, 6000));
    }
  }
  return null;
};

function App() {
  const [apiBase, setApiBase] = useState('');
  const [health, setHealth] = useState(null);
  const [info, setInfo] = useState(null);
  const [env, setEnv] = useState(null);
  const [items, setItems] = useState([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setApiBase(getApiBase());
  }, []);

  const fetchAll = useCallback(async () => {
    const base = getApiBase();
    setApiBase(base);
    setLoading(true);
    setError(null);

    const fetchJson = async (path) => {
      const res = await apiFetch(base, path);
      return res.json();
    };

    try {
      const [healthData, infoData, envData] = await Promise.all([
        fetchJson('/health'),
        fetchJson('/info'),
        fetchJson('/env'),
      ]);
      setHealth(healthData);
      setInfo(infoData);
      setEnv(envData);
    } catch (err) {
      const siteUrl = 'https://react-nicolasbellina.onrender.com';
      setError(
        `Impossible de joindre l'API (requête vers ${base || 'même domaine'}${err.message ? `). ${err.message}` : ')'}. ` +
          `Utilisez ${siteUrl}, attendez 60 s (plan gratuit Render), puis Réessayez. ` +
          `Test direct : https://flask-render-iac-nicolasbellina.onrender.com/health`
      );
      setLoading(false);
      return;
    }

    try {
      const itemsRes = await apiFetch(base, '/api/items', 2);
      const itemsData = await itemsRes.json();
      if (!itemsRes.ok) throw new Error(itemsData.error || 'items');
      setItems(Array.isArray(itemsData) ? itemsData : []);
      setError(null);
    } catch (err) {
      setItems([]);
      setError(
        `API OK, PostgreSQL manquant. Secret GitHub : RENDER_DATABASE_URL = Internal Database URL. ${err.message}`
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (apiBase !== undefined) fetchAll();
  }, [apiBase, fetchAll]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    const base = getApiBase();

    setSubmitting(true);
    try {
      const postRes = await fetch(`${base}/api/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim() }),
      });
      if (!postRes.ok) throw new Error('Erreur lors de la création');
      setTitle('');
      await fetchAll();
    } catch {
      setError("Échec de l'ajout en base de données.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    const base = getApiBase();
    try {
      const res = await fetch(`${base}/api/items/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      await fetchAll();
    } catch {
      setError('Échec de la suppression.');
    }
  };

  const apiLabel =
    apiBase ||
    (typeof window !== 'undefined'
      ? `${window.location.origin} (proxy → Flask)`
      : '…');

  return (
    <div className="app">
      <header className="hero">
        <p className="badge">Atelier Render — ESGI M1</p>
        <h1>Plateforme React + Flask + PostgreSQL</h1>
        <p className="subtitle">
          Front React · Back Flask · BDD PostgreSQL · Adminer
        </p>
      </header>

      <main className="content">
        {error && (
          <div className="alert alert-error">
            <strong>Erreur</strong> — {error}
            <button type="button" onClick={fetchAll}>
              Réessayer
            </button>
          </div>
        )}

        <section className="cards">
          <article className="card">
            <h2>Health</h2>
            {loading ? (
              <p className="muted">Chargement…</p>
            ) : health ? (
              <>
                <span
                  className={`pill ${health.database ? 'pill-ok' : 'pill-warn'}`}
                >
                  {health.status}
                </span>
                <p>
                  Base de données :{' '}
                  <strong>{health.database ? 'connectée' : 'indisponible'}</strong>
                </p>
              </>
            ) : (
              <p className="muted">—</p>
            )}
          </article>

          <article className="card">
            <h2>Info</h2>
            {info ? (
              <ul className="meta-list">
                <li>
                  <span>App</span> {info.app}
                </li>
                <li>
                  <span>Étudiant</span> {info.student}
                </li>
                <li>
                  <span>Version</span> {info.version}
                </li>
              </ul>
            ) : (
              <p className="muted">—</p>
            )}
          </article>

          <article className="card">
            <h2>Environnement</h2>
            {env ? (
              <p className="env-value">{env.env || 'non défini'}</p>
            ) : (
              <p className="muted">—</p>
            )}
          </article>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>Éléments en base (PostgreSQL)</h2>
            <span className="api-url">API : {apiLabel}</span>
          </div>

          <form className="add-form" onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder="Nouvel élément à enregistrer…"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={submitting || !!error}
            />
            <button type="submit" disabled={submitting || !!error || !title.trim()}>
              {submitting ? 'Ajout…' : 'Ajouter'}
            </button>
          </form>

          {loading ? (
            <p className="muted center">Chargement des données…</p>
          ) : items.length === 0 && !error ? (
            <p className="muted center">Aucun élément pour le moment.</p>
          ) : (
            <ul className="item-list">
              {items.map((item) => (
                <li key={item.id}>
                  <div>
                    <strong>{item.title}</strong>
                    <small>
                      #{item.id} —{' '}
                      {item.created_at
                        ? new Date(item.created_at).toLocaleString('fr-FR')
                        : ''}
                    </small>
                  </div>
                  <button
                    type="button"
                    className="btn-delete"
                    onClick={() => handleDelete(item.id)}
                    aria-label={`Supprimer ${item.title}`}
                  >
                    Supprimer
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <footer>Nicolas Bellina — Atelier Render 2026</footer>
    </div>
  );
}

export default App;

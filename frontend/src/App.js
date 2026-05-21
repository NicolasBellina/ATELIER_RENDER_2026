import React, { useCallback, useEffect, useState } from 'react';
import './App.css';

// En prod Render : requêtes relatives proxifiées par public/_redirects
// En dev local : REACT_APP_API_URL ou localhost:5000
const API_URL = (
  process.env.REACT_APP_API_URL ||
  (process.env.NODE_ENV === 'development'
    ? 'http://localhost:5000'
    : '')
).replace(/\/$/, '');

const apiFetch = async (path, retries = 4) => {
  const url = `${API_URL}${path}`;
  for (let i = 0; i < retries; i += 1) {
    try {
      const res = await fetch(url);
      if (res.ok) return res;
      if (res.status >= 500 && i < retries - 1) {
        await new Promise((r) => setTimeout(r, 5000));
        continue;
      }
      throw new Error(`${path} → HTTP ${res.status}`);
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
};

function App() {
  const [health, setHealth] = useState(null);
  const [info, setInfo] = useState(null);
  const [env, setEnv] = useState(null);
  const [items, setItems] = useState([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);

    const fetchJson = async (path) => {
      const res = await apiFetch(path);
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
      const hint = API_URL
        ? `Ouvrez d'abord ${API_URL}/health dans un onglet (réveil du serveur Render gratuit), puis réessayez.`
        : 'Ouvrez https://react-nicolasbellina.onrender.com (pas un autre site). Le serveur Render gratuit met ~30s à démarrer.';
      setError(
        `Impossible de joindre l'API Flask${API_URL ? ` (${API_URL})` : ''}. ${hint} Détail : ${err.message}`
      );
      setLoading(false);
      return;
    }

    try {
      const itemsRes = await apiFetch('/api/items');
      const itemsData = await itemsRes.json();
      if (!itemsRes.ok) throw new Error(itemsData.error || 'items');
      setItems(itemsData);
    } catch (err) {
      setItems([]);
      setError(
        `API joignable, mais PostgreSQL non configuré. Ajoutez le secret GitHub RENDER_DATABASE_URL (Internal Database URL Render), puis redéployez. Détail : ${err.message}`
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSubmitting(true);
    try {
      const postRes = await fetch(`${API_URL}/api/items`, {
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
    try {
      const res = await fetch(`${API_URL}/api/items/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error();
      await fetchAll();
    } catch {
      setError('Échec de la suppression.');
    }
  };

  return (
    <div className="app">
      <header className="hero">
        <p className="badge">Atelier Render — ESGI M1</p>
        <h1>Plateforme React + Flask + PostgreSQL</h1>
        <p className="subtitle">
          Front React · Back Flask · BDD PostgreSQL · Adminer sur le port 8080
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
            <span className="api-url">API : {API_URL}</span>
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
          ) : items.length === 0 ? (
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

      <footer>
        Nicolas Bellina — Atelier Render 2026
      </footer>
    </div>
  );
}

export default App;

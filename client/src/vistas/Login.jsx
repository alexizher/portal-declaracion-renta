import React, { useEffect, useState } from 'react';
import { api, setToken } from '../api.js';
import Turnstile, { configPublica } from '../Turnstile.jsx';

export default function Login({ onLogin }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [siteKey, setSiteKey] = useState(null);
  const [tsToken, setTsToken] = useState(null);

  useEffect(() => {
    configPublica().then((c) => setSiteKey(c.turnstile));
  }, []);

  async function entrar(e) {
    e.preventDefault();
    setCargando(true);
    setError(null);
    try {
      const { token } = await api('/login', {
        method: 'POST',
        body: { password, turnstile: tsToken },
      });
      setToken(token);
      onLogin();
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="login">
      <form onSubmit={entrar} className="tarjeta login-form">
        <img src="/logo_DM.svg" alt="DM" className="logo-login" />
        <h1>Declaración de Renta</h1>
        <p>Panel de administración</p>
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
        />
        <Turnstile siteKey={siteKey} onToken={setTsToken} />
        {error && <div className="error">{error}</div>}
        <button type="submit" disabled={cargando || !password || Boolean(siteKey && !tsToken)}>
          {cargando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}

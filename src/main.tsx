import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './landing.css';

function Home({ admin = false }: { admin?: boolean }) {
  return (
    <div className="games-home">
      <header className="games-home-header">
        <a className="games-home-logo" href="/" aria-label="AxoZap Games home">
          <img src="/mylogo.png" alt="AxoZap logo" />
        </a>
        <h1>AxoZap - Games</h1>
      </header>
      <main className="games-home-main">
        <div className="games-choices">
          <a className="games-choice games-choice--celeste" href={admin ? '/celeste/admin' : '/celeste'}>{admin ? 'Celeste Admin' : 'Celeste'}</a>
          <a className="games-choice games-choice--gd" href={admin ? '/gd/admin' : '/gd'}>{admin ? 'Geometry Dash Admin' : 'Geometry Dash'}</a>
        </div>
      </main>
    </div>
  );
}

async function start() {
  const path = window.location.pathname.toLowerCase().replace(/\/+$/, '') || '/';
  const root = createRoot(document.getElementById('root')!);
  if (path === '/gd' || path === '/gd/admin') {
    const [{ default: App }] = await Promise.all([import('./gd/App'), import('./gd/styles.css')]);
    document.title = 'Geometry Dash | AxoZap Games';
    root.render(<StrictMode><App /></StrictMode>);
  } else if (path === '/celeste' || path === '/celeste/admin') {
    const [{ default: App }] = await Promise.all([import('./celeste/App'), import('./celeste/styles.css')]);
    document.title = 'Celeste | AxoZap Games';
    root.render(<StrictMode><App /></StrictMode>);
  } else if (path === '/' || path === '/admin') {
    document.title = path === '/admin' ? 'Admin | AxoZap Games' : 'AxoZap Games';
    root.render(<StrictMode><Home admin={path === '/admin'} /></StrictMode>);
  } else {
    root.render(<StrictMode><Home /></StrictMode>);
  }
}

void start();

import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { HomePage } from './pages/HomePage.jsx';
import './styles.css';

const AboutPage = lazy(() => import('./pages/AboutPage.jsx'));

const routes = {
  '/': HomePage,
  '/about': AboutPage
};

function navigate(path) {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

function App() {
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const handleLocation = () => setPath(window.location.pathname);
    window.addEventListener('popstate', handleLocation);
    return () => window.removeEventListener('popstate', handleLocation);
  }, []);

  const Page = useMemo(() => routes[path] ?? HomePage, [path]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Практическое занятие 25</p>
          <h1>Vite React приложение</h1>
        </div>
        <nav className="navigation" aria-label="Основная навигация">
          <button className={path === '/' ? 'active' : ''} onClick={() => navigate('/')}>
            Главная
          </button>
          <button className={path === '/about' ? 'active' : ''} onClick={() => navigate('/about')}>
            О проекте
          </button>
        </nav>
      </header>

      <main>
        <Suspense fallback={<div className="loading">Загрузка маршрута...</div>}>
          <Page />
        </Suspense>
      </main>
    </div>
  );
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

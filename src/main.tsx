import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import { bootstrap } from './db/seed';
import { useAuth } from './store/authStore';
import { initSync } from './sync/engine';
import { PwaUpdatePrompt } from './components/PwaUpdatePrompt';

async function start() {
  // Dados globais (biblioteca oficial) — independem de conta.
  await bootstrap();
  // Restaura sessao de autenticacao (se houver) e carrega os dados do usuario.
  await useAuth.getState().init();
  initSync();

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <App />
        <PwaUpdatePrompt />
      </BrowserRouter>
    </React.StrictMode>,
  );
}

void start();

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import type { BetoSettings, Intensity } from './beto/useBeto';
import './styles.css';

// Ajustes de BETO. Se pueden cambiar con variables VITE_BETO_* al compilar
// o en la URL para pruebas: ?ia=0&tono=rudo&sonido=0
const q = new URLSearchParams(window.location.search);
const flag = (v: string | null | undefined, def: boolean) => (v == null || v === '' ? def : !/^(0|false|no)$/i.test(v));
const tono = q.get('tono') || import.meta.env.VITE_BETO_INTENSITY;

const settings: BetoSettings = {
  liveAI: flag(q.get('ia') ?? import.meta.env.VITE_BETO_LIVE_AI, true),
  intensity: (['suave', 'normal', 'rudo'].includes(tono) ? tono : 'normal') as Intensity,
  sound: flag(q.get('sonido') ?? import.meta.env.VITE_BETO_SOUND, true),
  endpoint: import.meta.env.VITE_BETO_ENDPOINT || '/api/beto',
  dataEndpoint: import.meta.env.VITE_BETO_DATA_ENDPOINT || '/api/partidos',
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App settings={settings} />
  </StrictMode>,
);

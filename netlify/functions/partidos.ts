// GET /api/partidos — partidos, jugadores y estadísticas que usa BETO en el sitio.
// Datos reales de API-Football (Liga MX) o, si no hay conexión, los de ejemplo.
import type { Config } from '@netlify/functions';
import { getDataset } from '../../src/server/apiFootball';

export default async () => {
  const ds = await getDataset();
  return new Response(JSON.stringify(ds), {
    headers: {
      'content-type': 'application/json',
      // La CDN de Netlify sirve la misma respuesta 2 min para cuidar la cuota de la API.
      'Netlify-CDN-Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
      'Cache-Control': 'public, max-age=60',
    },
  });
};

export const config: Config = { path: '/api/partidos' };

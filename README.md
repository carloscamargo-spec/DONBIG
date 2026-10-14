# BETO · Coach de entretenimiento de Big Bola

Implementación en React + Vite del diseño `project/BETO Coach Chat.dc.html` (Claude Design).
El chat de BETO va dentro de una maqueta de bigbola.mx, junto con el sistema gráfico y el "cerebro" de BETO.

## Correr

```bash
npm install
npm run dev          # http://localhost:5173 — sin IA: usa respuestas armadas
npx netlify dev      # con la función /api/beto (requiere ANTHROPIC_API_KEY)
npm run build        # dist/
```

## Ajustes

| Ajuste | URL (pruebas) | Variable de compilación | Default |
|---|---|---|---|
| IA en preguntas libres | `?ia=0` | `VITE_BETO_LIVE_AI` | encendida |
| Tono | `?tono=suave\|normal\|rudo` | `VITE_BETO_INTENSITY` | `normal` |
| Sonido del silbato | `?sonido=0` | `VITE_BETO_SOUND` | encendido |
| Endpoint de IA | — | `VITE_BETO_ENDPOINT` | `/api/beto` |

Servidor (Netlify → Environment variables):

| Variable | Para qué | Default |
|---|---|---|
| `ANTHROPIC_API_KEY` (o `beto_key1`) | IA de BETO (obligatoria para respuestas libres) | — |
| `API_FOOTBALL_KEY` (o `API_FOOTBALL`) | Partidos reales de Liga MX (api-sports.io). Sin ella, datos de ejemplo | — |
| `BETO_MODEL` | Modelo de Claude | `claude-sonnet-5-5` |
| `BETO_LEAGUE_ID` | Liga de API-Football | `262` (Liga MX) |
| `BETO_SEASON` | Forzar temporada (si el plan no da la actual) | la actual |
| `BETO_LIVE_TTL_MIN` | Minutos de caché con partidos en vivo | `5` |
| `THESPORTSDB_KEY` | Clave de TheSportsDB (respaldo gratis) | `123` (pública) |

Deportes: Liga MX, Premier League, NFL y MLB (estos tres siempre de TheSportsDB). Fuentes de Liga MX, en orden: **API-Football** (si hay clave y el plan da la temporada actual; el plan gratis no la da), **TheSportsDB** (gratis, sin registro: calendario, resultados y tabla; el pronóstico se estima con la tabla) y, si ambas fallan, **datos de ejemplo**.

`/api/partidos` devuelve el Dataset que usa el sitio. Si `source` es `demo`, el campo `notice` explica por qué (falta la clave, plan sin acceso a la temporada, cuota agotada…). La insignia del sitio dice **DATOS REALES** o **DATOS DE EJEMPLO**. Los botones de deporte filtran los partidos.

BETO explica juegos de casino paso a paso (tarjeta "Cómo se juega", datos en `CASINO` de `src/beto/data.ts`) y termina sus respuestas con una pregunta y respuestas rápidas (en la IA, la línea `OPCIONES:`).

### Cuota de API-Football (plan gratis ≈ 100 consultas/día)

Todo pasa por una caché en Netlify Blobs: temporada 24 h, partidos 30 min (5 min si hay uno en vivo), pronósticos 6 h, goleadores 12 h. Una actualización completa cuesta ~7 consultas; si algo falla, se sirve lo último guardado y no se reintenta en 10 min.

## Cómo está armado

- `src/beto/data.ts` — tipos, `Dataset`, datos de ejemplo (`DEMO`), juegos y secciones de bigbola.mx, momios simulados y frases.
- `src/beto/bigbola.ts` — conocimiento de bigbola.mx (bono de bienvenida, promos, pagos, deportes, casino, juego responsable). Revisado oct 2026: actualízalo cuando cambien las promos.
- `src/server/apiFootball.ts` — conector de API-Football: partidos de Liga MX, pronóstico, forma, comparativa y goleadores, con caché.
- `netlify/functions/partidos.ts` — `GET /api/partidos`.
- `src/beto/cards.ts` — tarjetas del chat (partido, pronóstico, juegos, pausa, jugadores, estadísticas, secciones). Las usan el cliente y el servidor.
- `src/beto/scripted.ts` — respuestas armadas (botones rápidos, "La opinión de BETO" y respaldo si la IA falla).
- `src/beto/useBeto.ts` — motor del chat: poses, reacciones por modo, silbatazo, regaños por inactividad (25 s / 30 s, hasta 3), gestos cada 6 s minimizado y cada 10 s abierto.
- `src/beto/poses.ts` — los 6 gestos, posición de párpados (parpadeo cada 3 s) y animaciones.
- `src/components/` — `BetoFigure` (personaje animado), `BetoChat` (chat y lanzador), `MessageCard`.
- `netlify/functions/beto.ts` — `POST /api/beto`: Claude con herramientas (`buscar_partidos`, `pronostico_partido`, `juegos_casino`, `info_sitio`, `jugadores_clave`, `estadisticas_partido`, `sugerir_pausa`). Devuelve `{ text, mode, card }`. Usa respaldo automático del servidor ante rechazos (`fallbacks: "default"`).

## Pendiente antes de producción

- Partidos de Liga MX ya son reales (API-Football). Los momios son simulados a partir del pronóstico; bono, promos, pagos y juegos vienen de bigbola.mx pero escritos a mano (no se sincronizan solos). Para producción, usar el proveedor con licencia de Big Bola.
- Limitar tasa por usuario en `/api/beto` y verificar mayoría de edad / sesión.
- `project/` conserva el paquete original de Claude Design como referencia.

# Ámsterdam en bici

Web app de la guía del viaje a Ámsterdam (7–9 de noviembre de 2026). Se instala en la pantalla de inicio del móvil y la usan dos personas a la vez.

- **Ruta:** itinerario por días, editable, con enlaces a Google Maps en modo bici.
- **Mapa:** todos los sitios sobre OpenStreetMap, ubicación GPS, añadir y mover sitios (mantén pulsado el mapa para crear uno ahí).
- **Claude:** chat compartido con micrófono. Claude puede cambiar sitios, paradas y fichas, leer los documentos y buscar en internet.
- **Docs:** PDF y fotos compartidos.
- **Viaje:** pendientes y fichas de información editables.

## Cómo está hecho

- `index.html`, `style.css`, `app.js`: la app, sin dependencias de compilación. Publicada con GitHub Pages.
- `sw.js`: guarda la app y los trozos de mapa vistos para usarla con mala cobertura.
- `supabase/functions/api/index.ts`: función de Supabase que guarda los datos y llama a la API de Claude.

Datos en el proyecto de Supabase `amsterdam-viaje`. La función necesita dos secretos: `TRIP_CODE` (código de acceso de la app) y `ANTHROPIC_API_KEY`.

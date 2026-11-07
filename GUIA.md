# Guía rápida · Ámsterdam en bici

## Entrar

- Dirección: **https://marcos-gc.github.io/Amsterdam-travel/** (cuando GitHub Pages esté activado)
- Código del viaje: el que os pasó Claude por el chat (no se guarda aquí porque este repositorio puede ser público)
- Elige quién eres (Marcos o Isabel). Cada uno en su móvil.

### Instalarla como app

- **iPhone:** ábrela en **Safari** → botón Compartir → **Añadir a pantalla de inicio**.
- **Android:** ábrela en **Chrome** → menú ⋮ → **Instalar aplicación**.

## Qué hay en cada pestaña

| Pestaña | Para qué |
| --- | --- |
| **Ruta** | El plan de cada día por horas. Arriba, la siguiente parada con botón **Ir**. El tiempo por horas y la puesta de sol. El lápiz edita una parada; **Añadir parada** crea otra. |
| **Mapa** | Todos los sitios. Elige un día para ver su ruta en bici dibujada con km y minutos. **⊙** muestra dónde estás. **Cerca de mí** lista lo más próximo. **+** añade un sitio (o mantén el dedo en el mapa para crearlo ahí). |
| **Claude** | Chat compartido con el micrófono. Pregunta o pide cambios: «añade el Noordermarkt al lunes», «retrasa la cena a las 19:30», «¿abre hoy el Stedelijk?». **Leer en voz alta** hace que Claude te conteste hablando. |
| **Docs** | Sube PDF o fotos (billetes, reservas, menús). Toca el bocadillo para preguntar a Claude por un documento. |
| **Viaje** | Pendientes y fichas (vuelos, hotel, bici, normas, si llueve). Los números en gris se copian con un toque. |

En la ficha de un sitio del mapa:
- **Ir en bici** abre la navegación de Google Maps.
- **Ruta desde aquí** dibuja el camino desde donde estás.
- **Añadir a la ruta** lo mete en el plan de un día.
- **Mover** sirve para recolocarlo si está mal situado.

Los cambios que hace uno aparecen en el móvil del otro en unos 20 segundos.

## Si algo falla

- **«El código no es correcto»:** revisa que esté todo en minúsculas y sin espacios. Se puede cambiar en Supabase → Table Editor → `app_config` → `trip_code`.
- **Claude dice que no tiene saldo:** añade crédito en console.anthropic.com → Billing.
- **El micrófono no funciona** (pasa a veces en iPhone con la app instalada): toca el campo de texto y usa el micrófono del teclado.
- **Sin cobertura:** la app enseña la última copia guardada y las zonas del mapa ya vistas.

## Después del viaje

Para que no haya costes, pausa o borra el proyecto **amsterdam-viaje** en Supabase (Project Settings → General → Pause project) y revoca la clave «amsterdam» en console.anthropic.com → API Keys.

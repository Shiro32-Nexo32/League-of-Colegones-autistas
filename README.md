# League of Colegones

Aplicación web estática para organizar partidas personalizadas de League of Legends entre amigos. Gestiona el ranking, sortea los equipos y campeones, registra MVP y guarda las últimas 20 partidas.

## Funcionalidades

- Ranking con puntos, victorias, MVP y porcentaje de victorias.
- Selección de entre 2 y 10 jugadores.
- Sorteo de equipos mediante Fisher–Yates. Si el número de jugadores es impar, busca el equilibrio por nivel y sortea entre todas las combinaciones empatadas como óptimas. La aleatoriedad usa `Math.random()` y no es criptográfica.
- Sorteo de campeones sin repetirlos dentro del mismo equipo.
- Registro de los MVP y del equipo ganador.
- Historial con los últimos 20 resultados.
- Editor para crear, renombrar, modificar o eliminar jugadores.
- Exportación e importación de copias de seguridad en JSON.

## Cómo ejecutarla

No necesita instalación, compilación ni dependencias propias. Se puede publicar como sitio estático o servir desde la carpeta del proyecto. La aplicación necesita conexión a internet para consultar la lista de campeones y sus imágenes en Riot Data Dragon. Si ese servicio no está disponible, el ranking y el historial locales siguen siendo visibles, pero no se pueden generar nuevas partidas.

## Ranking compartido con Cloudflare

El ranking y el historial se guardan en el navegador como copia local. Para compartirlos con otros dispositivos, esta aplicación utiliza un **Cloudflare Worker propio de League of Colegones** y un **espacio KV propio del proyecto**. No utiliza el Worker ni el espacio KV de KOI.

El sitio intentará conectar con:

`https://league-of-colegones-sync.raulbermudeztena.workers.dev/api/league/state`

Si Cloudflare obliga a usar otro subdominio o el nombre del Worker no está disponible, cambia la constante `SHARED_STATE_API` en `index.html` por la URL asignada.

### Configuración inicial en Cloudflare (sin instalar programas)

1. En el panel de Cloudflare, abre **Workers & Pages → KV** y crea un espacio KV nuevo llamado `COLEGONES_SHARED_STATE`. No selecciones el espacio KV de KOI.
2. Abre **Workers & Pages → Create → Worker** y crea un Worker llamado `league-of-colegones-sync`.
3. En el editor de código del Worker, reemplaza el ejemplo por el contenido completo de `cloudflare/worker.mjs` de este repositorio y guarda/despliega el Worker.
4. En la configuración del Worker, abre **Settings → Bindings**, añade una vinculación **KV Namespace** con el nombre de variable `COLEGONES_STATE` y selecciona el espacio `COLEGONES_SHARED_STATE` creado en el primer paso. Guarda y vuelve a desplegar si Cloudflare lo solicita.
5. Comprueba que la URL del Worker acaba en `/api/league/state` y responde con JSON indicando `"initialized": false` antes de activar el ranking.
6. Cuando el cambio de esta aplicación esté publicado en GitHub Pages, abre la web desde el navegador que contiene las estadísticas que quieres conservar. Entra al editor y pulsa **Activar ranking compartido** una sola vez.
7. Los demás dispositivos podrán abrir la misma web y cargarán el ranking compartido. No actives el ranking desde un navegador que tenga estadísticas incompletas o antiguas.

### Copias y límites importantes

- Antes de activar la sincronización, usa **Exportar copia** y guarda el JSON como respaldo.
- La primera activación toma el ranking y el historial de un solo navegador; no mezcla automáticamente datos que haya guardados en otros dispositivos.
- El Worker comprueba la revisión para detectar muchos conflictos. Cloudflare KV no ofrece una operación atómica de comparación y escritura, por lo que dos guardados exactamente simultáneos podrían competir; después de partidas simultáneas, revisad el ranking y conservad copias.
- El endpoint no requiere iniciar sesión. La restricción de origen ayuda frente a llamadas accidentales desde otras páginas, pero no impide que alguien técnicamente capaz envíe peticiones directas y modifique los datos. El PIN de la web solo oculta botones en el navegador; no es una medida de seguridad real. No guardéis información sensible en este sistema.

## Validación del código

Los scripts de comprobación se ejecutan con Node.js y no requieren paquetes externos:

```bash
node scripts/validate-inline-js.mjs
node scripts/test-team-randomization.mjs
node scripts/test-victory-registration.mjs
node scripts/test-cloudflare-worker.mjs
```

GitHub Actions ejecuta estas comprobaciones cuando hay cambios en `main` o se abre una pull request hacia esa rama.

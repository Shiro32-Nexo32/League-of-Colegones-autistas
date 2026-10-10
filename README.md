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

No necesita instalación, compilación ni dependencias propias. Se puede publicar como sitio estático o servir desde la carpeta del proyecto:

```bash
python -m http.server 8000
```

Después, abre `http://localhost:8000`. La aplicación necesita conexión a internet para consultar la lista de campeones y sus imágenes en Riot Data Dragon. Si ese servicio no está disponible, el ranking y el historial locales siguen siendo visibles, pero no se pueden generar nuevas partidas.

## Ranking compartido y copias de seguridad

El ranking y el historial se conservan en el `localStorage` como copia local y, una vez activado el servicio compartido, también se sincronizan con el servidor común. La web consulta cambios cada 15 segundos y sube los cambios después de guardarlos en la interfaz.

### Primera activación (una sola vez)

1. Despliega la versión actualizada del Cloudflare Worker desde el repositorio `Shiro32-Nexo32/KOI`, siguiendo su README y ejecutando `npx wrangler@latest deploy` con el `wrangler.toml` local que ya tiene configurado el namespace `SYNC_STATUS`.
2. Espera a que se publique esta web en GitHub Pages y ábrela en el navegador que contiene las estadísticas correctas.
3. Introduce el PIN, abre **Modo Editor** y pulsa **Activar ranking compartido**. Confirma únicamente si esa es la copia que quieres conservar como base común.
4. Después de ver **Ranking compartido activo**, el resto del grupo puede abrir la misma web: recibirá el ranking y el historial del servidor.

**Importante:** la primera activación convierte los datos de ese navegador en la copia común. No combina automáticamente las estadísticas independientes que existan en otros ordenadores. Exporta una copia antes de activarlo si necesitas conservar esos datos.

### Copias de seguridad y conflictos

En el editor, **Exportar copia** descarga un JSON con el ranking y el historial. **Importar copia** reemplaza los datos actuales después de pedir confirmación. Haz copias periódicas.

Si dos dispositivos cambian el ranking al mismo tiempo, el sistema detecta que la revisión del servidor ha cambiado y no sube encima los cambios antiguos de forma silenciosa. En ese caso, exporta primero una copia local y usa **Cargar ranking compartido** para recargar la versión común; habrá que reconciliar manualmente cualquier resultado que no se haya sincronizado.

## Seguridad

El PIN de acceso solo oculta los controles de la interfaz para evitar modificaciones accidentales. Como toda la aplicación se ejecuta en el navegador y su código es público, no debe considerarse una medida de seguridad real ni utilizarse para proteger datos sensibles.

## Validación del código

El script de comprobación no requiere paquetes adicionales:

```bash
node scripts/validate-inline-js.mjs
```

Comprueba la sintaxis del JavaScript incrustado en `index.html`. `scripts/test-team-randomization.mjs` cubre los empates del reparto impar y se ejecuta junto a esa comprobación en GitHub Actions al hacer push a `main` o abrir una pull request hacia esa rama.

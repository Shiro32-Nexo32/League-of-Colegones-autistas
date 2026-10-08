# League of Colegones

Aplicación web estática para organizar partidas personalizadas de League of Legends entre amigos. Gestiona el ranking, sortea los equipos y campeones, registra MVP y guarda las últimas 20 partidas.

## Funcionalidades

- Ranking con puntos, victorias, MVP y porcentaje de victorias.
- Selección de entre 2 y 10 jugadores.
- Sorteo aleatorio de equipos. Si el número de jugadores es impar, tiene en cuenta el nivel asignado para buscar equipos equilibrados.
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

## Datos y copias de seguridad

El ranking y el historial se guardan en el `localStorage` del navegador, no en un servidor. Por tanto, los datos no se sincronizan automáticamente entre dispositivos ni perfiles de navegador y se pueden perder si se borra el almacenamiento del sitio.

Para guardar una copia, entra en el editor y pulsa **Exportar copia**. Esto descarga un JSON con el ranking y el historial. Para restaurarlo, pulsa **Importar copia** y selecciona un archivo exportado por la aplicación. La importación reemplaza los datos actuales, tras pedir confirmación.

Conviene exportar una copia periódicamente, especialmente antes de limpiar los datos del navegador.

## Seguridad

El PIN de acceso solo oculta los controles de la interfaz para evitar modificaciones accidentales. Como toda la aplicación se ejecuta en el navegador y su código es público, no debe considerarse una medida de seguridad real ni utilizarse para proteger datos sensibles.

## Validación del código

El script de comprobación no requiere paquetes adicionales:

```bash
node scripts/validate-inline-js.mjs
```

Comprueba la sintaxis del JavaScript incrustado en `index.html`. La validación también se ejecuta automáticamente mediante GitHub Actions al hacer push a `main` o abrir una pull request hacia esa rama.

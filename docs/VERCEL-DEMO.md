# Publicar la demo de conversaciones en Vercel

Esta modalidad publica interfaz y acceso a los agentes Senior/Intern por voz o texto, incluidos los idiomas ES/EN y pantalla compartida. Usa Vercel Functions para obtener credenciales temporales; la conversación se conecta directamente del navegador a ElevenLabs. No requiere Render ni migración de datos.

## Importación rápida

1. Importar este repositorio, rama main, raíz `./`, preset **Vite**.
2. Instalación `npm ci`, build `npm run build`, salida `dist`, Node 24.x. `vercel.json` deja estos valores preparados.
3. En Environment Variables → Import .env, importar un archivo con estas tres variables (valores reales privados):

   ```dotenv
   ELEVENLABS_API_KEY=clave_privada_del_proveedor
   ELEVENLABS_AGENT_ID=agent_2001m41w9r5jendtg1cfvgcptd4v
   ELEVENLABS_TUTOR_AGENT_ID=agent_2501m42jwa7dfyc9xss6nxwdxf0j
   ```

4. Seleccionar Production y Preview y desplegar. No usar prefijo `VITE_` en ninguna credencial. Por indicación del usuario, la demo pública inicia sin código de acceso, aunque exista una variable `LIVEKIT_JOIN_CODE` de una importación anterior.
5. El dominio de producción y el de cada deployment se obtienen de las variables de sistema `VERCEL_PROJECT_PRODUCTION_URL`/`VERCEL_URL`. Si se agrega dominio propio, configurar `APP_ORIGIN=https://dominio-exacto` y redeploy. Sin `/` final, rutas ni localhost.
6. Abrir la URL, elegir idioma y perfil, entrar a conversación, aceptar el aviso e iniciar por texto o micrófono.

No importar el `.env` local completo: contiene rutas del Mac y parámetros de la demo local. El archivo preparado para el operador está fuera del repositorio, con permisos privados; no se publica ni se imprime su contenido.

## Límites de esta entrega urgente

- La bóveda local queda intacta y no se transfiere. La UI publicada muestra un aviso; Biblioteca, Guardadas y Mapas conducen a una explicación y permiten explorar ejemplos. No se crean procesos ni se guardan capturas/transcripciones en Vercel. ElevenLabs conserva lo que permitan sus ajustes existentes, y el tutor mantiene el conocimiento que ya tenga configurado.
- El adaptador no importa el módulo de bóveda, no inicia sincronizadores y rechaza sus escrituras incluso si por error se importa `VAULT_PATH`.
- El acceso a los agentes está abierto por defecto en la demo pública. Quien visite el sitio puede iniciar conversaciones y consumir créditos del proyecto. Se mantienen consentimiento, validación de origen y limitador por instancia; no representan autenticación individual ni una cuota global. Para volver a exigir código: configurar `AGENT_OPEN_ACCESS=false` y `LIVEKIT_JOIN_CODE` con al menos 16 caracteres y volver a desplegar. No es necesario borrar un código previamente importado para usar el modo abierto.
- `VERCEL=1` durante el build activa esta modalidad de interfaz. Para ensayarla localmente: `VITE_CLOUD_DEMO=true npm run build`. Un build local normal sigue usando la bóveda como antes.
- La clave queda en la función. El frontend solo recibe un token o URL temporal. El proxy solo permite los seis endpoints de estado/disponibilidad/sesión; no habilita la ruta antigua de videollamadas.

## Verificación

Pruebas de HTTP crudo y JSON preprocesado por la plataforma; rutas directas y reescritas; roles independientes; códigos/consentimiento/orígenes; límites de cuerpo; bóveda deshabilitada. El adaptador obtuvo accesos temporales reales de ElevenLabs para Senior/Intern, voz/texto. Esto verifica autorización, no una llamada física ni un deployment remoto. La URL pública debe comprobarse después del deploy.

Referencias: [Node.js en Vercel](https://vercel.com/docs/functions/runtimes/node-js), [variables del sistema](https://vercel.com/docs/environment-variables/system-environment-variables), [reescrituras](https://vercel.com/docs/routing/rewrites).

## Instalar Obsidian desde la web

El menú **Instalar Obsidian** y las vistas de Biblioteca/Guardadas/Mapas muestran descargas directas de los instaladores universales oficiales para Mac y Windows, instrucciones ES/EN y un enlace para abrir la app instalada. La persona completa la instalación en su sistema. Para Linux, móviles u otra versión se ofrece la página oficial. Los enlaces de la versión 1.13.7 fueron tomados de [Obsidian Download](https://obsidian.md/download) el 4 de octubre de 2026; al actualizar, verificar ambos destinos en esa página. No se alojan binarios ni se ejecutan scripts remotos.

Instalar Obsidian no conecta los archivos locales con Vercel ni habilita almacenamiento en la web. La pantalla lo explica y no declara una instalación detectada. Un servicio local de conexión sigue fuera de esta entrega.

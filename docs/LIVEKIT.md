# Videollamadas con LiveKit

La sección **Videollamada** usa LiveKit Cloud o un servidor LiveKit para conectar personas con micrófono, cámara y pantalla. La biblioteca y las sesiones de ejemplo siguen siendo sintéticas. El transporte no implementa todavía el AI Apprentice, visión, grabación, debrief ni Work Map. Decisión: [ADR-0009](../context/decisions/ADR-0009.md).

## Configurar el proyecto

1. Crear o seleccionar un proyecto en LiveKit Cloud. En **Manage API keys**, obtener API key y API secret; en la configuración del proyecto, copiar **Project URL** (`wss://…livekit.cloud`). El ID del proyecto no es la URL.
2. Si no existe `.env`, copiar `.env.example` a `.env`. Completar `LIVEKIT_URL`, `LIVEKIT_API_KEY` y `LIVEKIT_API_SECRET` solo en ese archivo privado. No añadir prefijo `VITE_` a ningún secreto.
3. Definir `LIVEKIT_JOIN_CODE` con un valor aleatorio de al menos 16 caracteres. Es el código de acceso que comparten los participantes, distinto de la API key y el secret. El clon preparado por Codex ya tiene un código local generado; cada otro despliegue debe configurarlo expresamente.
4. Usar el mismo `LIVEKIT_ROOM` para los participantes que deban encontrarse; valor inicial `userhelper-team`. El backend fija la sala y genera una identidad única por entrada. No hay que crear la sala manualmente ni desplegar un agente para una llamada entre personas.
5. `APP_ORIGIN` debe coincidir exactamente con el origen del frontend: por defecto `http://127.0.0.1:5173`, sin barra final. `localhost` y `127.0.0.1` son orígenes distintos.

Nunca compartir `.env`, tokens de participantes ni capturas con credenciales por GitHub. Solo se versiona `.env.example` sin valores privados. El frontend recibe un token temporal limitado a la sala, no las claves del proyecto.

## Ejecutar localmente

Requiere Node 22.12+ y las dependencias de `npm ci`. Abrir dos terminales en la raíz del repo:

```sh
# Terminal 1: servicio de acceso
npm run dev:token
```

```sh
# Terminal 2: aplicación
npm run dev
```

Abrir `http://127.0.0.1:5173/#senior/call`. Introducir un nombre y el código de acceso, aceptar el aviso y entrar. La conexión no activa dispositivos. Cada participante elige después qué compartir. El navegador permite seleccionar una pantalla, pestaña o ventana; la aplicación solicita pantalla sin audio del sistema.

Reiniciar el servicio de acceso después de editar `.env`. «Volver a comprobar» actualiza el estado de configuración; que la configuración esté completa no prueba que las credenciales sean válidas ni que la red permita WebRTC. Un fallo de conexión se presenta como error, nunca como llamada simulada.

El servidor escucha en `127.0.0.1:3001`; Vite dirige `/api/livekit` a ese servicio. Ambos puertos son configurables, pero si cambia el puerto del backend hay que ajustar también el proxy de `vite.config.ts`.

## Colaborar desde otras computadoras

`127.0.0.1` solo funciona en la computadora que ejecuta la app. Dos desarrolladores pueden ejecutar sus propios clones con acceso seguro al mismo proyecto y el mismo nombre de sala. El código se verifica en cada backend: conviene acordar un mismo código de equipo. Los participantes normales de un despliegue compartido reciben únicamente el enlace de la aplicación y ese código; no necesitan claves de API.

Para una demo compartida en Internet, servir `dist/` por HTTPS y enrutar `/api/livekit/*` hacia el proceso Node detrás de un proxy. Configurar `APP_ORIGIN` con ese dominio HTTPS. El hosting estático por sí solo no ejecuta el backend y el proxy de Vite solo aplica al desarrollo. No se ha desplegado un entorno público como parte de esta integración. Fuera de localhost, cámara, micrófono y pantalla necesitan un contexto seguro y soporte del navegador.

El código compartido es una barrera de acceso para el hackathon, no autenticación individual ni permisos senior/intern. Para producción hace falta identidad autenticada, autorización de sala por usuario y gestión de secretos. El límite local es de 10 intentos por minuto y dirección IP; detrás del proxy varios usuarios pueden compartir esa dirección. No se confía en `X-Forwarded-For` aportado por clientes. Un despliegue con varias instancias necesita limitación coordinada.

## Ciclo de vida y privacidad

- Entrar requiere consentimiento y no publica medios automáticamente.
- Cada botón activa o detiene físicamente su dispositivo. Salir o abandonar la vista cierra la conexión y libera los medios locales.
- Pausar detiene micrófono, cámara y pantalla propios; se puede seguir escuchando a los demás. Continuar mantiene los dispositivos apagados hasta que la persona los active de nuevo.
- Una interrupción de conexión detiene la captura; recuperar la conexión conserva la pausa. Los resultados tardíos de permisos o conexión se descartan y sus pistas se detienen.
- No se solicita audio del sistema al compartir pantalla. No se guarda el código ni el token en localStorage.
- Esta aplicación no inicia grabaciones/Egress ni guarda la llamada en la biblioteca. La aplicación no configura grabación automática en el proyecto. Estas afirmaciones describen la aplicación, no impiden que un participante grabe mediante herramientas externas.
- El estado de sala conectada y la presencia de un agente son señales independientes. Una sala puede contener únicamente personas. Un participante marcado como agente tampoco demuestra que implemente los requisitos del challenge.

## Arquitectura y contrato

`src/features/LiveCall.tsx` presenta la sala y adjunta pistas locales/remotas. `src/services/liveCall.ts` controla conexión, pausa y liberación de recursos. El SDK se carga al abrir la sección de videollamada.

`server/livekit.mjs` ofrece `GET /api/livekit/status` y `POST /api/livekit/token`. Este último exige origen autorizado, JSON, nombre válido, consentimiento y código; limita el tamaño del cuerpo y los intentos. El token dura cinco minutos para iniciar conexión, tiene identidad generada por servidor y acceso exclusivo a la sala configurada: publicar micrófono/cámara/pantalla y suscribirse. No otorga administración, grabación ni publicación de datos. Su caducidad no es un temporizador que expulse automáticamente a una persona ya conectada.

## Validación y pendientes

Los resultados observados de esta revisión se registran en la entrada del harness. Las pruebas automatizadas usan dobles de dispositivos: validan consentimiento, cancelación, permisos tardíos, pausa, reconexión y límites del servicio sin activar cámara o micrófono reales.

La prueba completa de medios entre dos computadoras requiere que las personas activen sus dispositivos y comprueben audio bidireccional, video, ventana compartida, permisos denegados, salida y recuperación de red. No confundir una prueba de entrada a sala con esa prueba de medios. El agente ElevenLabs individual está disponible en **Tu aprendiz de IA**, según [ELEVENLABS.md](ELEVENLABS.md); no participa en esta sala. Los mínimos Capture → Map → Teach siguen pendientes.

Fuentes oficiales: [conexión y salas](https://docs.livekit.io/intro/basics/connect/), [compartir pantalla](https://docs.livekit.io/transport/media/screenshare/), [endpoint de tokens](https://docs.livekit.io/frontends/build/authentication/endpoint/), [ElevenLabs como TTS de un agente LiveKit](https://docs.livekit.io/agents/models/tts/elevenlabs/). El último recurso es una opción de integración futura, no evidencia de un agente desplegado.

### Resultado observado — 2026-10-03

- `npm test`: 28 pruebas pasaron (frontend, ciclo de vida RTC y servicio de tokens).
- `npm run build`: TypeScript y Vite completados. Aviso de tamaño por el chunk diferido LiveKit, aproximadamente 539 kB / 141 kB gzip; se descarga al abrir Videollamada.
- `python3 -m unittest discover -s tests -q`: 28 pruebas del harness y acceso ElevenLabs pasaron.
- Credenciales locales: consulta autenticada de salas en LiveKit Cloud completada, sin registrar credenciales ni tokens.
- Navegador: dos clientes en la misma sala Cloud, ambos muestran dos participantes; entrada bloqueada antes del consentimiento, dispositivos apagados, pausa y continuación sin activar medios, salida del participante.
- Revisión visual en escritorio de 1280 px y móvil de 390 px: documento sin desbordamiento horizontal; consola sin errores ni avisos durante el recorrido final.
- No se activaron micrófono, cámara ni pantalla reales. Estas pruebas confirman acceso y señalización, no calidad ni transmisión de medios entre computadoras.

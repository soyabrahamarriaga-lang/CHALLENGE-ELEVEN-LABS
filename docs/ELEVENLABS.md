# Conversación individual con ElevenLabs

**Tu aprendiz de IA** (`#senior/agent`) conecta a la persona con el agente existente configurado en el backend. Incluye inicio por voz o texto, mensajes recientes y cierre. La conversación es individual: no se publica en la sala LiveKit del equipo. No recibe pantalla, no extrae eventos visuales y no genera ni guarda un Work Map. Decisión: [ADR-0010](../context/decisions/ADR-0010.md).

## Configuración y uso

1. Instalar dependencias con `npm ci`. Si no existe `.env`, copiar `.env.example`; no sobrescribir la configuración local existente.
2. Completar `ELEVENLABS_API_KEY` y `ELEVENLABS_AGENT_ID` solo en `.env`. La clave necesita acceso al agente y a la emisión de acceso a conversaciones. No añadir prefijo `VITE_`.
3. Configurar `LIVEKIT_JOIN_CODE` con al menos 16 caracteres y `APP_ORIGIN` con el origen exacto del frontend. El nombre de la variable del código se conserva para compartir la barrera del equipo con la videollamada. La conversación ElevenLabs funciona sin credenciales de LiveKit Cloud.
4. Ejecutar `npm run dev:token` y, en otra terminal, `npm run dev`. Reiniciar el servicio de acceso después de guardar cambios en `.env`.
5. Abrir `http://127.0.0.1:5173/#senior/agent`, introducir el código del equipo y aceptar el aviso. **Iniciar con micrófono** solicita el permiso del navegador; **Iniciar por texto** no captura audio. Puede enviarse texto también durante una conversación de voz.
6. **Terminar conversación** corta la sesión. Iniciar otra crea una conversación nueva; no se promete recuperar el contexto anterior. Cambiar de pantalla también la termina. Los mensajes visibles se descartan al salir o comenzar otra conversación.

Se mantiene un máximo de 200 mensajes recientes en memoria, con 20 000 caracteres por mensaje recibido y 4 000 por mensaje enviado. No se guarda transcripción, código ni acceso temporal en localStorage. Si `VAULT_PATH` está configurado, al terminar se importa la transcripción a la bóveda Obsidian privada (docs/OBSIDIAN.md). Los eventos de transcripción dependen de la configuración del agente y pueden contener errores. Un mensaje del agente no acredita observación real de pantalla ni conocimiento validado.

**Demo local sin código:** con `AGENT_OPEN_ACCESS=true` en `.env` el agente se inicia sin código de equipo y la pantalla oculta ese campo; solo con el backend en `127.0.0.1` y quitándolo antes de publicar ([ADR-0014](../context/decisions/ADR-0014.md)). La videollamada sigue pidiendo su código.

## Acceso y arquitectura

El SDK oficial `@elevenlabs/client` se carga en `agent-session.html`, un documento del mismo origen creado solo durante una conversación. `AgentConversation.tsx` presenta consentimiento y estado; `agentFrame.ts` controla el SDK. Los mensajes entre ambos comprueban origen, ventana, identificador de sesión y estructura. Al cancelar, terminar, fallar o abandonar la vista se retira el iframe: su contexto de medios desaparece, incluso si el SDK todavía esperaba un permiso. El código invalida también respuestas tardías del backend. La cancelación no depende de que `startSession` haya devuelto una sesión.

El mismo proceso Node del acceso LiveKit incorpora:

- `GET /api/elevenlabs/status`: informa si las variables necesarias existen; se conserva para compatibilidad y no dirige el indicador de Mi espacio.
- `GET /api/elevenlabs/availability`: consulta el agente real con una petición autenticada de solo lectura a ElevenLabs; comprueba identidad, archivo y modo de texto. No genera tokens ni reserva conversaciones. Devuelve estados seguros, hora y vigencia sin revelar claves, tokens, URLs firmadas ni configuración privada. Caché compartida de 15 segundos y vigencia máxima de 30. El frontend comprueba cada 20 segundos cuando está visible y permite repetir manualmente. «Agente accesible» indica una respuesta real del servicio; no garantiza cupo o cuota para la siguiente llamada. «Conectado» requiere confirmación de una conversación por el SDK. Ante errores de red o datos caducados, se retira la disponibilidad y se bloquea el inicio hasta verificar de nuevo. Detalles: ADR-agent-availability.md.
- `POST /api/elevenlabs/session`: exige origen exacto, JSON, consentimiento, código y modo válido. Comparte el límite de 10 intentos/minuto/IP y cuerpo de 4 KiB con el acceso LiveKit. Devuelve un token de conversación para voz/WebRTC o URL firmada para texto/WebSocket, con `Cache-Control: no-store`.

Intern usa `ELEVENLABS_TUTOR_AGENT_ID` y las rutas equivalentes bajo `/api/elevenlabs/tutor/`. Comparte clave y controles de acceso, pero tiene destino y caché de estado propios. Un ID ausente o inaccesible no utiliza al experto como alternativa. La UI nunca envía el ID elegido por el operador. El rol de demostración no es autenticación individual. La conversación del tutor no se importa automáticamente a la bóveda del experto ni registra allí eventos de pantalla desde esta UI; tampoco se inyectan automáticamente documentos o mapas al tutor. Se utilizan sus instrucciones y fuentes existentes en ElevenLabs.

`server/elevenlabs.mjs` fija el agente desde el entorno, limita el destino a ElevenLabs, rechaza redirecciones y respuestas inesperadas y no refleja errores privados del proveedor. El cliente no puede seleccionar otro agente. Solo el backend posee la API key. Los accesos temporales siguen siendo credenciales: no publicarlos en logs, capturas o issues.

No se implementan herramientas de cliente. Una llamada a una herramienta de cliente desconocida detiene la conversación con error visible; las solicitudes de aprobación MCP se rechazan. Esto no desactiva herramientas de servidor que alguien configure posteriormente en ElevenLabs: revisar su alcance antes de habilitarlas. La integración no modifica el prompt, la voz ni la configuración remota.

## Estado observado del agente — 2026-10-03

La API autenticó y devolvió el agente **Observador de procesos**, idioma español, LLM `qwen35-397b-a17b`, voz asignada y formatos PCM de 16 kHz. No tenía tools ni documentos de conocimiento; emitía eventos de respuesta y transcripción y admitía la opción de conversación solo texto. No se versionan el ID, prompt, voz privada ni credenciales.

En la configuración inspeccionada, la autenticación obligatoria del agente estaba desactivada. **El código del equipo protege nuestro endpoint, pero no vuelve privado al agente en ElevenLabs.** No se cambió esa configuración. Si se desea restringir el agente en el proveedor, habilitar allí autenticación y revisar orígenes permitidos.

La retención de audio estaba activada (`record_voice=true`), `retention_days=-1`, sin borrado de audio/transcripción ni modo de retención cero. Por ello la interfaz informa antes de empezar que el proveedor puede conservar contenido. Que UserHelper descarte sus mensajes locales no los borra de ElevenLabs. La política de conservación/borrado del proyecto debe acordarse antes de usar información real de expertos.

El acceso MCP de herramientas de desarrollo es independiente de estas conversaciones. Esta función usa API y SDK, y no necesita resolver el OAuth MCP pendiente.

## Despliegue y otras computadoras

Servir **todo** `dist/`, incluido `agent-session.html` y sus assets, por HTTPS bajo el mismo origen. Enrutar `/api/elevenlabs/*` y `/api/livekit/*` al servicio Node mediante proxy; el proxy Vite funciona solo en desarrollo. Configurar `APP_ORIGIN` con ese dominio. El hosting estático por sí solo no ejecuta el backend. Si se aplican CSP o Permissions-Policy, permitir el iframe del mismo origen, micrófono/autoplay y conexiones necesarias del SDK a ElevenLabs y su transporte WebRTC. No se ha publicado un despliegue público.

La persona que usa un despliegue compartido necesita el enlace y el código de equipo, nunca la API key. El código es una barrera de hackathon, no identidad individual ni autorización senior/intern. Su limitación de intentos es local a cada proceso; varias instancias requieren coordinación.

## Verificación y límites

- API real: lectura autorizada del agente y emisión de acceso temporal para ambos transportes, sin registrar valores.
- Navegador: consentimiento requerido; conversación real por texto con respuesta en español; cierre retira el iframe; código incorrecto muestra error y no crea sesión; revisión a 390 px sin desbordamiento horizontal.
- Pruebas automatizadas: configuración, destino y credenciales del backend, errores opacos, controles de origen/consentimiento/código, independencia de LiveKit, eventos tardíos, correcciones, deduplicación y límite de mensajes. El resultado total queda en la bitácora del aporte.
- **Pendiente:** la persona debe probar voz, salida de audio, permiso de micrófono denegado/pendiente, cierre durante permiso pendiente y desconexión real. La prueba por texto no verifica captura física, WebRTC de voz ni autoplay del navegador. No se activó ningún dispositivo real en la verificación automatizada.
- El challenge sigue necesitando visión, preguntas contextualizadas, debrief, teach-back confirmado, Work Map con evidencia y enseñanza/intervención en un caso nuevo.

Fuentes: [SDK JavaScript oficial](https://elevenlabs.io/docs/eleven-agents/libraries/java-script), [código del SDK](https://github.com/elevenlabs/packages), [retención de conversaciones](https://elevenlabs.io/docs/eleven-agents/customization/privacy/retention).

# Disponibilidad y acceso: hechos frente a pendientes

Actualizado: 2026-10-03. Esta hoja contiene estado operativo; nunca claves, tokens, correos privados, saldo detallado ni prompts de agentes de otros proyectos. Una API key no equivale a un agente, y un agente no identifica por sí solo todos sus modelos.

| Elemento | Estado | Evidencia / siguiente comprobación |
|---|---|---|
| Plazo | Corregido por usuario | 4 de octubre de 2026 a las 06:00 America/Mexico_City (12:00 UTC); sustituye el cálculo inicial de 15 horas. T0 se conserva |
| Equipo | Confirmado por usuario | Tres personas; Abraham y dos colaboradores cuyos nombres/especialidades faltan |
| GitHub | Verificado | Cuenta con acceso; main protegido; CI y PR de la base pasaron |
| ElevenLabs y tokens | API autenticada | Lectura del agente y accesos temporales WebRTC/WebSocket verificados; clave privada en .env |
| Sesión para inspección | Verificada en Chrome | Sesión autenticada y plataforma ElevenAgents accesible; el usuario solicitó continuar mediante acceso directo |
| Agente existente | Observador de procesos verificado | Configurado por usuario después de la lista inicial vacía; conversación real por texto respondió en español |
| MCP directo | Registrado; almacenamiento OAuth bloqueado | Servidor oficial remoto configurado. El último intento con scope convai_read recibió un fallo de permisos al adquirir el bloqueo local de credenciales. No se ha comprobado una llamada autenticada |
| Modelo LLM del agente | Verificado | qwen35-397b-a17b; configuración leída, no modificada |
| Voz | Asignada en el agente | Idioma es, PCM 16 kHz; reproducción/captura física pendiente |
| Transcripción / Scribe | Eventos habilitados en el agente | Voz no probada; no se integró una API Scribe separada |
| Tools / base de conocimiento | Cero elementos en la inspección | Pantalla y conocimiento validado aún no conectados |
| Permisos y capacidad de uso | Acceso de conversación comprobado | No implica prueba de carga ni capacidad para toda la demo; autenticación obligatoria del agente desactivada en el proveedor |
| Privacidad ElevenLabs | Retención de audio activa | Ver configuración observada y límites de borrado en docs/ELEVENLABS.md |
| Visión | Sin verificar | Un agente conversacional no demuestra que tengamos un modelo de visión operativo |
| Frontend | Prototipo más transporte real | UserHelper, React + TypeScript; biblioteca sintética, sala LiveKit y conversación individual ElevenLabs; ver docs/LIVEKIT.md y docs/ELEVENLABS.md |
| LiveKit Cloud | Proyecto creado y credenciales autenticadas | Consulta autenticada y entrada de dos clientes con presencia mutua verificadas; pruebas de medios entre dos computadoras pendientes |
| Entrega / hosting | Sin verificar | Confirmar portal del evento y probar entorno de demo con margen |

## Inspección autorizada

El usuario autorizó revisar ElevenLabs para identificar qué tiene disponible. La revisión inicial fue de lectura. Posteriormente autorizó integrar su agente existente para conversación individual y proporcionó credenciales locales; se verificó una conversación por texto con un mensaje sintético. No se modificaron prompts, tools ni privacidad del proveedor.

La lista vacía observada no prueba que todos los workspaces o archivos estén vacíos. La autenticación del navegador tampoco equivale a acceso MCP. La inspección API posterior confirma el agente/LLM/voz de la tabla. Completar OAuth queda como tarea separada para herramientas de desarrollo, sin bloquear esta integración.

## Acceso elegido: MCP con OAuth

El [MCP oficial alojado de ElevenLabs](https://elevenlabs.io/docs/eleven-agents/operate/hosted-mcp) admite listar, inspeccionar y administrar agentes. Usa OAuth y no requiere copiar una API key. El [servidor local anterior](https://github.com/elevenlabs/elevenlabs-mcp) está deprecado a favor del remoto.

La URL publicada es `https://api.elevenlabs.io/v1/mcp`. Durante esta configuración, sus [metadatos de recurso protegido](https://api.elevenlabs.io/.well-known/oauth-protected-resource/v1/mcp) declararon `https://api.us.elevenlabs.io/v1/mcp`. Codex rechazó la URL genérica por esa discrepancia; se configuró la URL declarada, conservando la validación OAuth. Este dato pertenece al entorno global observado, no a los entornos aislados EU/India/Singapur.

Para preparar otra computadora con [Codex y MCP](https://learn.chatgpt.com/docs/extend/mcp?surface=cli), añadir el servidor HTTP en la configuración del cliente y autenticar con la cuenta de esa persona. La configuración utilizada aquí es:

```toml
[mcp_servers.elevenlabs]
url = "https://api.us.elevenlabs.io/v1/mcp"
```

Para la inspección actual, iniciar `codex mcp login elevenlabs --scopes convai_read`. La persona selecciona el workspace y completa la autorización. No compartir enlaces de callback, tokens OAuth ni archivos de credenciales en GitHub. Cada cliente y computadora requiere su propia conexión; un commit de documentación no distribuye sesiones.

En Claude Desktop, el proveedor documenta Settings → Connectors → ElevenLabs → Connect. Elegir el mismo workspace pertinente y revisar el alcance de acceso. Conectar ambos clientes no sincroniza sus conversaciones; el harness conserva los acuerdos compartidos.

## API de inspección y conversación de producto

`scripts/elevenlabs_check.py` conserva una alternativa de lectura por API. Es opcional y **no autentica el MCP**. Lee `ELEVENLABS_API_KEY` desde el entorno o `.env`, que Git ignora; `.env.example` solo contiene el nombre vacío. No pasar credenciales como argumentos.

- `python3 scripts/elevenlabs_check.py`: lista agentes activos con paginación.
- `--agent ID`: resume LLM, idioma, voz y número de tools/documentos; omite prompts y secretos.
- `--models`: consulta el catálogo de LLMs disponible para esa clave.
- `--subscription`: consulta plan/cuota; su salida es privada y no debe versionarse.

No se ha realizado una llamada autenticada con este script de Python; la integración posterior en `server/elevenlabs.mjs` sí verificó configuración y accesos temporales reales. Las pruebas unitarias usan respuestas simuladas y comprueban tratamiento de claves, redirecciones, paginación y omisión de datos privados; no demuestran permisos reales de cuenta.

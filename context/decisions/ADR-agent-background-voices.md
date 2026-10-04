# ADR: ignorar voces de fondo sin control manual del micrófono

- Fecha: 2026-10-04
- Estado: configuración remota aplicada; calibración en el entorno físico pendiente.
- Actor: Codex. Operador: Abraham Arriaga.
- Complementa ADR-agent-response; sustituye sus interrupciones acústicas inmediatas para el observador. La política de capturas se conserva.

## Problema y alcance

El operador confirmó activaciones por otras personas o televisión y pidió detección automática, sin pulsar para hablar. `onVadScore` en el frontend decide cuándo enviar capturas; no filtra el audio que se transmite ni identifica al experto. El SDK web 1.26.0 ya solicita cancelación de eco y supresión de ruido.

## Decisión

Configurar tres capas en el observador de Mi espacio:

1. `vad.background_voice_detection: true` en ElevenLabs, previamente false.
2. Prompt de escucha automática: atender preguntas directas, explicaciones de la tarea y respuestas breves; ante contenido ajeno sin intención de dirigirse al agente, invocar `skip_turn` sin hablar. La herramienta de sistema tiene `pre_tool_speech: off`, ningún sonido y `wait_timeout_secs: -1`. También sirve para peticiones de espera. No afirma reconocer la identidad del hablante.
3. Retirar `interruption` de los eventos del observador y activar `turn.transcribe_on_disabled_interruptions`. El agente termina su frase y luego evalúa la intervención recibida: el ruido no debe cortar inmediatamente el audio, pero una intervención legítima tampoco lo corta. Mantener respuestas breves limita esa espera.
4. Ampliar `turn_timeout` de 3 a 30 s y usar `skip_turn` ante entradas vacías, puntos suspensivos o timeout. Este límite controla la reactivación por silencio; no se configura una espera fija de 30 s para cada respuesta.

Perfil en `config/observer-audio.json` e instrucciones en `config/observer-prompt.txt`. Se preservan Gemini Flash-Lite, esfuerzo mínimo, límite de 256 tokens, turn eagerness, tutor, datos de análisis y privacidad. Es configuración remota para nuevas conversaciones; no requiere build ni despliegue del frontend. `skip_turn` se ejecuta en el servidor de ElevenLabs, sin herramientas nuevas de cliente, acceso a archivos ni acceso externo.

## Evidencia

- PATCH y GET verificaron cada cambio. Las diferencias son VAD, prompt, herramienta de sistema, su representación equivalente en `tools`, eventos y las opciones de turno (transcripción durante respuestas no interrumpibles y timeout de silencio). Copias previas privadas fuera del repositorio.
- El filtro VAD por sí solo transcribió tanto una voz principal como otra voz sintética 20 dB más baja. No se presenta como aislamiento efectivo del hablante.
- Al añadir clasificación por contexto y `skip_turn`, una llamada PCM 16 kHz recibió respuesta a la voz principal, ejecutó `skip_turn` sin error ni mensaje ante la frase ajena y retomó la conversación de compras. El registro mostró que la frase de fondo había interrumpido la respuesta previa; por ello se añadió la tercera capa.
- Con interrupciones desactivadas, el proveedor confirmó que la respuesta acabó sin corte; la voz de fondo se descartó mediante `skip_turn` y la intervención posterior recibió respuesta. Una entrada de silencio generada por el servidor provocó un aviso de presencia; esto motivó ampliar el timeout y explicitar su descarte en el prompt.
- Ensayo final con las mismas voces: respuesta a la principal, silencio mediante `skip_turn` ante la frase de fondo, respuesta al retomar la tarea y 35 segundos de PCM silencioso sin aviso de presencia. La prueba valida estas muestras, no la identificación de todas las voces ni el entorno del operador. No se utilizó su micrófono ni se grabó su entorno.

## Límites y compensación

La voz de fondo todavía puede transmitirse y aparecer en la transcripción. La clasificación semántica decide si contestar; no borra audio ni transcripciones y no constituye verificación de identidad. Otra persona que diga algo pertinente a la tarea puede confundirse con el experto. El usuario debe esperar a que termine la frase del agente; desactivar interrupciones no debe describirse como detección selectiva del hablante. La prueba física pendiente debe incluir otras voces durante una respuesta y una intervención legítima del operador.

## Reproducción y reversión

Leer el agente y guardar su configuración fuera del repositorio; comprobar la versión antes de actualizar. Aplicar VAD y turn del perfil; conservar los eventos actuales excepto `interruption`; combinar el prompt actual completo (incluido su LLM) con el texto versionado y con `built_in_tools.skip_turn`, preservando otras herramientas. La API puede devolver también esta herramienta en el alias `tools`. Releer y comparar los campos.

Para revertir, restaurar solo los campos afectados desde la copia previa, preservando cambios concurrentes. No reemplazar el agente completo ni copiar credenciales a frontend o repositorio. Cerrar e iniciar una conversación nueva para probar la configuración.

Fuentes primarias: [esquema oficial VADConfig y TurnConfig](https://api.elevenlabs.io/openapi.json), [Skip turn](https://elevenlabs.io/docs/eleven-agents/customization/tools/system-tools/skip-turn), [interrupciones](https://elevenlabs.io/docs/eleven-agents/customization/conversation-flow#interruptions).

## Ontología

Sin entidades nuevas. Detección de habla, filtrado de fondo, intención de hablar al agente e identidad del hablante son distintos. Una transcripción no prueba que el experto haya expresado ese criterio.

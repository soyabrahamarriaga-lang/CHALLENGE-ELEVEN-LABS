# ADR: respuesta del observador y entrega de capturas

- Fecha: 2026-10-04
- Estado: aceptado para implementación; ensayo físico con micrófono pendiente.
- Actor: Codex. Operador: Abraham Arriaga.
- Sustituye la política de espera y relleno de ADR-0012/ADR-0013 y el descarte tras 20 segundos del control de turnos. Conserva OCR contextual, bóveda privada y límites de imágenes.

## Evidencia y problema

La demo examinada tuvo OCR contextual, pero ningún archivo de imagen utilizado por el agente. Las capturas locales no demostraban entrega al proveedor. El detector usaba volumen del micrófono como si fuera voz; ruido continuo podía retener y acabar descartando capturas. La pantalla inicial tampoco activaba la pausa. Además, las respuestas pedían esperar o eran de relleno, con unos tres segundos de procesamiento LLM.

Al iniciar esta corrección el agente ya estaba configurado con `gemini-3.5-flash-lite`, esfuerzo `high` y un prompt de 12 919 caracteres. La demo anterior había usado Haiku. No se atribuye a este aporte el cambio de modelo, ni se presenta el ensayo como comparación entre modelos.

## Decisión

1. Usar `onVadScore` del SDK (probabilidad de voz), habilitando `vad_score` entre los eventos de ambos agentes. Histéresis: voz desde 0.6; silencio bajo 0.35 sostenido 400 ms. Una señal de más de 2.5 s es desconocida; no equivale a silencio. La conversación por texto no requiere VAD.
2. Retener la última captura mientras la persona habla, aunque su explicación supere 20 s. Invalidarla si cambia la pantalla o termina la captura. Esperar también al agente y dar prioridad a la respuesta verbal. Volver a comprobar estas condiciones después de subir el archivo.
3. Distinguir captura, subida y despacho del mensaje con ID y estados. Contar únicamente subidas completadas cuyo mensaje se ha entregado al SDK. Esto no es una confirmación individual de procesamiento del servidor. Ante fallo o 12 s sin completar la subida, mostrar reintento. Máximo conservador: 10 intentos de subida por conversación.
4. Permitir «Enviar esta pantalla ahora» como acción explícita que omite la espera automática y reutiliza la subida en curso. Al detener/reiniciar pantalla o sesión, ignorar resultados tardíos. Incluir la pantalla inicial en el detector de pausas.
5. Conservar Gemini Flash-Lite y reducir el prompt a `config/observer-prompt.txt` (2 669 caracteres), `reasoning_effort: minimal`, `max_tokens: 256`. Preguntar por decisiones, límites y excepciones; responder a voz sin esperar una imagen; evitar «Espero» y preguntas de presencia. Mantener controles de evidencia, debrief y teach-back.

## Configuración externa

El 4 de octubre se aplicaron y releyeron estos campos en ElevenLabs: prompt/esfuerzo/límite del observador y `conversation.client_events` con `vad_score` del observador y tutor. Los demás eventos se conservan. El tutor conserva su prompt y modelo. La configuración está en ElevenLabs: desplegar este commit no la modifica automáticamente. Leer antes de aplicar y preservar los demás campos del agente, especialmente herramientas, análisis, privacidad y base de conocimiento. Se guardó copia previa privada fuera del repositorio público.

## Validación y límites

- Mismos tres mensajes ficticios, mismo Gemini Flash-Lite: media de respuesta textual completa de 2 751 ms antes a 563 ms después (aprox. 80 % menos). Una sesión por variante; sin prueba estadística ni medición de micrófono → altavoz. Prompt y esfuerzo cambiaron juntos.
- Dos capturas ficticias recibidas, `file_input.used: true`; preguntas sobre los campos visibles. Tiempo del proveedor hasta respuesta textual: 629 y 603 ms.
- Flujo de audio sintético silencioso PCM 16 kHz por WebSocket: 26 eventos VAD, probabilidades 0.0025–0.012. Prueba de transporte y señal; no sustituye WebRTC y ruido real.
- Pruebas automatizadas cubren espera larga, VAD ausente, voz durante subida, cancelación, fallo, timeout, envío manual, pantalla inicial, OCR aún cargando e integración de eventos del iframe.
- Falta repetir una demo física con pantalla, micrófono y reproducción de audio, incluyendo una explicación larga y una interrupción. No se garantiza latencia fija.

## Alternativas

Solo cambiar de modelo no resuelve la entrega de imágenes. Usar volumen o asumir silencio cuando faltan eventos daría falsas pausas. Enviar imágenes con cada cambio interrumpiría la explicación y agotaría la cuota. Se opta por eventos de voz, pausa visual y un control manual visible.

## Ontología

Sin nuevas entidades de dominio. Una captura archivada sigue siendo evidencia local, no prueba de recepción o comprensión por el agente. Una explicación del agente sigue requiriendo confirmación experta para considerarse conocimiento validado.

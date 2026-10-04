# Visión: el agente ElevenLabs ve la pantalla

La conversación de Senior está en **Mi espacio → Iniciar conversación con el agente**. Después de conectar, **Compartir pantalla** abre el selector del navegador. La primera vez se descargan el motor OCR y sus idiomas.

## Cómo llegan las imágenes

- Cada segundo, el OCR local lee el área que cambió. Envía `[OCR mm:ss]` como contexto, sin iniciar una respuesta, y archiva los eventos en la bóveda privada.
- Una pantalla estable durante 1.5 s, incluida la inicial, produce una captura pendiente. En voz espera a una pausa detectada mediante VAD y a que el agente termine su respuesta. Una explicación larga no descarta la captura; un cambio visual sí la reemplaza.
- La imagen se sube y después se despacha `[PANTALLA mm:ss]`. El contador avanza al completar la subida y el envío al SDK, no al capturar localmente. No representa una confirmación individual de comprensión del modelo.
- **Enviar esta pantalla ahora** permite enviar explícitamente sin esperar a VAD. Si falta la señal de voz o la subida falla, la interfaz lo indica. Una subida sin respuesta falla tras 12 s. Hasta 10 intentos por conversación, contando intentos ambiguos para no exceder la cuota.
- Detener la pantalla cancela los envíos pendientes, incluso durante la carga del OCR. El archivo privado de capturas es independiente del contador de imágenes del agente.

Decisiones: [ADR-0012](../context/decisions/ADR-0012.md), [ADR-0013](../context/decisions/ADR-0013.md), política actual en [ADR-agent-response](../context/decisions/ADR-agent-response.md).

## Configuración real verificada el 2026-10-04

Observador: `gemini-3.5-flash-lite`, `reasoning_effort: minimal`, `max_tokens: 256`, [prompt versionado](../config/observer-prompt.txt). File input habilitado, 10 archivos por conversación, 1 en memoria. Los eventos del observador y del tutor incluyen `vad_score`; conservar los otros eventos al configurarlos. El prompt y modelo del tutor no se cambian.

Estos ajustes viven en ElevenLabs. El build no aplica configuración remota; al reproducirla, leer el agente actual y preservar todos los campos ajenos al cambio. Analysis/Data collection ya está configurado para extracción de procedimientos; ver [PROCESS-MAPS.md](PROCESS-MAPS.md).

## Probar

```sh
npm test
npm run build
npm run check:vision                       # genera dos imágenes ficticias; requiere Pillow
npm run check:vision -- a.png b.png        # imágenes proporcionadas, máximo 10
```

`check:vision` abre una conversación real por texto y consume créditos. Sus conversaciones pueden sincronizarse a la bóveda. Con el prompt actual, el silencio ante mera navegación es intencional: un timeout en ese caso no demuestra por sí solo que la imagen falló. Consultar también los archivos recibidos y `file_input.used` del proveedor.

Verificación del 4 de octubre: dos capturas ficticias recibidas (`file_input.used: true`), preguntas sobre el número de activo y una excepción para capex. Respuestas textuales del proveedor en 629 y 603 ms. Tres mensajes de decisión pasaron de 2 751 a 563 ms de media con el mismo modelo tras acortar el prompt y reducir el esfuerzo. No mide el recorrido físico de micrófono a altavoz.

El protocolo sube a `POST /v1/convai/conversations/{id}/files` mediante `conversation.uploadFile(blob)` y despacha `conversation.sendMultimodalMessage({ text, fileIds: [fileId] })`.

## Ensayo físico pendiente

Compartir una ventana con datos ficticios; hablar durante más de 20 s; hacer una pausa y comprobar que se envía una sola imagen del estado actual. Interrumpir al agente, probar el botón manual y detener la captura durante una subida. Confirmar comprensión de los criterios y medir hasta escuchar la respuesta. Todavía se necesita esta prueba con el micrófono y audio del operador.

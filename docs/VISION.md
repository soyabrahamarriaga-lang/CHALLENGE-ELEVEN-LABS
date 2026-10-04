# Visión: el agente ElevenLabs ve la pantalla

Decisión: [ADR-0012](../context/decisions/ADR-0012.md). El agente usa un LLM con entrada de imágenes; la app le mostrará capturas **solo en pausas**, como `[PANTALLA mm:ss]`, y el agente responde con una pregunta breve sobre el cambio o «Mm-hm.».

## Configuración del agente (panel de ElevenLabs)
1. **LLM** con imágenes: `claude-haiku-4-5` (actual). Alternativa rápida: `gemini-3.5-flash`. `qwen35-397b-a17b` no acepta imágenes.
2. **File input** habilitado, 10 archivos por conversación.
3. **Prompt**: bloque «Pantalla compartida» (comparar con la captura anterior; una pregunta ≤20 palabras sobre razón/límite; «Mm-hm.» si no hay cambio relevante; no describir la pantalla; debrief con ≥3 preguntas nuevas y teach-back al terminar).
4. **Pendiente** — Analysis → Data collection: `work_map_pasos`, `work_map_razones`, `work_map_guardrails`, `work_map_pendientes` (string), `teach_back_confirmado` (boolean), `teach_back_correcciones` (string). Sin ellos no hay Work Map automático.

## Probar
```sh
npm run check:vision                      # genera 2 capturas ficticias (requiere Pillow)
npm run check:vision -- a.png b.png c.png # o tus propias capturas, máx. 10
```
Abre una conversación de **texto** con el agente de `.env`, muestra las capturas y escribe sus respuestas. Consume créditos. La conversación se sincroniza a la bóveda como cualquier otra.

Resultado observado (2026-10-03, `claude-haiku-4-5`): factura 4471 con 4711 (opex) → «Mm-hm.»; misma factura con 0400 (capex) → «¿Por qué cambiaste el centro de costos de 4711 a 0400?».

## Protocolo
`scripts/agent_vision.mjs`: subir la imagen a `POST /v1/convai/conversations/{id}/files` (el SDK lo hace con `conversation.uploadFile(blob)`) y enviar `multimodal_message` con texto `[PANTALLA mm:ss]` y el `file_id` (`conversation.sendMultimodalMessage({ text, fileId })`).

## Pendiente
- UI: «Compartir pantalla» en `#senior/agent`, detección de pausa por estabilidad visual, máximo 10 envíos y copia de cada captura en la bóveda.
- Work Map desde los campos de Data collection.
- Solo datos ficticios hasta tener redacción de datos personales y borrado.

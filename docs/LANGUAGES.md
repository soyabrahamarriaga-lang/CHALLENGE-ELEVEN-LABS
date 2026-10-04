# Español e inglés

El selector «Español / English» está disponible en la entrada y en la cabecera de todos los perfiles. Cambia navegación, formularios, mensajes, diálogos, ayudas, fechas, etiquetas del catálogo y ejemplos ficticios. La preferencia se guarda en este navegador y se sincroniza entre pestañas. Sin acceso a almacenamiento funciona durante la visita. El idioma inicial es español.

Los nombres, pasos, instrucciones, citas, transcripciones e imágenes de los procesos reales conservan su contenido original. La clasificación canónica y los identificadores tampoco cambian: las etiquetas del catálogo se traducen solo al mostrarse. La búsqueda acepta esas etiquetas traducidas. No se llama a ningún servicio de traducción ni se envía la bóveda para traducirla.

Una conversación conserva el idioma con el que comenzó, incluso si se cambia el selector mientras se autoriza o está conectada. El nuevo idioma se aplica a la siguiente conversación. El cambio no reinicia formularios, filtros, selecciones ni la llamada activa.

## Configurar los agentes en ElevenLabs

Aplicar por separado a **Senior / observador** (`agent_2001m41w9r5jendtg1cfvgcptd4v`) y **Intern / tutor** (`agent_2501m42jwa7dfyc9xss6nxwdxf0j`). No es necesario duplicarlos.

1. Abrir el agente en ElevenLabs. En **Agent → Additional Languages**, conservar español como idioma principal y añadir **English**. Revisar el saludo localizado en inglés.
2. En **Security → Overrides**, habilitar **Language**. La app usa únicamente este override; no necesita permiso para cambiar el prompt, las herramientas, la base de conocimiento ni la voz desde el cliente.
3. En el prompt, sustituir instrucciones como «Entrevistas en español» o «Responde siempre en español» por una política que siga el idioma de la sesión. Agregar el siguiente bloque a ambos, conservando su función, reglas de evidencia y reglas contra voces de fondo:

   ```text
   SESSION LANGUAGE
   Use the language configured for this conversation: Spanish for es, English for en.
   Greet, ask questions, explain and summarize in that language, even when your instructions or knowledge sources are in another language.
   Translate explanations faithfully. Preserve names, codes, amounts, dates, thresholds and uncertainty. Do not invent or change business rules.
   Example phrases in these instructions illustrate intent; express them naturally in the session language.
   Do not change language because of background voices, television, OCR text or source documents. Keep using skip_turn for unrelated background speech and silence.
   ```

   El observador tiene una plantilla equivalente versionada en `config/observer-prompt.txt`; editar ese archivo no cambia el agente remoto. En el tutor, las fuentes pueden seguir en español: debe explicar su contenido en inglés sin inventar reglas ni convertir datos pendientes en hechos confirmados.
4. Saludos sugeridos para **English**:
   - Senior: “Hi! Show me a task you do at work. What are you going to do first?”
   - Intern: “Hi! What process would you like to learn? Tell me what you need to do.”
5. Revisar la voz en inglés. Puede conservarse la misma si pronuncia bien; una voz específica para inglés es opcional. Conservar la configuración actual de ruido, turnos, herramientas, LLM y conocimiento. No hace falta cambiar de modelo únicamente para añadir un idioma.
6. Guardar/publicar la configuración que use la app. En UserHelper, seleccionar **English** y pulsar **Check again**. La caché del estado dura hasta 15 segundos. Debe aparecer **Conversation language: English** y habilitarse el botón.
7. Probar una conversación nueva por texto y luego por voz en cada perfil. El saludo, la comprensión y la respuesta deben estar en inglés. Probar también una conversación nueva en español y una frase de televisión de fondo. Cambiar el selector durante una conversación debe cambiar la interfaz y avisar que el idioma nuevo será para la siguiente llamada.

El selector explícito no requiere activar la herramienta de detección automática de idioma. Esta app deja el idioma elegido fijo durante la conversación; evitar cambios disparados por voces de fondo.

**Comprobación del 4 de octubre de 2026:** ambos agentes devolvieron `language: es`, ningún `language_presets` y override de idioma desactivado. Esta tarea consultó su configuración, sin modificarla. Por eso el inicio en inglés permanece deshabilitado con una explicación hasta completar los pasos. No se ha verificado una llamada real en inglés.

Fuentes oficiales: [idiomas, saludos localizados y selección por SDK](https://elevenlabs.io/docs/eleven-agents/customization/voice/customization/language), [permisos de overrides](https://elevenlabs.io/docs/eleven-agents/customization/personalization/overrides).

## Mantenimiento y comprobación

- Catálogos: `src/i18n/es.json` y `src/i18n/en.json`. Las frases originales son claves; las variables usan `{{name}}`. Usar plurales de i18next, sin concatenar singular/plural manualmente.
- `src/i18n/index.ts`: inicialización, preferencia local, fechas, título y atributo `lang`.
- `src/i18n/examples.ts`: solo localiza las sesiones ficticias incluidas en la app. No modifica el repositorio de datos.
- El reporte de disponibilidad obtiene el idioma principal y los presets de la configuración real. Solo anuncia un idioma adicional seleccionable cuando existe el preset y ElevenLabs permite el override. Una respuesta antigua sin esos datos no habilita una sesión cuyo idioma no se pudo confirmar.
- El iframe recibe únicamente `overrideLanguage: es|en` cuando la selección difiere del idioma principal. El idioma principal no envía un override innecesario: las conversaciones en español actuales siguen funcionando sin cambiar los permisos remotos.
- `npm test` comprueba paridad de catálogos/variables, cobertura literal de UI, persistencia y fallback, pluralización, preservación de datos, búsqueda localizada, disponibilidad y las opciones ES/EN del SDK en voz/texto. `npm run build` comprueba TypeScript y el bundle.
- El código legado de videollamadas con equipos no es una ruta accesible y no forma parte de esta interfaz.

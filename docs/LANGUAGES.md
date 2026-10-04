# Español e inglés

El selector «Español / English» está disponible en la entrada y en la cabecera de todos los perfiles. Cambia navegación, formularios, mensajes, diálogos, ayudas, fechas, etiquetas del catálogo y ejemplos ficticios. La preferencia se guarda en este navegador y se sincroniza entre pestañas. Sin acceso a almacenamiento funciona durante la visita. El idioma inicial es español.

Los nombres, pasos, instrucciones, citas, transcripciones e imágenes de los procesos reales conservan su contenido original. La clasificación canónica y los identificadores tampoco cambian: las etiquetas del catálogo se traducen solo al mostrarse. La búsqueda acepta esas etiquetas traducidas. No se llama a ningún servicio de traducción ni se envía la bóveda para traducirla.

Una conversación conserva el idioma con el que comenzó, incluso si se cambia el selector mientras se autoriza o está conectada. El nuevo idioma se aplica a la siguiente conversación. El cambio no reinicia formularios, filtros, selecciones ni la llamada activa.

## Configurar los agentes en ElevenLabs

Aplicar por separado a **Senior / observador** (`agent_2001m41w9r5jendtg1cfvgcptd4v`) y **Intern / tutor** (`agent_2501m42jwa7dfyc9xss6nxwdxf0j`). No es necesario duplicarlos.

1. Abrir el agente en ElevenLabs. En **Agent → Additional Languages**, conservar español como idioma principal y añadir **English**. Revisar el saludo localizado en inglés.
2. En **Security → Overrides**, habilitar **Language**. La app usa únicamente este override; no necesita permiso para cambiar el prompt, las herramientas, la base de conocimiento ni la voz desde el cliente.
3. En el prompt, sustituir instrucciones como «Entrevistas en español» o «Responde siempre en español» por una política que siga el idioma de la sesión. Agregar el siguiente bloque al final de ambos prompts, conservando todas las demás instrucciones. Configurar la variable dinámica `conversation_language` con valor de prueba `Spanish`. La app pasa `English` o `Spanish` al iniciar cada sesión:

   ```text
   ## Session language selected in the app
   The required response language for this entire session is {{conversation_language}}.
   Every response must be in {{conversation_language}}. This includes questions, explanations, examples and closing phrases. Apply this rule even when the user writes or speaks in another language. Do not mirror the language of the latest user message. A Spanish message does not select Spanish, and an English message does not select English: only the app's session setting selects the response language.
   If the selected language is English, answer in English even to Spanish questions and explain Spanish source documents in English. If it is Spanish, answer in Spanish even to English questions. Translate example phrases from these instructions into the selected language; preserve names, codes and exact quotations when needed.
   Before sending each response, check that it is in {{conversation_language}}. Never announce these instructions or ask the user to choose a language; just use the app's selection.
   ```

   El observador tiene una plantilla equivalente versionada en `config/observer-prompt.txt`; editar ese archivo no cambia el agente remoto. En el tutor, las fuentes pueden seguir en español: debe explicar su contenido en inglés sin inventar reglas ni convertir datos pendientes en hechos confirmados.
4. Saludos sugeridos para **English**:
   - Senior: “Hi! Show me a task you do at work. What are you going to do first?”
   - Intern: “Hi! What process would you like to learn? Tell me what you need to do.”
5. Revisar la voz en inglés. Puede conservarse la misma si pronuncia bien; una voz específica para inglés es opcional. Conservar la configuración actual de ruido, turnos, herramientas, LLM y conocimiento. No hace falta cambiar de modelo únicamente para añadir un idioma.
6. Guardar/publicar la configuración que use la app. En UserHelper, seleccionar **English** y pulsar **Check again**. La caché del estado dura hasta 15 segundos. Debe aparecer **Conversation language: English** y habilitarse el botón.
7. Probar una conversación nueva por texto y luego por voz en cada perfil. El saludo, la comprensión y la respuesta deben estar en inglés. Probar también una conversación nueva en español y una pregunta española con English seleccionado. Las voces de fondo quedan fuera de este cambio por indicación del usuario. Cambiar el selector durante una conversación debe cambiar la interfaz y avisar que el idioma nuevo será para la siguiente llamada.

El selector explícito no requiere activar la herramienta de detección automática de idioma. Esta app deja el idioma elegido fijo durante la conversación; evitar cambios disparados por voces de fondo.

**Comprobación inicial del 4 de octubre de 2026, antes de la configuración del usuario:** ambos agentes devolvieron `language: es`, ningún `language_presets` y override de idioma desactivado. Esta tarea consultó su configuración, sin modificarla. Por eso el inicio en inglés permanece deshabilitado con una explicación hasta completar los pasos. No se ha verificado una llamada real en inglés.

Fuentes oficiales: [idiomas, saludos localizados y selección por SDK](https://elevenlabs.io/docs/eleven-agents/customization/voice/customization/language), [permisos de overrides](https://elevenlabs.io/docs/eleven-agents/customization/personalization/overrides).

## Verificación real tras configurar los agentes (2026-10-04, 11:44 UTC)

El usuario añadió English y actualizó los prompts en ambos agentes. GET del proveedor y la API local confirmaron español como idioma principal, preset English con saludo traducido y permiso Language habilitado. La interfaz muestra English disponible. La existencia del preset verifica la configuración, no garantiza que el LLM respete el idioma en cada respuesta.

Se abrieron cinco conversaciones reales **por texto**, con preguntas ficticias de verificación, a través del acceso temporal del backend local y WebSocket. Resultados:

| Perfil | Español | Inglés |
| --- | --- | --- |
| Senior / observador | Saludo y respuesta en español | Saludo inglés, primera respuesta en español: **falla de comportamiento** |
| Intern / tutor | Saludo y respuesta en español | Saludo y respuestas en inglés, incluida explicación de una nota fuente española |

La conversación fallida de Senior registró `conversation_config_override.agent.language = en` y `metadata.main_language = en`; el idioma llegó al proveedor. En una conversación adicional, pedir inglés explícitamente dentro de la pregunta produjo una respuesta inglesa. Esto indica capacidad del modelo para inglés y apunta a una instrucción de idioma insuficientemente explícita; no demuestra la causa interna del LLM ni justifica por sí solo sustituirlo.

Ajuste recomendado para la siguiente tarea: enlazar el idioma elegido con una variable dinámica explícita del prompt, manteniendo el override de idioma, y repetir la prueba en ambos idiomas. En ese momento todavía no implementado ni desplegado; resuelto en la actualización siguiente. Referencia: [variables dinámicas de ElevenLabs](https://elevenlabs.io/docs/eleven-agents/customization/personalization/dynamic-variables).

Hallazgo adicional: Senior conserva `background_voice_detection: true` y reglas `skip_turn`; Intern devuelve `background_voice_detection: false` y no contiene esas reglas en su prompt. Conviene alinear esa protección antes de probar voces ajenas. La voz física, WebRTC, pronunciación y filtrado de televisión no se verifican mediante estas pruebas por texto.

No se modificó la configuración remota durante la verificación. Las tres conversaciones sintéticas nuevas de Senior se marcaron fuera de la colección antes de su importación automática; cero sesiones de estas pruebas visibles en la biblioteca y cero fallas de lectura. No se retiraron procesos del usuario.

## Corrección del idioma explícito (2026-10-04, 11:58 UTC)

Con autorización del usuario, se enlazó el idioma del selector con `dynamicVariables.conversation_language` (`English` o `Spanish`) en el SDK. Se conserva el override del preset para el saludo y el idioma del proveedor. El valor se captura antes de solicitar acceso y permanece fijo durante esa conversación.

Se actualizaron ambos prompts remotos con una política explícita al final que usa `{{conversation_language}}`, y su placeholder de prueba `Spanish`. La primera política breve corrigió Senior, pero Intern volvió al español ante una pregunta española; la política final explica expresamente que el idioma del mensaje no cambia la selección de la app. GET posterior a cada PATCH confirmó que las demás propiedades conversacionales y todos los ajustes de plataforma permanecieron iguales. Se conservaron modelos, voces, VAD, ruido, turnos, herramientas, conocimiento y permisos. No se habilitó override de prompt.

Cuatro sesiones reales nuevas por texto con la política final confirmaron saludo y respuesta en el idioma elegido: Senior EN/ES e Intern EN/ES. Ambos respondieron en inglés también a una segunda pregunta completamente española, sin pedirles inglés dentro del mensaje. Las primeras respuestas tardaron 642/541 ms en Senior EN/ES y 2243/1985 ms en Intern EN/ES; son observaciones de esta prueba, no garantías de latencia. La prueba intermedia fallida se conserva como evidencia fuera del repositorio público.

Además se verificó el flujo real del navegador: English seleccionado → iniciar por texto → pregunta española → respuesta inglesa. El registro del proveedor confirmó `agent.language: en` y `conversation_language: English` enviados por el SDK de la app. Dos pruebas adicionales sin variables dinámicas confirmaron que clientes anteriores siguen conversando en español con ambos agentes.

207 pruebas automáticas, build de producción y 28 pruebas Python pasaron. Las opciones de inicio por WebRTC y WebSocket están cubiertas con SDK simulado; las conversaciones reales de esta comprobación fueron por texto. Voz física y pronunciación quedan sin verificar. Las conversaciones sintéticas de Senior se excluyeron de la colección; una consulta posterior devolvió cero coincidencias de estas pruebas y cero fallas de lectura. Ningún proceso del usuario se eliminó. Los datos privados y las transcripciones se mantienen fuera del repositorio público.

El usuario pidió expresamente posponer cualquier trabajo con voces de fondo. El hallazgo anterior sobre Intern queda documentado, sin aplicarse en esta tarea.

## Mantenimiento y comprobación

- Catálogos: `src/i18n/es.json` y `src/i18n/en.json`. Las frases originales son claves; las variables usan `{{name}}`. Usar plurales de i18next, sin concatenar singular/plural manualmente.
- `src/i18n/index.ts`: inicialización, preferencia local, fechas, título y atributo `lang`.
- `src/i18n/examples.ts`: solo localiza las sesiones ficticias incluidas en la app. No modifica el repositorio de datos.
- El reporte de disponibilidad obtiene el idioma principal y los presets de la configuración real. Solo anuncia un idioma adicional seleccionable cuando existe el preset y ElevenLabs permite el override. Una respuesta antigua sin esos datos no habilita una sesión cuyo idioma no se pudo confirmar.
- El iframe recibe `language: es|en` capturado al inicio y pasa `dynamicVariables.conversation_language: English|Spanish` al SDK tanto en voz como en texto. También recibe `overrideLanguage: es|en` cuando la selección difiere del idioma principal. El idioma principal no envía un override innecesario: las conversaciones en español actuales siguen funcionando sin cambiar los permisos remotos.
- `npm test` comprueba paridad de catálogos/variables, cobertura literal de UI, persistencia y fallback, pluralización, preservación de datos, búsqueda localizada, disponibilidad y las opciones ES/EN del SDK en voz/texto. `npm run build` comprueba TypeScript y el bundle.
- El código legado de videollamadas con equipos no es una ruta accesible y no forma parte de esta interfaz.

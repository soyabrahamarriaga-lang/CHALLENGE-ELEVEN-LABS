# Estado compartido

## Eliminar procesos desde la plataforma (2026-10-04)

Biblioteca, Guardadas y el detalle permiten eliminar un proceso con confirmación. El retiro persiste en la bóveda, excluye mapas/imágenes y futuras importaciones, regenera índices y actualiza el material del tutor, incluido el caso de eliminar el último proceso. Los originales se conservan en Obsidian y ElevenLabs. Fallas parciales del tutor o índices se informan con reintento. Es una función compartida de la demo local, sin permisos por persona; usar una sola instancia de backend por bóveda. Ver `ADR-process-removal.md` y `docs/PROCESS-MAPS.md`. No constituye purga de datos personales ni retiro de evidencia parcial.

## Voces de fondo (2026-10-04)

El usuario pidió ignorar automáticamente voces de otras personas o televisión, sin pulsar para hablar. El observador tiene filtro de fondo activado, prompt de escucha dirigida y herramienta `skip_turn` para guardar silencio ante contenido ajeno. Como el ruido podía interrumpir antes de clasificarse, termina sus respuestas antes de tomar otro turno, manteniendo transcripción de intervenciones mientras habla. El timeout para volver a preguntar por silencio pasa de 3 a 30 s y el prompt descarta esas entradas sin hablar. El ajuste aplica a nuevas conversaciones sin recompilar; no modifica el tutor. Perfil en `config/observer-audio.json`, prompt versionado y decisión en `ADR-agent-background-voices.md`. No es identificación de hablante: voces pertinentes a la tarea aún pueden confundirse y el audio de fondo puede seguir en la transcripción. Pendiente calibración física del operador.

## Respuesta del observador y pantalla (2026-10-04)

Corrección integrada en main por PR #22 (ca75feb), sobre la entrada visual de PR #21. El agente ya tenía Gemini 3.5 Flash-Lite; se acortó su prompt y redujo el esfuerzo de high a minimal, máximo 256 tokens. Ensayo con los mismos tres mensajes: 2 751 → 563 ms de media por texto; no demuestra esa latencia en audio. Dos imágenes ficticias recibidas y reconocidas, y 26 eventos VAD reales con audio sintético silencioso. La app usa probabilidad de voz, conserva capturas durante explicaciones largas, cancela imágenes obsoletas, muestra subida/fallo y ofrece envío manual. Prompt del tutor conservado; ambos agentes emiten VAD. Configuración remota aplicada y releída; el commit no la despliega automáticamente. Ver `docs/VISION.md` y `ADR-agent-response.md`. Pendiente el ensayo físico de pantalla + micrófono + altavoz del operador.

## Frontend y entrada visual (2026-10-04)

Trabajo local en `codex/login-frontend`: el usuario eligió gradium.ai como referencia. Entrada de demostración con nombre/perfil, acceso a la interfaz existente y salida; no autentica cuentas ni cambia permisos de APIs. Escenario negro, tipografía grande y cinta original de partículas; escritorio y móvil revisados. `npm test`: 156 pruebas; build correcto. El preview 5183 recibe rechazo de origen de la bóveda del backend existente; falta configurar un entorno completo con origen coincidente para verificar datos privados desde esta rama. Ver `docs/FRONTEND-STUDIO.md` y `context/decisions/ADR-login-studio.md`. Integrado posteriormente en main mediante PR #21 (e283515). Preview local 5175 y backend 3003 con origen coincidente; entrada y conversación real por texto verificadas.

## Tutor de procesos en Intern (2026-10-03)

Intern → Mi aprendizaje tiene conversación real por voz o texto con el segundo agente proporcionado por el usuario, configurado localmente mediante ELEVENLABS_TUTOR_AGENT_ID. Senior conserva su agente. Indicadores y cachés separados, cierre de sesión al cambiar de perfil y controles de acceso compartidos. Se comprobó la lectura autenticada y una conversación real por texto con saludo, respuesta a una pregunta y cierre. El tutor pidió material del proceso; no se modificaron sus conocimientos ni se conectó automáticamente la bóveda. Ver ADR-intern-tutor.md.

## Disponibilidad real del agente (2026-10-03)

Mi espacio consulta el agente real en ElevenLabs en modo lectura, sin generar tokens ni reservar sesiones; presenta hora, caducidad y recuperación. «Agente accesible» confirma respuesta del servicio, sin prometer capacidad para la siguiente llamada. Conectado depende exclusivamente del evento real del SDK; las variables locales ya no se presentan como prueba de disponibilidad. Se validó una conexión real por texto y su cierre sin usar micrófono ni pantalla. Ver ADR-agent-availability.md y la bitácora de agent-availability. El aporte se publica en `codex/mi-espacio-agente`, sobre el commit de mapas `64af4c3` del PR #14; su revisión mantiene separados los cambios de Mi espacio y del estado del agente. Las dos bitácoras anteriores conservan la evidencia de desarrollo local.

## Simplificación de Mi espacio (2026-10-03)

Cambio solicitado por el usuario: la app se centra en conversar individualmente con el chatbot. Mi espacio tiene un único botón de inicio y aloja la conversación de ElevenLabs. La navegación retira Tu aprendiz de IA y Videollamada; las rutas antiguas vuelven a Mi espacio. Se elimina la llamada simulada del inicio y su control global. Biblioteca, Guardadas y Mapas de procesos continúan disponibles. Ver ADR-mi-espacio-agente.md. El código heredado de tokens LiveKit permanece como infraestructura compartida del backend; ya no existe entrada a salas desde el frontend.

## Objetivo confirmado
Construir el AI Apprentice del brief de ocho páginas de ElevenLabs × Hack-Nation: Capture, Map y Teach. Preservar criterio, razones, excepciones y condiciones para detenerse; transferirlos a una persona que resuelva un caso no mostrado por el experto.

## Base disponible
- Harness Python sin dependencias, instrucciones compartidas Claude/Codex y bitácora por aporte.
- Ontología inicial basada en el brief; ADRs para las decisiones de colaboración.
- Análisis íntegro del challenge en `docs/CHALLENGE.md`.
- Hooks, workflow de GitHub, plantillas de issue/PR y CODEOWNERS.
- El estado efectivo de pruebas/publicación está en las entradas de la bitácora y los checks de GitHub, no se presupone por existir estos archivos.

## Prototipo disponible y límites
UserHelper tiene frontend React + TypeScript con perfiles senior e intern, llamada simulada con consentimiento/pausa, biblioteca, reproducción visual de muestra y mapa navegable. El inicio y los recorridos de demostración son sintéticos y locales al navegador. Biblioteca, Guardadas y Mapas ya leen los procesos de la bóveda privada. Las pruebas y el contrato están en `docs/FRONTEND-PROTOTYPE.md`. Decisión: ADR-0008.

Se añadió una sección independiente de videollamada con transporte LiveKit, cámara, micrófono y pantalla mediante activación explícita, más un backend de tokens. Configuración y límites: docs/LIVEKIT.md; decisión: ADR-0009. Las credenciales del proyecto Cloud autenticaron con éxito en una consulta de salas; dos clientes de navegador entraron a la misma sala y mostraron presencia mutua con dispositivos apagados. La transmisión real de medios entre dos computadoras todavía necesita prueba con sus operadores.

Se añadió conversación individual con el agente existente de ElevenLabs por voz o texto, independiente de la sala del equipo. Se verificaron credenciales, accesos temporales y una respuesta real por texto; la prueba física de micrófono y audio queda pendiente del operador. La API key permanece en el backend; el proveedor tiene retención de audio activada y autenticación obligatoria del agente desactivada. Detalles: docs/ELEVENLABS.md y ADR-0010.

La sección Visión documenta los avances posteriores de pantalla/OCR. Todavía faltan debrief, teach-back validado, Work Map confirmado por el experto, tutor e intervención en un caso nuevo. El prototipo no demuestra todavía los mínimos Capture → Map → Teach del challenge.

## Prioridad actual del usuario

Unificar Biblioteca y Mapas sobre una colección de la bóveda: biblioteca ordenada y grafo por temas/actividades compartidas. Dentro de cada procedimiento, representar la ejecución de tareas: acciones, imágenes, instrucciones, decisiones y motivos; conversación como evidencia secundaria. Departamento Contabilidad y seis familias editables del catálogo aportado. **Límite corregido por el usuario: 4 de octubre de 2026 a las 06:00, America/Mexico_City (12:00 UTC)**. T0 del 3 de octubre a las 13:41:57 se conserva: el presupuesto total pasa a 16 h 18 min 3 s; no se reinicia el reloj. Equipo de tres personas. La inspección inicial del navegador mostró una lista vacía, superada por la inspección API del agente que el usuario configuró después. El usuario eligió continuar por MCP: servidor remoto registrado en Codex, con acceso MCP autenticado todavía sin verificar. El intento de guardar autorización falló por permisos del almacén local; no bloquea el frontend simulado. No requiere API key para ese acceso MCP; la conversación de producto sí usa la API key local y ya no depende de resolver MCP.

Plan vigente: `docs/ROADMAP-15H.md`; método: `docs/WORKFLOW.md`; acceso: `docs/READINESS.md`. La ampliación v2 del harness (issue #2) se conservó localmente y queda diferida; la base estable sigue operativa.

## Bóveda Obsidian
Transcripciones del agente se importan al terminar a una bóveda Obsidian privada (repo `userhelper-vault`, fuera de este repo público). API de eventos/notas lista para visión y Work Map. Ver docs/OBSIDIAN.md y ADR-0011. Pendiente: llamar eventos desde visión/client tools, retiro parcial/purga de originales y redacción de datos personales.

## Diagramas de procesos

**Biblioteca** agrupa los procesos de la bóveda por departamento/tipo; **Mapas de procesos** representa esa misma colección mediante temas y actividades compartidas, con sustento por paso y filtros comunes. Al abrir un proceso aparecen guía visual y diagrama por acciones, imágenes originales y razones expresadas, con nombre/departamento/tipo editables. El grafo global y la nota de relaciones también se generan en Obsidian; Canvas manuales se conservan. ADR-0018 sustituye la navegación de ADR-0017. Las coincidencias son léxicas o códigos del catálogo, no equivalencia de reglas ni similitud semántica general. Los ejemplos del prototipo permanecen separados en «Explorar la biblioteca demo». La bóveda tiene notas nombradas en `Procesos/<departamento>/<tipo>/` y conserva fuentes por sesión. Data collection del agente existente aporta extracción estructurada; se conserva su configuración conversacional. Se recuperaron diez imágenes del proveedor; ocho conversaciones pudieron reanalizarse y dos devolvieron HTTP 400. Once registros locales se reconstruyeron sin fallo de derivación; varios no contienen una tarea ejecutada y se señalan como tales. Las imágenes cercanas requieren confirmar asociación y faltantes permanecen explícitos. No se suben datos de la bóveda al repositorio público.

Seis familias: compras/OC, proveedores, CFDI, retenciones, seguimiento/materialidad y negociación. Las reglas contables/fiscales recibidas se registran como propuestas no validadas, sin automatización de aprobaciones, bloqueos, impuestos ni pagos. Ver docs/ACCOUNTING-CATALOG.md, docs/PROCESS-MAPS.md y ADR-0017 (sustituye extracción/presentación de ADR-0016). Se conservan notas y Canvas manuales. Pendientes: validación experta, editor completo de pasos y confirmar asociaciones de imágenes desde la app.

## Visión
El agente ElevenLabs (actualmente `gemini-3.5-flash-lite`; la comprobación original usó Haiku) ve capturas enviadas como `[PANTALLA mm:ss]` y pregunta por el cambio; verificado con `npm run check:vision` (docs/VISION.md, ADR-0012). La vista del agente comparte pantalla: OCR local cada segundo (texto al agente como contexto y a eventos.md) y captura en cada pausa (máx. 10), ADR-0013. Data collection configurado para procedimientos visuales (ADR-0017); pendiente prueba física completa de conversación/pantalla desde UI y Work Map confirmado.

## Tutor
El tutor (Intern) usa como base de conocimiento las notas de proceso de la bóveda, sincronizadas automáticamente (ADR-0016). Verificado con un caso nuevo: detuvo la aprobación de una OC de 35 días y pidió el correo del director de finanzas. Sus conversaciones se guardan en `Tutorias/` (ADR-0017). Pendiente: resumen de dominio y práctica del aprendiz.

## Próximo trabajo después del prototipo
1. Elegir el flujo de 5–10 minutos y un caso nuevo para evaluar transferencia.
2. Definir entidades/evidencia del Work Map y criterios observables de cierre del debrief.
3. Probar primero voz + una pantalla + eventos visuales en el contexto del agente.
4. Implementar Map y Teach, intervención previa al guardado y controles de privacidad.
5. Ensayar los mínimos: 3 preguntas en vivo (1 guardrail), 3 preguntas nuevas de debrief, teach-back confirmado y 1 error detenido en un caso nuevo.

## Preguntas pendientes
- Dominio confirmado: Contabilidad. Falta elegir una actividad concreta y un caso nuevo de evaluación dentro del catálogo.
- Agente/LLM y acceso temporal ElevenLabs verificados; faltan prueba de voz física, modelo de visión y política acordada de retención/acceso. No guardar credenciales en el repositorio.
- ¿Cómo detectar lectura/pausa y cómo impedir un guardado erróneo en la interfaz elegida?
- El límite de las 06:00 está fijado por el usuario; faltan confirmar el canal de entrega y las bases oficiales, que no constan en el PDF.
- ¿Monitor cada hora, cada cuatro horas o bajo pedido? No está configurado.

## Relevo
Leer la bitácora reciente y el issue/PR antes de tomar una tarea. Una entrada nueva debe dejar resultado, pruebas y siguiente paso. El chat con Claude no se sincroniza automáticamente con este chat.

## Verificación de la base (2026-10-03)
- Publicado el commit inicial `0db71639beb7ac83c8ad12736727e71b6c07fbc5`.
- [Primer check de GitHub Actions](https://github.com/soyabrahamarriaga-lang/CHALLENGE-ELEVEN-LABS/actions/runs/37147285207): éxito; pruebas del harness y validación del historial ejecutadas.
- Protección de `main` confirmada por API: PR obligatorio, `context-integrity` de GitHub Actions requerido, rama actualizada, protección aplicable a administradores, conversaciones resueltas, sin force push ni borrado.
- Hay cero aprobaciones de otra cuenta obligatorias por ahora; esto no elimina el PR ni el check requerido. Se configurará revisión por otra persona cuando exista otro revisor.
- Hooks instalados en este clon. Cada otra computadora debe instalarlos por separado.

## Interfaz español / inglés (2026-10-04)

PR #24 (eliminación de procesos) integrado en main. Nueva rama `codex/bilingual-interface`: selector ES/EN en entrada y espacio, preferencia persistida, traducciones de UI/ejemplos/catálogo, fechas y accesibilidad. Los procesos reales conservan su idioma original. El idioma se captura al empezar una conversación; un cambio posterior no la reinicia. Ambos agentes reales todavía tienen únicamente español y no permiten override de idioma; el inicio en inglés se bloquea con explicación hasta habilitarlo. Ver `docs/LANGUAGES.md` y `ADR-bilingual-interface.md`. La configuración remota no se modificó; falta aplicar instrucciones y probar llamadas reales EN en ambos perfiles.

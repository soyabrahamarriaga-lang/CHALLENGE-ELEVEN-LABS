# Estado compartido

## Objetivo confirmado
Construir el AI Apprentice del brief de ocho páginas de ElevenLabs × Hack-Nation: Capture, Map y Teach. Preservar criterio, razones, excepciones y condiciones para detenerse; transferirlos a una persona que resuelva un caso no mostrado por el experto.

## Base disponible
- Harness Python sin dependencias, instrucciones compartidas Claude/Codex y bitácora por aporte.
- Ontología inicial basada en el brief; ADRs para las decisiones de colaboración.
- Análisis íntegro del challenge en `docs/CHALLENGE.md`.
- Hooks, workflow de GitHub, plantillas de issue/PR y CODEOWNERS.
- El estado efectivo de pruebas/publicación está en las entradas de la bitácora y los checks de GitHub, no se presupone por existir estos archivos.

## Prototipo disponible y límites
UserHelper tiene frontend React + TypeScript con perfiles senior e intern, llamada simulada con consentimiento/pausa, biblioteca, reproducción visual de muestra y mapa navegable. Los datos son sintéticos; el almacenamiento es local al navegador. Las pruebas y el contrato están en `docs/FRONTEND-PROTOTYPE.md`. Decisión: ADR-0008.

Se añadió una sección independiente de videollamada con transporte LiveKit, cámara, micrófono y pantalla mediante activación explícita, más un backend de tokens. Configuración y límites: docs/LIVEKIT.md; decisión: ADR-0009. Las credenciales del proyecto Cloud autenticaron con éxito en una consulta de salas; dos clientes de navegador entraron a la misma sala y mostraron presencia mutua con dispositivos apagados. La transmisión real de medios entre dos computadoras todavía necesita prueba con sus operadores.

Se añadió conversación individual con el agente existente de ElevenLabs por voz o texto, independiente de la sala del equipo. Se verificaron credenciales, accesos temporales y una respuesta real por texto; la prueba física de micrófono y audio queda pendiente del operador. La API key permanece en el backend; el proveedor tiene retención de audio activada y autenticación obligatoria del agente desactivada. Detalles: docs/ELEVENLABS.md y ADR-0010.

Todavía faltan visión sobre la pantalla compartida, debrief, teach-back validado, Work Map generado desde evidencia, tutor e intervención en un caso nuevo. El prototipo no demuestra todavía los mínimos Capture → Map → Teach del challenge.

## Prioridad actual del usuario

Integrar el agente ElevenLabs existente para conversación individual con el experto, conservando la videollamada del equipo por separado; mantener mapa y roadmap como guía. **Límite corregido por el usuario: 4 de octubre de 2026 a las 06:00, America/Mexico_City (12:00 UTC)**. T0 del 3 de octubre a las 13:41:57 se conserva: el presupuesto total pasa a 16 h 18 min 3 s; no se reinicia el reloj. Equipo de tres personas. La inspección inicial del navegador mostró una lista vacía, superada por la inspección API del agente que el usuario configuró después. El usuario eligió continuar por MCP: servidor remoto registrado en Codex, con acceso MCP autenticado todavía sin verificar. El intento de guardar autorización falló por permisos del almacén local; no bloquea el frontend simulado. No requiere API key para ese acceso MCP; la conversación de producto sí usa la API key local y ya no depende de resolver MCP.

Plan vigente: `docs/ROADMAP-15H.md`; método: `docs/WORKFLOW.md`; acceso: `docs/READINESS.md`. La ampliación v2 del harness (issue #2) se conservó localmente y queda diferida; la base estable sigue operativa.

## Bóveda Obsidian
Transcripciones del agente se importan al terminar a una bóveda Obsidian privada (repo `userhelper-vault`, fuera de este repo público). API de eventos/notas lista para visión y Work Map. Ver docs/OBSIDIAN.md y ADR-0011. Pendiente: llamar eventos desde visión/client tools, retiro desde UI y redacción de datos personales.

## Visión
El agente ElevenLabs (LLM `claude-haiku-4-5`, configurado por el usuario) ve capturas enviadas como `[PANTALLA mm:ss]` y pregunta por el cambio; verificado con `npm run check:vision` (docs/VISION.md, ADR-0012). La vista del agente comparte pantalla: OCR local cada segundo (texto al agente como contexto y a eventos.md) y captura en cada pausa (máx. 10), ADR-0013. Pendiente: prueba con conversación real desde la UI y campos de Data collection para el Work Map.

## Próximo trabajo después del prototipo
1. Elegir el flujo de 5–10 minutos y un caso nuevo para evaluar transferencia.
2. Definir entidades/evidencia del Work Map y criterios observables de cierre del debrief.
3. Probar primero voz + una pantalla + eventos visuales en el contexto del agente.
4. Implementar Map y Teach, intervención previa al guardado y controles de privacidad.
5. Ensayar los mínimos: 3 preguntas en vivo (1 guardrail), 3 preguntas nuevas de debrief, teach-back confirmado y 1 error detenido en un caso nuevo.

## Preguntas pendientes
- ¿Flujo propio del equipo o facturas del ejemplo? No se ha elegido.
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

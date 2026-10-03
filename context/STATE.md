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

Todavía faltan visión sobre la pantalla compartida, agente ElevenLabs, debrief, teach-back validado, Work Map generado desde evidencia, tutor e intervención en un caso nuevo. El prototipo no demuestra todavía los mínimos Capture → Map → Teach del challenge.

## Prioridad actual del usuario

Integrar videollamadas LiveKit en UserHelper y configurar el proyecto Cloud creado por el usuario; mantener el mapa y el roadmap como guía del agente y la integración posterior. **Límite corregido por el usuario: 4 de octubre de 2026 a las 06:00, America/Mexico_City (12:00 UTC)**. T0 del 3 de octubre a las 13:41:57 se conserva: el presupuesto total pasa a 16 h 18 min 3 s; no se reinicia el reloj. Equipo de tres personas. Se verificó sesión de ElevenLabs en Chrome y una lista visible sin agentes. El usuario eligió continuar por MCP: servidor remoto registrado en Codex, con acceso MCP autenticado todavía sin verificar. El intento de guardar autorización falló por permisos del almacén local; no bloquea el frontend simulado. No requiere API key para ese acceso.

Plan vigente: `docs/ROADMAP-15H.md`; método: `docs/WORKFLOW.md`; acceso: `docs/READINESS.md`. La ampliación v2 del harness (issue #2) se conservó localmente y queda diferida; la base estable sigue operativa.

## Próximo trabajo después del prototipo
1. Elegir el flujo de 5–10 minutos y un caso nuevo para evaluar transferencia.
2. Definir entidades/evidencia del Work Map y criterios observables de cierre del debrief.
3. Probar primero voz + una pantalla + eventos visuales en el contexto del agente.
4. Implementar Map y Teach, intervención previa al guardado y controles de privacidad.
5. Ensayar los mínimos: 3 preguntas en vivo (1 guardrail), 3 preguntas nuevas de debrief, teach-back confirmado y 1 error detenido en un caso nuevo.

## Preguntas pendientes
- ¿Flujo propio del equipo o facturas del ejemplo? No se ha elegido.
- ElevenLabs y tokens declarados disponibles; verificar agente/LLM, permisos y modelo de visión. No guardar credenciales en el repositorio.
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

# Estado compartido

## Objetivo confirmado
Construir el AI Apprentice del brief de ocho páginas de ElevenLabs × Hack-Nation: Capture, Map y Teach. Preservar criterio, razones, excepciones y condiciones para detenerse; transferirlos a una persona que resuelva un caso no mostrado por el experto.

## Base disponible
- Harness Python sin dependencias, instrucciones compartidas Claude/Codex y bitácora por aporte.
- Ontología inicial basada en el brief; ADRs para las decisiones de colaboración.
- Análisis íntegro del challenge en `docs/CHALLENGE.md`.
- Hooks, workflow de GitHub, plantillas de issue/PR y CODEOWNERS.
- El estado efectivo de pruebas/publicación está en las entradas de la bitácora y los checks de GitHub, no se presupone por existir estos archivos.

## Todavía no implementado
Aplicación web, pantalla compartida, visión, agente ElevenLabs, debrief, Work Map, tutor, sandbox, privacidad de sesiones, pruebas funcionales y demo. No hay stack de aplicación decidido ni credenciales de ElevenLabs configuradas.

## Próximo trabajo
1. Elegir el flujo de 5–10 minutos y un caso nuevo para evaluar transferencia.
2. Definir entidades/evidencia del Work Map y criterios observables de cierre del debrief.
3. Probar primero voz + una pantalla + eventos visuales en el contexto del agente.
4. Implementar Map y Teach, intervención previa al guardado y controles de privacidad.
5. Ensayar los mínimos: 3 preguntas en vivo (1 guardrail), 3 preguntas nuevas de debrief, teach-back confirmado y 1 error detenido en un caso nuevo.

## Preguntas pendientes
- ¿Flujo propio del equipo o facturas del ejemplo? No se ha elegido.
- ¿Qué herramientas, cuentas y presupuesto están disponibles para la demo?
- ¿Cómo detectar lectura/pausa y cómo impedir un guardado erróneo en la interfaz elegida?
- ¿Cuáles son fecha límite, canal de entrega y rúbrica? No constan en el PDF.
- ¿Monitor cada hora, cada cuatro horas o bajo pedido? No está configurado.

## Relevo
Leer la bitácora reciente y el issue/PR antes de tomar una tarea. Una entrada nueva debe dejar resultado, pruebas y siguiente paso. El chat con Claude no se sincroniza automáticamente con este chat.

## Verificación de la base (2026-10-03)
+- Publicado el commit inicial `0db71639beb7ac83c8ad12736727e71b6c07fbc5`.
+- [Primer check de GitHub Actions](https://github.com/soyabrahamarriaga-lang/CHALLENGE-ELEVEN-LABS/actions/runs/37147285207): éxito; pruebas del harness y validación del historial ejecutadas.
+- Protección de `main` confirmada por API: PR obligatorio, `context-integrity` de GitHub Actions requerido, rama actualizada, protección aplicable a administradores, conversaciones resueltas, sin force push ni borrado.
+- Hay cero aprobaciones de otra cuenta obligatorias por ahora; esto no elimina el PR ni el check requerido. Se configurará revisión por otra persona cuando exista otro revisor.
+- Hooks instalados en este clon. Cada otra computadora debe instalarlos por separado.

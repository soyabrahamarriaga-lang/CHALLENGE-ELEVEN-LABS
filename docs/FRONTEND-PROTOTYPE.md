# Alcance confirmado del prototipo frontend

Fuente: solicitud directa del usuario en Texto pegado.txt, 2026-10-03. Sustituye la restricción anterior de no iniciar interfaz; no sustituye los requisitos finales del challenge.

- Dos perfiles simulados, senior e intern; selector de perfil, no autenticación real.
- Senior: Iniciar llamada, conexión del agente separada del estado de sesión, duración, pausa, finalización, preguntas discretas y curiosas, consentimiento antes de comenzar.
- Intern: biblioteca con título, senior, fecha y descripción; búsqueda y filtros; detalle con reproducción simulada, timeline de pasos, razones, puntos de decisión y variantes contextualizadas.
- Estados: desconectado, conectando, conectado, error; sesión inactiva, activa, pausada y finalizada; biblioteca cargando, vacía y error recuperable.
- Solo frontend; ningún micrófono, pantalla, servicio de voz, grabación ni análisis real. Datos sintéticos e indicación de demostración persistente.
- Pantallas adaptables a escritorio, tablet y móvil; teclado, foco visible, etiquetas y estado además de color.
- Datos y servicio de simulación separados de componentes para integración posterior.
- Límite vigente: 4 de octubre de 2026, 06:00 America/Mexico_City.

## Ampliación posterior: videollamada real

La solicitud posterior de integrar LiveKit amplía el límite «solo frontend» con un backend de tokens y una vista independiente. Este documento conserva el contrato y las pruebas del prototipo sintético original. La configuración, controles de captura y límites actuales están en [LIVEKIT.md](LIVEKIT.md) y ADR-0009. Los recorridos de biblioteca y el agente de demostración no pasan a ser reales por añadir transporte.

## Ampliación posterior: conversación individual real

La conexión con el agente existente está disponible en **Tu aprendiz de IA**, por voz o texto; [ELEVENLABS.md](ELEVENLABS.md) y ADR-0010 documentan API, consentimiento, retención y verificación. Este recorrido no sustituye el adaptador de demostración ni transforma la biblioteca sintética en evidencia real.

## Contrato mínimo

ConnectionStatus es independiente de SessionStatus. Connect solo modifica la primera. Start requiere conexión y consentimiento explícito de demo. Pause congela duración y preguntas. Disconnect/error detiene la actividad y conserva un borrador. Resume exige conexión. Finish impide nuevos eventos; guardar produce una sesión marcada como ejemplo, sin afirmar una transcripción real.

Los pasos mantienen acción, propósito, razón atribuida, tipo (habitual/decisión/variante), contexto y timestamp. La reproducción es una escena demostrativa navegable, sin archivo multimedia auténtico. Ver una sesión marca avance de navegación, no certifica dominio.

## Pruebas de aceptación

Recorrer conexión → consentimiento → llamada demo → pausa → reanudación → finalizar → guardar → abrir desde biblioteca. Verificar que conectarse nunca inicia registro; cancelar consentimiento deja sesión inactiva; error durante sesión la pausa; el timer no avanza en pausa y no se generan intervenciones tras finalizar. Biblioteca: búsqueda sin resultados, filtro, error y recuperación; detalle: seleccionar paso actualiza el reproductor y contexto; perfil se cambia sin perder una sesión activa por accidente.

## Estructura para trabajar en equipo

- `src/features/Senior.tsx`: autorización y controles de la sesión demo.
- `src/features/Library.tsx`: espacio intern, búsqueda, filtros, orden y estados.
- `src/features/SessionDetail.tsx`: reproducción visual, mapa sincronizado, conversación de ejemplo y marcadores.
- `src/domain/`: contratos y máquina de estados; el transporte no controla la autorización.
- `src/services/useDemoAgent.ts`: temporizadores de simulación; sustituir por un adaptador de eventos de voz cuando se defina el agente.
- `src/services/sessionRepository.ts`: repositorio local de sesiones, validación de datos y exclusión de fragmentos. Sustituir por API autenticada en la fase real.
- `src/data/sessions.ts`: tres casos sintéticos de soporte, operaciones y marketing; no deciden el caso final del challenge.
- `src/components/Shared.tsx` y `src/styles.css`: componentes y reglas visuales compartidas.

Instalación y ejecución en README. Se usa hash routing para abrir vistas en hosting estático sin reglas de reescritura. Los iconos SVG son texto; las fuentes se instalan desde npm y se sirven localmente. No se versionan node_modules, dist, capturas ni credenciales. Cada aporte debe incluir su entrada del harness y ADR cuando cambie el contrato.

## Verificación observada — 2026-10-03

- `npm test`: 11 pruebas pasaron; consentimiento/conexión, pausa, reconexión, cierre, exclusiones y almacenamiento inválido/no disponible.
- `npm run build`: TypeScript estricto y Vite completados. Contrato visual con seed 6b1fc1a2 conservado en HTML compilado.
- `python3 -m unittest discover -s tests -v`: 28 pruebas pasaron.
- Navegador: recorrido de senior completo, temporizador detenido en pausa, error de conexión pausa, reconectar conserva pausa, guardar abre la muestra y el fragmento excluido desaparece del mapa.
- Navegador: selección de decisión sincroniza tiempo, escena y explicación; cambio de perfil, búsqueda sin acentos y sin resultados, error de biblioteca → reintento → carga → resultados, marcador y conversación, reproducción/pausa, biblioteca vacía y recuperación, filtro por área, orden cronológico y pestañas por flechas del teclado.
- Layout comprobado en 1440×1000, 820×1180 y 390×844; no desbordamiento horizontal de documento observado en tablet/móvil. El carrusel de pasos tiene desplazamiento horizontal deliberado.
- Consola sin errores/avisos durante el recorrido funcional. Los errores del adaptador de automatización al hacer clic se resolvieron usando teclado; no se contabilizan como fallos del producto.

La validación cubre este prototipo local. No prueba ElevenLabs, captura, permisos reales, sincronización entre personas ni los mínimos finales del challenge. Conectar un agente no debe saltarse el consentimiento; detener/excluir evidencia real exigirá borrar también los derivados del mapa y tutor.

## Revisión visual final

Revisión independiente con la skill impeccable; disposición final: **ship**. Contraste operativo, controles exclusivos de móvil y jerarquía del paso: los tres hallazgos quedaron resueltos y no quedaron hallazgos materiales abiertos. Se revisaron capturas de escritorio y móvil, sin comparativa con un comp aprobado porque el usuario delegó construcción directa. DESIGN.md registra el sistema implementado.

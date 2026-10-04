# UserHelper — CHALLENGE-ELEVEN-LABS

Proyecto para el Challenge 01 del 7th Global AI Hackathon (Hack-Nation × ElevenLabs): aprender el criterio de un experto mientras trabaja, construir un Work Map verificable y enseñar a otra persona en un caso nuevo.

**Estado:** UserHelper en React + TypeScript, con perfiles senior/intern de demostración y una sección de videollamada mediante LiveKit. La biblioteca, escenas y procesos siguen siendo ejemplos sintéticos. Incluye conversación individual con el agente ElevenLabs existente; Capture → Map → Teach todavía requiere integración. El harness de contexto y colaboración sigue operativo.

## Ejecutar el prototipo

Se necesita Node.js 22.12 o posterior (CI utiliza Node 24), npm, Git y Python 3.9+.

```sh
npm ci
npm run dev
```

Abre `http://127.0.0.1:5173`. Cambia de perfil desde «Explorar como». El botón «Demo interactiva» permite probar conexión y estados de biblioteca. Las sesiones guardadas permanecen únicamente en el navegador de esa computadora. Los recorridos de demostración no solicitan dispositivos. La sección Videollamada tiene consentimiento y controles propios.

```sh
npm test
npm run build
```

El build queda en `dist/` y no se versiona. El contrato, recorrido de prueba y puntos de integración están en [FRONTEND-PROTOTYPE.md](docs/FRONTEND-PROTOTYPE.md); la decisión de alcance está en [ADR-0008](context/decisions/ADR-0008.md).

## Videollamadas reales

Completar `.env` con la URL y credenciales de LiveKit, sala y código de equipo. Ejecutar `npm run dev:token` en otra terminal junto a `npm run dev`. Entrar por **Videollamada**; cámara, micrófono y pantalla comienzan apagados. Consulta [LIVEKIT.md](docs/LIVEKIT.md) para la configuración completa, trabajo desde otras computadoras y límites de la integración.

## Conversación individual con tu agente

Completar `ELEVENLABS_API_KEY` y `ELEVENLABS_AGENT_ID` en `.env`, conservar el código de equipo y reiniciar `npm run dev:token`. Abrir **Tu aprendiz de IA**, aceptar el aviso e iniciar por voz o texto. La clave permanece en el backend. La conversación individual puede compartir pantalla con OCR y conserva transcripciones en la bóveda; el Work Map validado sigue pendiente. Configuración, privacidad y resultados: [ELEVENLABS.md](docs/ELEVENLABS.md).

## Diagramas de tus procesos

**Mapas de procesos** organiza acciones con imágenes, instrucciones, decisiones y motivos del experto. La conversación queda como evidencia secundaria. Incluye guía visual, diagrama interactivo y Canvas de Obsidian, con nombre y categorías editables; propuesta inicial: Contabilidad. Para mapas locales: `npm run maps:backfill`; análisis estructurado e imágenes del proveedor: `npm run maps:rebuild -- --reanalyze`. Los procedimientos siguen siendo borradores por revisar. Alcance, formatos y configuración: [PROCESS-MAPS.md](docs/PROCESS-MAPS.md).

## Leer primero
- [Roadmap hasta las 06:00 del 4 de octubre](docs/ROADMAP-15H.md): problema, opciones, mapas, hitos y reparto entre tres personas.
- [Flujo de decisión](docs/WORKFLOW.md): entender, comparar y mapear antes de ejecutar.
- [Disponibilidad y accesos](docs/READINESS.md): qué sabemos y qué falta verificar.
- [Análisis completo del challenge](docs/CHALLENGE.md): requisitos, ejemplos, cifras, recursos y ambigüedades.
- [Estado y relevo](context/STATE.md): qué existe, qué falta y siguiente trabajo.
- [Ontología](context/ontology.json): conceptos, relaciones, evidencia y dudas.
- [Decisiones](context/decisions/ADR-0001.md) y [bitácora por aporte](context/entries/).
- [Flujo de colaboración](CONTRIBUTING.md), [instrucciones para agentes](AGENTS.md) y [Claude](CLAUDE.md).

## Correr la demo en tu Mac (un comando)
Requisitos: Git y Node 22.12+ (`brew install node`). Las claves de ElevenLabs se piden al equipo **por privado**; nunca van a GitHub.

```sh
git clone https://github.com/soyabrahamarriaga-lang/CHALLENGE-ELEVEN-LABS.git ~/CHALLENGE-ELEVEN-LABS
cd ~/CHALLENGE-ELEVEN-LABS
npm run demo
```

Si ya tienes el repo: `git switch main && git pull && npm run demo`.

`npm run demo` instala dependencias si faltan, crea `.env`, activa el inicio del agente sin código (ADR-0014), pide `ELEVENLABS_API_KEY` y `ELEVENLABS_AGENT_ID` la primera vez, levanta backend (3001) y app (5173) y abre `#senior/agent`. Ctrl+C detiene todo. Si lo corre otro agente sin terminal interactiva, agrega las dos claves a `.env` a mano antes. Bóveda opcional: docs/OBSIDIAN.md.

## Preparar otra computadora
Se necesita Git, Python 3.9+ y acceso a este repositorio. El harness no requiere paquetes externos.

```sh
git clone https://github.com/soyabrahamarriaga-lang/CHALLENGE-ELEVEN-LABS.git
cd CHALLENGE-ELEVEN-LABS
python3 scripts/harness.py install
python3 scripts/harness.py status
python3 -m unittest discover -s tests -v
python3 scripts/harness.py check
```

## Qué se registra
Cada commit añade una entrada JSON con actor, operador, tarea, archivos, decisiones, evidencia de pruebas, revisión ontológica, resultado y siguiente paso. Las entradas independientes evitan que todos editen un único log. Los conceptos de producto y el estado actual se actualizan cuando cambia su contenido.

## Qué se comprueba
Los hooks comprueban el snapshot exacto del commit y bloquean un push con archivos pendientes. GitHub Actions repite las comprobaciones sobre los commits nuevos y el resultado final. El check `context-integrity` se utiliza para proteger `main`.

Solo se versiona código y texto UTF-8 de hasta 1 MiB por archivo; incluye configuraciones, lockfiles, Markdown, JSON y SVG textual. Los binarios, dependencias, builds y punteros LFS no forman parte del repositorio. El PDF original del challenge permanece fuera; su análisis en texto sí se comparte.

**Límite real:** los hooks deben instalarse en cada computadora y pueden omitirse deliberadamente; Actions corre después de subir una rama. La protección de `main` impide integrar cambios sin el check. Ningún sistema puede comprobar que alguien registró una decisión que nunca comunicó, ni detectar un archivo deliberadamente ignorado. La revisión del diff y el registro fiel siguen siendo responsabilidad del equipo.

# The AI Apprentice — CHALLENGE-ELEVEN-LABS

## Descripcion del proyecto

The AI Apprentice es un MVP para preservar conocimiento operativo que normalmente vive en la experiencia de una persona. Un aprendiz de IA con voz observa a un experto mientras trabaja, pregunta por que toma decisiones en pausas oportunas, registra limites y excepciones, y convierte esas respuestas en un Work Map verificable. Despues usa ese mapa para ensenar el flujo a otra persona en un caso nuevo, interviniendo antes de que guarde una decision incorrecta.

El reto exige conectar tres momentos: **Capture** (observar y preguntar), **Map** (organizar razones, guardrails y evidencia) y **Teach** (transferir el criterio y comprobar aprendizaje). La aplicacion todavia no esta implementada; el repositorio contiene la base de contexto, colaboracion y validacion para construirla sin perder trazabilidad.

**Estado:** infraestructura de contexto y colaboración. La aplicación Capture → Map → Teach todavía no está implementada. El flujo de trabajo de la demo y el stack siguen pendientes de decisión.

## Leer primero
- [Onboarding para desarrolladores](docs/ONBOARDING.md): recorrido de 15 minutos, reglas del producto y como aportar.
- [Guia de trabajo agile](docs/AGILE.md): backlog, entregables, criterios de terminado y ciclo issue-PR.
- [Analisis completo del challenge](docs/CHALLENGE.md): requisitos, ejemplos, cifras, recursos y ambiguedades.
- [Estado y relevo](context/STATE.md): que existe, que falta y siguiente trabajo.
- [Ontologia](context/ontology.json): conceptos, relaciones, evidencia y dudas.
- [Decisiones](context/decisions/ADR-0001.md) y [bitacora por aporte](context/entries/).
- [Flujo de colaboracion](CONTRIBUTING.md), [instrucciones para agentes](AGENTS.md) y [Claude](CLAUDE.md).

## Estructura del repositorio

```text
docs/                 Producto, challenge y forma de trabajo
context/              Estado, ontologia, ADRs y bitacora inmutable
scripts/              Harness de integridad y automatizacion local
tests/                Pruebas del harness y futuras pruebas del producto
.github/              Issues, PRs, CODEOWNERS y CI
```

La implementacion de la aplicacion se agregara cuando se elijan el flujo de demo y el stack. Hasta entonces no se crean carpetas `frontend/` o `backend/` vacias: cada directorio debe tener un proposito y una tarea que lo use.

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

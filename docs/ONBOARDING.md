# Onboarding de desarrolladores

## Que estamos construyendo

El producto ensena criterio profesional, no solo una secuencia de clics. El flujo esperado es:

1. **Capture:** un experto comparte su pantalla y trabaja con voz. El agente formula preguntas breves sobre decisiones visibles, razones y guardrails.
2. **Map:** un debrief identifica vacios, recoge al menos tres respuestas nuevas y termina con un teach-back confirmado. El resultado es un Work Map navegable con evidencia.
3. **Teach:** una persona nueva resuelve un caso que el experto no mostro. El tutor explica el criterio, pregunta antes de la siguiente decision e interviene antes de guardar un error.

La referencia funcional completa esta en [CHALLENGE.md](CHALLENGE.md). Sus requisitos son la fuente del alcance; las decisiones tecnicas se registran aparte cuando se validen.

## Recorrido de 15 minutos

1. Lee este archivo y [AGILE.md](AGILE.md).
2. Revisa [context/STATE.md](../context/STATE.md) para saber que esta bloqueado y cual es el siguiente entregable.
3. Consulta la matriz de aceptacion en [CHALLENGE.md](CHALLENGE.md#19-matriz-de-aceptacion-derivada-del-brief).
4. Revisa los tres ADR iniciales en [context/decisions](../context/decisions/).
5. Ejecuta `py -m unittest discover -s tests -v` y `py scripts/harness.py status`.
6. Elige un issue existente o abre uno con la plantilla de tarea antes de editar.

## Reglas de producto

- Una accion visible no demuestra por que se tomo: la razon debe venir del experto.
- Cada paso y guardrail necesita evidencia de pantalla y palabras del experto.
- El caso de Teach debe ser nuevo para el experto; repetir el entrenamiento no demuestra transferencia.
- La intervencion debe ocurrir antes del guardado.
- Los datos personales y la retirada de evidencia forman parte del diseño, no son trabajo posterior.

## Reglas de repositorio

- Una tarea usa una rama y un issue; el trabajo entra mediante PR.
- Un cambio de arquitectura, contrato, permisos, privacidad u ontologia requiere un ADR.
- Cada commit debe incluir una entrada nueva en `context/entries/` que cubra sus archivos.
- No se suben credenciales, binarios, dependencias, builds ni datos reales.
- Instala hooks con `py scripts/harness.py install` en cada clon.

## Donde buscar cada cosa

| Necesidad | Ubicacion |
| --- | --- |
| Requisitos del reto | `docs/CHALLENGE.md` |
| Estado y relevo | `context/STATE.md` |
| Conceptos e invariantes | `context/ontology.json` |
| Decisiones estructurales | `context/decisions/` |
| Historial de aportes | `context/entries/` |
| Validaciones locales | `scripts/harness.py` y `tests/` |

## Preparar el entorno

```sh
git clone <url-del-repositorio>
cd CHALLENGE-ELEVEN-LABS
py scripts/harness.py install
py scripts/harness.py status
py -m unittest discover -s tests -v
```

Si `py` no esta disponible, instala Python 3.9 o superior y usa `python3` en macOS/Linux.
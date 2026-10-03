# Forma de trabajo agile

## Orden del trabajo

El backlog se organiza por entregables verticales, no por capas tecnicas aisladas. Cada tarea debe acercar una demo observable a uno de estos outcomes:

| Entregable | Resultado observable | Requisitos relacionados |
| --- | --- | --- |
| Flujo de demo | Caso de trabajo corto, seguro y reproducible | Seleccion pendiente en `context/STATE.md` |
| Capture | Voz y eventos visuales producen preguntas contextuales | CAP-01 a CAP-03 |
| Map | Work Map navegable con razones y evidencia | MAP-01 a MAP-04 |
| Teach | Caso nuevo, tutor e intervencion previa al guardado | TEA-01 a TEA-04 |
| Confianza | Retirada, privacidad y limites explicables | TRUST-01 |
| Pitch | Apprentice Test y moonshot demostrables | PITCH-01 y PITCH-02 |

El orden recomendado es flujo de demo, Capture, Map, Teach y despues extensiones. No se empieza por integraciones opcionales ni por una arquitectura general antes de demostrar un recorrido corto.

## Ciclo de una tarea

1. **Descubrir:** convertir una necesidad del challenge en un issue con outcome, alcance, responsable y criterios observables.
2. **Preparar:** confirmar dependencias, revisar la ontologia y abrir un ADR si cambia una frontera estructural.
3. **Construir:** trabajar en `codex/<tarea>`, `claude/<tarea>` o `human/<tarea>` y mantener el cambio pequeño.
4. **Validar:** ejecutar la prueba mas cercana al comportamiento, despues el harness y revisar el diff.
5. **Compartir:** abrir PR con evidencia, actualizar el estado y dejar una entrada de bitacora nueva.
6. **Aprender:** revisar el resultado contra los criterios y crear la siguiente tarea a partir de lo que falte.

## Definition of Ready

Una tarea puede comenzar cuando tiene:

- resultado observable y requisito del challenge relacionado;
- responsable, herramienta y limites;
- criterios de aceptacion que puedan comprobarse;
- dependencias y dudas identificadas;
- decision documentada si afecta arquitectura, permisos, privacidad o modelo conceptual.

## Definition of Done

Una tarea esta terminada cuando:

- el comportamiento o documento cumple sus criterios;
- existe una prueba o comprobacion reproducible;
- no se introducen datos reales, secretos ni artefactos generados;
- el cambio esta cubierto por una entrada nueva de `context/entries/`;
- el PR describe resultado, evidencia, limites y siguiente paso;
- el estado y la ontologia se actualizan solo si realmente cambiaron.

## Cadencia y tamano

Trabajar en ciclos cortos: una tarea debe poder revisarse en un PR pequeno y una demo parcial debe poder ejecutarse al final del ciclo. Si una tarea mezcla Capture, Map y Teach, dividirla por un vertical demostrable y conservar la matriz de aceptacion como hilo conductor.

No se fija una duracion de sprint mientras el equipo sea una sola persona y agentes colaboradores. El issue y el PR son la unidad de coordinacion; una reunion o tablero externo no sustituye la memoria versionada.

## Priorizacion

Priorizar en este orden:

1. Bloqueos que impiden elegir o ejecutar el flujo de demo.
2. Camino feliz completo de Capture a Teach.
3. Guardrails, evidencia, intervencion y privacidad, porque son el criterio diferencial del reto.
4. Observabilidad, pulido y extensiones opcionales.

Toda tarea nueva debe indicar que riesgo reduce o que requisito demuestra. El nombre de una tecnologia no es por si mismo una prioridad.
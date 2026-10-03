# Flujo de trabajo: entender → comparar → mapear → ejecutar → demostrar

Este es el flujo de decisión del equipo. Se aplica antes de construir la aplicación. Las decisiones adoptadas y sus motivos se registran en `context/entries/`; las estructurales usan un ADR. El [roadmap de 15 horas](ROADMAP-15H.md) aplica este método al challenge.

## 1. Entender el problema

Separar lo que conocemos por el brief, lo que observamos de un experto y lo que todavía suponemos.

**Preguntas de trabajo:**
- ¿Quién pierde conocimiento, quién necesita aprenderlo y en qué tarea concreta?
- ¿Qué decisión requiere criterio que la pantalla o el manual no explican?
- ¿Qué ocurre cuando alguien decide mal y cuál es el último instante para prevenirlo?
- ¿Qué límite, excepción y situación para consultar debe aprender la persona?
- ¿Cómo sabremos que aprendió en un caso distinto?

**Entregable:** ficha de una página con usuario, situación, dolor observable, consecuencia, resultado deseado, evidencia disponible, hipótesis y exclusiones. Añadir una matriz que vincule cada requisito del challenge con una demostración observable.

**Salida verificable:** podemos describir una tarea de 5–10 minutos, al menos una decisión oculta, un guardrail y un caso nuevo. Si no podemos, aún no conocemos lo suficiente el problema para elegir una solución.

## 2. Explorar y pivotear ideas

Comparar como máximo tres soluciones que cumplan Capture, Map y Teach. Para cada una, escribir: situación concreta, conocimiento que captura, tutor que produce, intervención preventiva y cómo se demostrará aprendizaje.

Puntuar de 1 a 5 con evidencia: disponibilidad de un experto/criterio real (25%), cobertura del challenge (25%), posibilidad de intervenir antes del guardado (20%), viabilidad dentro del plazo (15%), claridad para jueces (10%), facilidad de usar datos ficticios (5%). Un dato desconocido se marca `?`; no se inventa una puntuación para declarar un ganador.

**Regla de pivote:** expresar "Creíamos X; observamos Y; cambiaremos Z; conservaremos W; revisaremos con esta prueba". Registrar la opción descartada y la razón. Cambiar una pieza técnica después de elegir el problema no obliga a cambiar el producto completo.

**Salida verificable:** una opción principal, una alternativa y una razón documentada; alcance que cabe en el plazo. Para este challenge, se deja de explorar productos a T+1:45.

## 3. Hacer el mapa antes de ejecutar

Construir cuatro vistas:
1. **Mapa del problema:** persona → situación → decisión difícil → consecuencia → capacidad necesaria.
2. **Mapa de experiencia:** experto comparte → agente observa/pregunta → debrief → confirmación → Work Map → aprendiz trabaja caso nuevo → tutor interviene → evaluación.
3. **Mapa de conocimiento:** evento visual → decisión → razón verbal → guardrail → evidencia → confirmación/incertidumbre.
4. **Mapa de sistema y propiedad:** qué componente produce cada dato, quién lo consume, contrato compartido, responsable y dependencias.

Para cada pantalla/paso, registrar entrada, salida, estado vacío/error, fuente de evidencia y condición de finalización. Un esquema de datos preliminar es suficiente; no convertir este paso en construir infraestructura.

**Salida verificable:** historia de demo completa, contrato mínimo, dos o tres casos de captura y un caso nuevo reservado, componentes asignados y riesgos con prueba concreta. Una ambigüedad que impide enseñar o intervenir antes del guardado debe resolverse aquí.

## 4. Probar los riesgos antes de ampliar el código

Una prueba vertical pequeña comprueba: voz real ElevenLabs, eventos reales de pantalla entrando en contexto, un motivo aportado por el experto y oportunidad de intervenir antes del guardado.

Registrar latencia observada, fallos y límites. Las preguntas no deben obtener su respuesta de un guion oculto; los guardrails que use el tutor deben venir del experto y ser confirmados. Los datos pueden ser ficticios; la interacción y las llamadas de la demo deben ser funcionales y reconocibles como tales.

**Salida verificable:** evidencia de que la cadena puede funcionar. Si una dependencia falla, aplicar el pivote técnico previsto dentro del tiempo acotado; no continuar construyendo sobre una capacidad sin comprobar.

## 5. Ejecutar por recorridos completos

Cada tarea tiene resultado observable, responsable, archivos previstos, criterio de aceptación y prueba. Trabajar por ramas, integrar mediante PR y mantener fuente y contexto en los mismos commits.

Orden de integración: Capture → Map → Teach → confianza y evaluación completa. Diseñar la privacidad desde el mapa; no posponer su arquitectura hasta el último momento. Evitar equipos construyendo módulos contra contratos distintos.

**Salida verificable:** otra persona puede clonar, arrancar y completar el recorrido. Un componente aislado no demuestra por sí mismo el reto completo.

## 6. Demostrar, ajustar y entregar

Ejecutar un caso que no se mostró durante Capture. Verificar cantidades mínimas, evidencia abrible, confirmación del experto, error detectado antes del guardado, retirada de contenido y cierre de aprendizaje. Convertir los resultados en la historia del pitch y una diapositiva de moonshot.

**Salida verificable:** pruebas anotadas, demo reproducible, evidencia de entrega por el canal oficial y margen para contingencias. No confundir un commit o un enlace de GitHub con la entrega oficial del evento.

## Reglas operativas con plazo corto

- La pregunta de cada checkpoint es: "¿Qué evidencia tenemos de que pasó la salida de esta etapa?".
- Un bloqueo técnico recibe un diagnóstico de 15 minutos antes de elegir alternativa o recortar alcance.
- Recortar extensiones y decoración primero; conservar todos los mínimos del brief.
- Los últimos 60 minutos se reservan para contingencias/confirmación, no funcionalidades nuevas.
- STATE expresa la prioridad actual; los logs conservan cómo cambió. Un plan corregido no borra la decisión anterior.
- Nadie presupone que otro chat o computadora recibió contexto: publicar el commit/PR y compartir el enlace permite el relevo.

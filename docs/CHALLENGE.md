# Análisis completo del Challenge 01: The AI Apprentice

Fuente: PDF de ocho páginas «eleven labs .pdf», aportado por el usuario el 3 de octubre de 2026. Se extrajo el texto y se revisaron visualmente las ocho páginas, incluidas sus tablas. Este archivo explica el contenido; no sustituye las bases generales del hackathon. Las cifras y capacidades descritas abajo se atribuyen al brief y no se presentan como verificaciones independientes actuales. Las recomendaciones propias se marcan expresamente.

## 1. Identidad y objetivo (p. 1)

Es el Challenge 01 del **7th Global AI Hackathon**, de **Hack-Nation**, impulsado por **ElevenLabs**. Se titula **The AI Apprentice**, «el aprendiz de inteligencia artificial», y lleva el subtítulo «Accelerating the world's digital operations»: acelerar las operaciones digitales del mundo. La portada contiene las marcas de Hack-Nation y ElevenLabs; no añade requisitos técnicos.

La propuesta es construir un MVP funcional de principio a fin que aprenda cómo trabaja una persona experta, descubra el criterio detrás de sus decisiones y lo convierta en un mapa de trabajo y un tutor para otra persona. MVP significa producto mínimo viable: las tres partes deben estar conectadas y funcionar, aunque el alcance sea pequeño.

## 2. Motivación y escenario humano (p. 2)

El documento plantea la pérdida de conocimiento por jubilación y cita tres cifras: más de **11,200 estadounidenses cumplen 65 años cada día**; **12.9 millones de trabajadores de Alemania**, casi el **30%** de su fuerza laboral, superarán la edad de jubilación en **2036**; y la población mundial de **65 años o más** más que se duplicará hasta **1,600 millones en 2050**. Son contexto del problema, no objetivos medibles del MVP.

El ejemplo es Sabine, de **57 años**, que lleva **24 años** gestionando cuentas por pagar en un fabricante de maquinaria cerca de **Stuttgart**. Es **jueves a las 16:10**, faltan **dos días para el cierre de mes** y quedan **60 facturas abiertas**. Lena, de **26 años**, empezó a trabajar el **lunes** y observa su pantalla por videollamada. Sabine cambia una factura de centro de costos sin explicarlo, retiene otra porque ese proveedor duplica cobros en diciembre y pide una segunda aprobación para otra porque proviene de la filial checa. Lena entiende aproximadamente la mitad; el documento de procesos de **2019** explica todavía menos. Sabine se jubila en **18 meses**.

La idea es que la organización perdería 24 años de criterio que nunca se documentó. El brief sostiene que ya existen las piezas básicas: compartir pantalla en el navegador, modelos de visión que detectan cambios y agentes de voz que pueden preguntar en una pausa. La oportunidad está en unirlas para aprender y transmitir juicio profesional.

## 3. Los tres problemas que hay que resolver (p. 2)

| Problema del brief | Qué significa para el producto |
|---|---|
| El conocimiento vive en las personas | La experiencia útil no está escrita; los nuevos empleados aprenden lentamente observando a otros. |
| Las grabaciones muestran qué ocurrió, pero no por qué | Un video, tutorial o log de clics no distingue criterio deliberado, costumbre y error. Debe preguntarse por la razón. |
| Los guardrails son invisibles | Límites, excepciones y momentos de detenerse o consultar suelen aprenderse al infringirlos. Hay que hacerlos explícitos. |

Aquí **guardrail** significa una regla o condición que limita una acción: un umbral, una excepción, un requisito previo o la obligación de detenerse y consultar a alguien. No se limita a seguridad informática.

## 4. Qué producto piden y qué decisiones dejan libres (pp. 2–3)

El núcleo es la **conversación durante trabajo real**. El experto comparte su pantalla; el agente permanece callado mientras escribe y pregunta brevemente en pausas naturales: por qué hizo algo, qué haría cambiar su decisión y qué nunca haría.

Después hay un **debrief**, una revisión oral de cierre que resuelve excepciones observadas, reglas inciertas y casos no vistos. El sistema vuelve a explicar el proceso hasta que el experto confirma que lo entendió correctamente. Esa explicación de vuelta es el **teach-back**: no es repetir literalmente la transcripción, sino demostrar comprensión y recibir correcciones.

El caso de facturas es un ejemplo recurrente. También permiten reclamaciones de seguros, compras, escalaciones de soporte, controles KYC —conocimiento/verificación del cliente— u otro trabajo de escritorio basado en conocimiento. La interfaz puede ser un panel lateral, un acompañante de voz flotante, una timeline reproducible o una capa de ayuda sobre el trabajo. Aunque Capture se describe con panel lateral, el propio brief concede libertad de interfaz.

La prueba conceptual es explícita: si una persona nueva no puede hacer la tarea a partir de lo aprendido por el sistema, el resultado no cumple la idea de AI Apprentice. Registrar interacciones por sí solo resulta insuficiente.

## 5. Módulo 1: Capture (p. 3)

Construir una aplicación web en la que el experto comparta pantalla y un agente de ElevenLabs acompañe el trabajo. La descripción propone enviar un frame a un modelo de visión **cada uno o dos segundos** y traducir cambios en eventos, por ejemplo: «se abrió la factura 4471» o «el centro de costos cambió de 4711 a 0400».

El agente debe callar mientras el experto **escribe, lee o habla**, y preguntar en pausas naturales. Las preguntas deben descubrir razones y límites: por qué este paso, si hay un umbral o cuándo se detendría para consultar.

**Mínimo explícito:** durante una tarea real, formular **al menos tres preguntas**; cada una debe ocurrir en una pausa natural y referirse a algo visible en pantalla. **Al menos una** debe tratar un guardrail.

**Implicación de diseño, no mecanismo impuesto:** detectar silencio del micrófono no basta para saber si alguien está leyendo o escribiendo. El producto tendrá que explicar qué señales usa y cómo evita interrupciones. Tampoco debe inferir que un cambio visual revela automáticamente la intención de la persona.

## 6. Módulo 2: Map (pp. 3–4)

Cuando termina la tarea, el aprendiz hace una revisión hablada breve. Pregunta lo que sigue sin entender y explica el proceso completo con sus propias palabras para que el experto confirme o corrija.

El resultado es un **Work Map**, una línea temporal navegable. Cada paso muestra el momento de pantalla, la decisión, la razón en palabras del experto y sus guardrails. Debe poder abrirse o recorrerse; no basta con un párrafo de resumen.

El ejemplo del documento es el **paso 4 de 7**, asignar la factura a un centro de costos:

| Campo | Ejemplo del brief |
|---|---|
| Momento de pantalla | **03:12**, factura **4471**, campo de centro de costos. |
| Decisión | Cambiar **opex (4711)** a **capex (0400)**. |
| Razón | Sabine explica a las **03:15** que el equipo por encima de **€5,000** se clasifica como capex. |
| Guardrails | Sin número de activo no se registra como capex. Con proveedor desconocido, detenerse y consultar al controller. |

Para entender el ejemplo, opex se refiere a gasto operativo y capex a gasto/inversión de capital. **La regla de €5,000 pertenece al escenario de demostración del PDF; no es una regla contable universal.** El controller es el responsable de control financiero del ejemplo.

**Mínimo explícito:** hacer **al menos tres preguntas de seguimiento no respondidas durante la tarea**, acabar con un **teach-back confirmado por el experto** y enlazar **cada paso y guardrail** con un momento de pantalla y las palabras del experto.

**Consecuencia:** repetir las tres preguntas de Capture no cumple este mínimo. Hay que identificar vacíos reales, conservar sus respuestas e incorporar las correcciones antes de dar por confirmado el mapa.

## 7. Módulo 3: Teach (p. 4)

El Work Map se transforma en tutor de voz. Una persona nueva trabaja un caso en **su propia pantalla** mientras el tutor observa. El tutor explica los pasos con el criterio del experto, pide al aprendiz que anticipe la siguiente decisión e interviene antes de infringir una regla. Puede reproducir el momento del experto cuando eso ayude. Al finalizar muestra **qué domina la persona y qué debe practicar después**.

**Mínimo explícito:** un juez que actúa como empleado nuevo procesa un caso que **el experto nunca mostró**. El tutor detecta **al menos una decisión equivocada antes de que se guarde** y la explica usando el razonamiento que aportó el experto.

**Implicaciones:** advertir después de guardar no cumple ese requisito. Repetir exactamente la factura de entrenamiento tampoco demuestra generalización. El brief pide detección e intervención a tiempo, pero no impone un mecanismo técnico de bloqueo del botón. Diseñar una UI/sandbox que permita demostrarlo de forma confiable es una decisión de implementación pendiente. El agente debe enseñar a decidir; resolverlo todo automáticamente ocultaría si la persona aprendió.

## 8. Las cinco preguntas del Apprentice Test (p. 4)

La demo debe responder las cinco:

1. **Cuándo preguntar.** Cómo sabe el agente que el experto hizo una pausa y cómo evita hablar mientras escribe, lee o habla.
2. **Qué preguntar.** Cómo escoge una pregunta que revele una razón o guardrail, evitando preguntar lo que la pantalla ya muestra.
3. **Cuándo entendió.** Cómo decide que terminó el debrief y cómo el teach-back demuestra comprensión.
4. **Si aprendió la persona.** Cómo se muestra que puede resolver por sí misma un caso nuevo.
5. **Confianza.** Cómo puede el experto retirar algo del registro y cómo se protegen los datos personales visibles en pantalla.

**Interpretación de implementación:** hacen falta señales de oportunidad para hablar, una lista de incertidumbres, un criterio observable de cierre y evidencia de aprendizaje. Para confianza conviene contemplar pausa/retirada de contenido y tratamiento de derivados: si se elimina evidencia, revisar si una regla o mapa sigue apoyándose en ella. El brief exige la capacidad, pero no dicta una política concreta de retención o arquitectura de borrado.

## 9. Extensiones opcionales: Stretch Goals (p. 5)

Son mejoras adicionales al núcleo, no sustitutos de los tres módulos:

- **Dos expertos, una tarea:** comparar dos sesiones, identificar discrepancias y preguntar a cada experto por qué difieren.
- **Cualquier idioma:** ejemplo de experto que explica en alemán y tutor que enseña en inglés.
- **Guardrails utilizables por agentes:** exportar el Work Map como instrucciones que otro agente pueda cargar para seguir los mismos pasos y detenerse donde lo haría el experto.

## 10. La visión futura: Think Bigger / Moonshot (p. 5)

El alcance del MVP es **un experto, una tarea y una persona nueva**. Además, el pitch debe terminar con **una diapositiva** sobre la visión ambiciosa que construirían después y cómo el MVP conduce a ella. No exige construir esa visión durante el hackathon.

El brief ofrece cuatro direcciones posibles:

- **Memoria viva de la empresa:** expertos y procesos en un mapa que se mantiene actualizado; cuando cambia el trabajo solo pregunta sobre la novedad.
- **Aprendiz siempre activo:** observa el trabajo diario, detecta un caso desconocido y formula una pregunta oportuna, sin sesiones programadas.
- **Primero personas, después agentes:** el conocimiento forma empleados y permite a agentes ejecutar pasos rutinarios de forma segura, dejando a humanos las decisiones de criterio.
- **Manual de operaciones del mundo:** Work Maps anonimizados de miles de empresas que enseñen cómo se realiza el trabajo digital en cualquier lugar.

Son alternativas de inspiración; el documento no obliga a implementar las cuatro ni a escoger una de ellas literalmente.

## 11. Uso de ElevenLabs y arquitectura propuesta (pp. 5–6)

El brief afirma que la voz es el producto y debe sentirse como un colega atento. Presenta:

- **ElevenAgents** para los dos roles: entrevistador y tutor, con **Expressive Mode** para una voz curiosa y paciente.
- **Elección libre del LLM** dentro de ElevenAgents: el modelo decide qué preguntar, cuándo y cuándo ha entendido suficientemente.
- **Scribe v2 Realtime** para escuchar mientras la persona trabaja y detectar pausas que permitan intervenir a tiempo.

El agente de voz ElevenLabs es parte explícita del reto. Expressive Mode y Scribe se presentan en la sección de implementación esperada; no se publica una rúbrica separada que indique si cada opción es obligatoria. Conviene confirmar cualquier sustitución con la organización; este análisis no asume que otros productos sean equivalentes a efectos de evaluación.

La sección **One way to wire it** propone cuatro pasos, por lo que describe una arquitectura posible, no un stack completo obligatorio:

1. El navegador comparte pantalla; envía un frame cada **1–2 segundos** a visión, que devuelve **eventos** en lugar de video.
2. **Client tools** incorporan esos eventos a la conversación de ElevenAgents para que el agente sepa qué ocurre en pantalla.
3. Al terminar, un LLM fusiona eventos, transcripción y respuestas en **Work Map JSON**, e identifica lo que todavía falta aclarar en el debrief.
4. El Work Map pasa a la **base de conocimiento y Procedures** del tutor, que observa la pantalla del nuevo empleado de la misma manera.

**Interpretación:** el modelo de visión observa; la conversación obtiene intención; la estructuración construye conocimiento con evidencia; el tutor aplica ese conocimiento. El documento no fija la forma del JSON, el almacenamiento, el framework frontend/backend ni un único proveedor de visión.

## 12. Dos consejos de ejecución (p. 6)

- **Comenzar con voz y una pantalla:** lograr que eventos visuales entren en el contexto del agente antes de desarrollar el resto.
- **Preguntar menos y después:** aproximadamente **tres a cinco preguntas en vivo por cada diez minutos**; las demás esperan al debrief.

La cadencia 3–5/10 minutos es un consejo, mientras que las tres preguntas de Capture y las tres preguntas nuevas de Map son mínimos expresos. El número correcto de preguntas también depende del trabajo y sus pausas.

## 13. Todas las fuentes de datos y herramientas sugeridas (p. 6)

| Categoría | Fuente indicada | Uso según el documento |
|---|---|---|
| Flujo propio | Grabarse a uno mismo o a un compañero | Datos de prueba cercanos al trabajo real. |
| Cerebro del agente | [Opciones LLM de ElevenAgents](https://elevenlabs.io/docs/agents-platform/customization/llm) | Elegir el modelo del entrevistador y tutor. |
| Comprensión de pantalla | Modelo con visión: Claude, Gemini o GPT | Explicar cambios entre frames. No obliga a uno de los tres. |
| Debrief y Work Map | Framework de agentes a elección | Fusionar eventos, transcripción y respuestas; hallar vacíos. |
| Herramientas | [MCP de ElevenLabs](https://elevenlabs.io/docs/eleven-agents/customization/tools/mcp) | Permitir al tutor consultar guardrails mediante un servidor MCP. |
| Tareas y ocupaciones | [Base O*NET](https://www.onetcenter.org/database.html) | El brief cita **18,838 tareas**, **1,016 ocupaciones** y licencia **CC BY 4.0**. |
| Sandbox de pantalla | [WebArena](https://webarena.dev) | Aplicaciones web autoalojadas con datos ficticios. |
| Privacidad | [Microsoft Presidio](https://github.com/microsoft/presidio) | Ocultar datos personales en transcripciones y frames. |

Son recursos del brief; no se exige utilizar todos ni instalar todos los componentes. El alcance concreto de cada herramienta debe verificarse al integrarla. Este análisis no declara implementada ninguna integración.

## 14. Cómo elegir el flujo de demostración (p. 7)

Recomiendan un proceso que el equipo conozca por trabajo propio o de un compañero y ejecutarlo con **datos falsos o de sandbox**. Un buen flujo:

- Dura **cinco a diez minutos** en pantalla.
- Contiene **al menos una decisión de criterio no documentada**.
- Tiene límites, excepciones y un momento real para detenerse y consultar.

Si no hay flujo propio, sugieren **tres facturas de proveedores en un ERP de pruebas**, una por encima del umbral **€5,000** de capex y otra de un proveedor que duplica cobros en diciembre. ERP es el sistema de gestión empresarial de ese ejemplo. El documento no pide construir un ERP completo.

## 15. La demostración ejemplar: What Good Looks Like (p. 7)

Un juez representa a Sabine: comparte pantalla y procesa **tres facturas mientras habla**. En una pausa, el agente pregunta por qué cambió una a capex. El experto responde que el equipo por encima de **€5,000** se clasifica así.

En el debrief pregunta si la retención de una factura de diciembre se aplica a todos los proveedores y quién autoriza liberarla. Después explica el proceso completo **en menos de un minuto**; el juez corrige un detalle.

El Work Map del ejemplo muestra **siete pasos, tres decisiones de criterio y cuatro guardrails**, todos vinculados a evidencia de pantalla. Un segundo juez hace de empleado nuevo, abre una factura distinta de equipo por **€7,200** e intenta elegir opex. El tutor lo detiene a tiempo, le hace pensar por qué Sabine se detendría, reproduce la evidencia y permite que la persona corrija su elección.

**Distinción:** siete pasos, tres decisiones, cuatro guardrails y el teach-back menor a un minuto son la referencia de calidad del ejemplo; no están declarados como mínimos universales. El propio apartado dice que ese es el nivel esperado. Conviene alcanzar una demostración igual de convincente aunque el flujo tenga otros conteos.

## 16. Qué consideran fuerte o débil (p. 7)

| Entrega fuerte | Entrega débil |
|---|---|
| Preguntas oportunas sobre lo visible en pantalla | Interrumpir mientras escriben o hacer preguntas genéricas. |
| Capturar límites, excepciones y condiciones para escalar | Capturar solo el camino normal o happy path. |
| Debrief que cierra vacíos y termina con teach-back | Producir después un resumen escrito desde la transcripción. |
| Tutor que enseña a decidir con palabras del experto | Entregar una grabación que no facilita aprendizaje. |
| Pitch con visión futura clara y camino hacia ella | Una demo sin explicación de cómo puede crecer. |

No se dan puntos, porcentajes o ponderaciones oficiales. Es una comparación cualitativa de lo que buscan los jueces.

## 17. Por qué importa y argumento de negocio (pp. 7–8)

El documento repite las **18,838 tareas y 1,016 ocupaciones** de O*NET, del Departamento de Trabajo de Estados Unidos, para señalar cuánto criterio laboral queda sin escribir. Cita una previsión de **Gartner**: **más del 40% de los proyectos de IA agéntica se cancelarían antes de terminar 2027**, por costos crecientes, valor de negocio poco claro o controles de riesgo inadecuados.

La tesis del brief es que parte de lo que falta en esos proyectos es conocimiento que solo existe en las personas. La voz facilita capturarlo: alguien que no escribiría un manual puede explicar su trabajo mientras lo hace. La oportunidad comercial es convertir experiencia en mapas y tutores que continúen siendo útiles cuando un experto se retire. La previsión de Gartner es un argumento citado por el documento, no un resultado observado en este proyecto ni una estadística recalculada aquí.

## 18. Apéndice completo (p. 8)

- [ElevenAgents quickstart](https://elevenlabs.io/docs/eleven-agents/quickstart).
- [ElevenLabs Startup Grants](https://elevenlabs.io/startup-grants): enlace a su programa; el brief no especifica elegibilidad, importes ni que el challenge garantice una subvención.
- [UN News, enero de 2023](https://news.un.org/en/story/2023/01/1132392).
- [Alliance for Lifetime Income, agosto de 2024](https://www.protectedincome.org/news/analysis-peak-65-boom).
- [Destatis, agosto de 2022](https://www.destatis.de/EN/Press/2022/08/PE22_330_13.html).
- [Gartner, 25 de junio de 2025](https://www.gartner.com/en/newsroom). El PDF enlaza la sala de prensa, no una URL específica del comunicado.
- [O*NET 31.0 Database](https://www.onetcenter.org/database.html).

Se conservan los nombres, fechas y destinos citados; no se presupone que todos los enlaces permanezcan iguales con el tiempo.

## 19. Matriz de aceptación derivada del brief

| ID | Requisito | Evidencia que tendría que mostrar la demo | Página |
|---|---|---|---|
| CAP-01 | Pantalla de experto y voz ElevenLabs durante trabajo real | Sesión funcional con eventos visibles contextualizados | 3 |
| CAP-02 | ≥3 preguntas durante pausas sobre pantalla | Preguntas y momentos verificables | 3 |
| CAP-03 | ≥1 pregunta sobre un guardrail | Pregunta y respuesta que explicitan un límite/excepción | 3 |
| MAP-01 | ≥3 preguntas nuevas en debrief | Vacíos identificados y respuestas adicionales | 4 |
| MAP-02 | Teach-back confirmado por el experto | Confirmación/corrección explícita | 4 |
| MAP-03 | Work Map navegable con pasos, decisiones, razones y reglas | Timeline o interfaz equivalente que abre cada elemento | 3–4 |
| MAP-04 | Cada paso y regla enlazados a pantalla y palabras del experto | Evidencia abrible y atribuida | 4 |
| TEA-01 | Caso que el experto nunca mostró | Caso de evaluación diferenciado | 4 |
| TEA-02 | ≥1 decisión errónea detectada antes de guardar | Intervención visible previa al guardado | 4 |
| TEA-03 | Explicación basada en el criterio del experto | Razón y evidencia correspondientes | 4 |
| TEA-04 | Predicción de decisiones, dominio y práctica posterior | Interacción y cierre de la sesión de aprendizaje | 4 |
| TRUST-01 | Retirada de contenido y protección de datos personales | Flujo y tratamiento de información explicables | 4 |
| PITCH-01 | Responder las cinco preguntas del Apprentice Test | Demostración o explicación verificable de cada una | 4 |
| PITCH-02 | Una diapositiva final de moonshot y camino desde el MVP | Slide final | 5 |

Esta matriz organiza requisitos del texto; no es una rúbrica oficial publicada por los organizadores.

## 20. Ambigüedades y datos que el documento no proporciona

No aparecen fecha/hora límite, zona horaria de entrega, duración total del pitch, formato o portal de envío, obligación de repositorio público, licencia del código, tamaño de equipo, presupuesto/créditos, premios, rúbrica ponderada, requisitos de hosting, política detallada de datos, nivel de exactitud mínimo de visión, latencia máxima de voz ni esquema definitivo del Work Map. Deben obtenerse de las bases generales o de los organizadores; no deben inventarse.

La voz ElevenLabs es explícita. El uso exacto de Scribe v2 Realtime/Expressive Mode, la flexibilidad del intervalo de frames y cualquier alternativa a la implementación descrita conviene confirmarlos si se pretende desviarse del brief. Tampoco define matemáticamente qué significa que el agente «entienda completamente»; sí pide la confirmación del experto y preguntas que cierren vacíos.

## 21. Lectura ontológica y aplicación al proyecto (interpretación propia)

La unidad de conocimiento es más rica que un paso: **situación observada → decisión → razón → condición/límite → evidencia → confirmación**. El sistema distingue acciones visibles de motivos expresados, reglas generales de excepciones, certeza de dudas y enseñanza de simple ejecución.

Para nosotros hay dos niveles de memoria distintos: el harness registra por qué el equipo construye el producto de cierta manera; el Work Map futuro registra por qué un experto realiza una tarea de cierta manera. Comparten trazabilidad, pero no son el mismo dato ni tienen el mismo público.

Una recomendación de ejecución derivada del brief es resolver un flujo corto completo antes de expandir casos: voz y eventos, captura de razones, debrief confirmado, mapa con evidencia y tutor sobre un caso nuevo. La selección del flujo y el stack requiere una decisión posterior; el análisis no autoriza ni supone que la aplicación ya esté construida.

import type { KnowledgeSession } from "../domain/types";
export const questions = [
  {
    text: "Para entender mejor tu proceso, ¿qué te lleva a revisar el historial antes de responder?",
    note: "Quiero entender el criterio detrás de ese primer paso.",
  },
  {
    text: "¿Hay alguna señal que te haga detenerte y pedir ayuda a otra persona?",
    note: "Las excepciones también son parte de tu experiencia.",
  },
  {
    text: "¿En qué situación preferirías seguir otro camino?",
    note: "Puede haber más de una buena manera de resolverlo.",
  },
];
export const exampleSessions: KnowledgeSession[] = [
  {
    id: "accesos",
    title: "Resolver una incidencia de acceso",
    senior: "Mariana Torres",
    initials: "MT",
    role: "Customer Success · Senior",
    date: "2026-10-02T10:30:00-06:00",
    description:
      "Cómo entender el contexto de un cliente antes de restablecer su acceso. Las señales que me ayudan a decidir cuándo escalar.",
    category: "Soporte",
    color: "sage",
    duration: 754,
    demo: true,
    steps: [
      {
        id: "contexto",
        title: "Entender lo que ocurrió",
        kind: "step",
        at: 0,
        action: "Abrir el ticket y revisar los últimos mensajes del cliente.",
        purpose:
          "Evitar que la persona tenga que explicar otra vez su problema.",
        quote:
          "Primero leo lo que ya nos contó. A veces la respuesta está en una conversación anterior.",
      },
      {
        id: "historial",
        title: "Revisar el historial de acceso",
        kind: "step",
        at: 92,
        action:
          "Consultar la fecha del último acceso y los cambios recientes de la cuenta.",
        purpose: "Distinguir un problema puntual de un cambio de permisos.",
        quote:
          "Si ayer pudo entrar y hoy no, busco qué cambió entre esos dos momentos.",
      },
      {
        id: "decidir",
        title: "¿Restablecer o escalar?",
        kind: "decision",
        at: 228,
        action:
          "Comprobar si la identidad está verificada y si hay una alerta de seguridad.",
        purpose:
          "Elegir una respuesta que resuelva el problema sin exponer la cuenta.",
        quote:
          "Si veo una alerta o no puedo confirmar quién solicita el acceso, no restablezco nada. Pido apoyo a seguridad.",
        context:
          "En este ejemplo, la identidad está verificada y no hay alertas.",
        variant:
          "Si aparece una alerta, conservar el ticket abierto y consultar al equipo de seguridad.",
      },
      {
        id: "variante",
        title: "Si el problema es de permisos",
        kind: "variant",
        at: 396,
        action:
          "Consultar al administrador del espacio antes de cambiar un rol.",
        purpose:
          "Respetar la forma en que cada equipo distribuye sus permisos.",
        quote:
          "Un restablecimiento no resuelve un permiso que cambió. En ese caso hablo con quien administra su equipo.",
        context:
          "Aplica cuando el cliente inicia sesión, pero no puede entrar a una sección.",
      },
      {
        id: "cierre",
        title: "Confirmar con el cliente",
        kind: "step",
        at: 586,
        action:
          "Pedir que pruebe el acceso y documentar la solución con sus palabras.",
        purpose: "Cerrar solo cuando la persona confirma que puede continuar.",
        quote:
          "Que mi pantalla diga resuelto no significa que la persona ya pueda trabajar.",
      },
    ],
  },
  {
    id: "handoff",
    title: "Preparar un relevo de proyecto",
    senior: "Diego Ruiz",
    initials: "DR",
    role: "Operaciones · Senior",
    date: "2026-10-01T15:00:00-06:00",
    description:
      "Lo que incluyo en un relevo para que la siguiente persona sepa qué está decidido, qué falta y a quién acudir.",
    category: "Operaciones",
    color: "blue",
    duration: 562,
    demo: true,
    steps: [
      {
        id: "estado",
        title: "Reconstruir el estado actual",
        kind: "step",
        at: 0,
        action:
          "Abrir el tablero y distinguir tareas cerradas de trabajo pendiente.",
        purpose: "Dar una imagen fiable del proyecto.",
        quote:
          "Empiezo por lo que está realmente listo, no por lo que esperábamos terminar.",
      },
      {
        id: "decisiones",
        title: "Explicar las decisiones",
        kind: "step",
        at: 120,
        action:
          "Enlazar los acuerdos y explicar qué alternativas se descartaron.",
        purpose: "Evitar volver a abrir decisiones sin contexto.",
        quote:
          "Dejo el porqué al lado del acuerdo. Eso ahorra muchas preguntas después.",
      },
      {
        id: "bloqueo",
        title: "¿Hay un bloqueo abierto?",
        kind: "decision",
        at: 245,
        action: "Identificar dependencias que necesitan una respuesta externa.",
        purpose: "Hacer visible qué impide avanzar.",
        quote:
          "Si depende de otra persona, dejo su nombre y la pregunta concreta.",
        context: "El equipo necesita validar una fecha de entrega.",
        variant:
          "Si no hay respuesta, documentar una alternativa reversible y quién la puede decidir.",
      },
      {
        id: "cambio",
        title: "Si la prioridad cambia",
        kind: "variant",
        at: 350,
        action:
          "Registrar la nueva prioridad y conservar el acuerdo anterior como contexto.",
        purpose: "Hacer comprensible el cambio sin borrar su historia.",
        quote:
          "Cambiar de opinión puede ser lo correcto. Lo que importa es explicar qué aprendimos.",
      },
      {
        id: "confirmar",
        title: "Comprobar la comprensión",
        kind: "step",
        at: 445,
        action:
          "Pedir que la otra persona explique cuál sería su siguiente paso.",
        purpose: "Detectar vacíos antes de terminar el relevo.",
        quote:
          "Le pregunto por dónde empezaría. Si algo no quedó claro, lo resolvemos ahí.",
      },
    ],
  },
  {
    id: "informe",
    title: "Leer los resultados de una campaña",
    senior: "Ana Robles",
    initials: "AR",
    role: "Marketing · Senior",
    date: "2026-09-30T09:00:00-06:00",
    description:
      "El contexto detrás de los números: cómo comparo periodos y distingo una señal útil de una variación habitual.",
    category: "Marketing",
    color: "sand",
    duration: 918,
    demo: true,
    steps: [
      {
        id: "objetivo",
        title: "Volver al objetivo original",
        kind: "step",
        at: 0,
        action: "Revisar el brief de la campaña y su objetivo principal.",
        purpose: "Elegir las métricas que realmente responden a la pregunta.",
        quote: "Antes de abrir el reporte, recuerdo qué queríamos conseguir.",
      },
      {
        id: "periodo",
        title: "Comparar periodos equivalentes",
        kind: "step",
        at: 165,
        action: "Alinear duración, días de la semana y canales.",
        purpose:
          "No atribuir a la campaña un cambio que proviene del calendario.",
        quote:
          "Un lunes y un sábado se comportan distinto, aunque el anuncio sea el mismo.",
      },
      {
        id: "senal",
        title: "¿La señal se sostiene?",
        kind: "decision",
        at: 340,
        action:
          "Revisar si hay suficientes observaciones y si el cambio se repite.",
        purpose: "No recomendar un ajuste con información incompleta.",
        quote:
          "Si todavía tenemos pocos datos, prefiero observar antes de cambiarlo todo.",
        context: "La campaña de ejemplo lleva dos semanas activa.",
        variant:
          "Si el periodo es corto, anotar la hipótesis y fijar una nueva revisión.",
      },
      {
        id: "contexto",
        title: "Cuando hay un evento externo",
        kind: "variant",
        at: 550,
        action:
          "Anotar promociones, incidentes o fechas especiales del periodo.",
        purpose: "Conservar el contexto que los números no muestran.",
        quote:
          "Una promoción puede explicar el pico. No quiero que se pierda ese detalle.",
      },
      {
        id: "proponer",
        title: "Proponer el siguiente experimento",
        kind: "step",
        at: 745,
        action: "Elegir un cambio pequeño y escribir qué resultado esperamos.",
        purpose: "Aprender algo concreto en la siguiente revisión.",
        quote:
          "Si cambiamos cinco cosas a la vez, después no sabremos cuál ayudó.",
      },
    ],
  },
];

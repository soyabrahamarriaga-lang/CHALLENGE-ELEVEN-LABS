---
name: UserHelper
description: Una mesa de trabajo compartida para conservar experiencia y explorar sus razones.
colors:
  green: "#285744"
  green-deep: "#1e4435"
  ink: "#26352f"
  muted: "#65736a"
  operational-secondary: "#526258"
  workspace: "#f6f8f6"
  paper: "#fff"
  line: "#e2e8e2"
  sage: "#eaf1eb"
  illustration-sage: "#e8efe7"
  illustration-blue: "#e7eef5"
  illustration-sand: "#f0ebdd"
  focus: "#437e63"
  end-background: "#f9efeb"
  end-text: "#a45441"
  map-decision: "#fcf9ef"
  map-connection: "#82998a"
  process-image: "#eef2ed"
  process-reason: "#edf3eb"
typography:
  headline:
    fontFamily: '"Manrope Variable", Manrope, sans-serif'
    fontSize: "32px"
    fontWeight: 680
    lineHeight: 1.24
    letterSpacing: "-1.15px"
  title:
    fontFamily: '"Manrope Variable", Manrope, sans-serif'
    fontSize: "20px"
    fontWeight: 670
    lineHeight: 1.35
    letterSpacing: "-0.5px"
  card-title:
    fontFamily: '"Manrope Variable", Manrope, sans-serif'
    fontSize: "14px"
    fontWeight: 670
    lineHeight: 1.6
    letterSpacing: "-0.17px"
  body:
    fontFamily: '"Manrope Variable", Manrope, sans-serif'
    fontSize: "13px"
    fontWeight: 450
    lineHeight: 1.9
  button:
    fontFamily: '"Manrope Variable", Manrope, sans-serif'
    fontSize: "12px"
    fontWeight: 670
    lineHeight: 1.4
  navigation:
    fontFamily: '"Manrope Variable", Manrope, sans-serif'
    fontSize: "12px"
    fontWeight: 580
  map-node-title:
    fontFamily: '"Manrope Variable", Manrope, sans-serif'
    fontSize: "16px"
    lineHeight: 1.5
  process-step-title:
    fontFamily: '"Manrope Variable", Manrope, sans-serif'
    fontSize: "23px"
    lineHeight: 1.45
    letterSpacing: "-0.025em"
  process-explanation:
    fontFamily: '"Manrope Variable", Manrope, sans-serif'
    fontSize: "14px"
    lineHeight: 1.85
rounded:
  badge: "5px"
  chip: "7px"
  button: "8px"
  field: "9px"
  card: "12px"
  stage: "16px"
  circle: "50%"
  map-boundary: "40px"
spacing:
  compact: "8px"
  control: "12px"
  content: "16px"
  section: "20px"
  roomy: "24px"
  dialog: "28px"
components:
  button-primary:
    backgroundColor: "{colors.green}"
    textColor: "{colors.paper}"
    typography: "{typography.button}"
    rounded: "{rounded.button}"
    padding: "10px 15px"
  button-primary-hover:
    backgroundColor: "{colors.green-deep}"
  button-secondary:
    backgroundColor: "{colors.paper}"
    textColor: "#435848"
    typography: "{typography.button}"
    rounded: "{rounded.button}"
    padding: "10px 15px"
  button-text:
    textColor: "{colors.green}"
    padding: "5px 0"
    rounded: "3px"
  button-end:
    backgroundColor: "{colors.end-background}"
    textColor: "{colors.end-text}"
    typography: "{typography.button}"
    rounded: "{rounded.button}"
    padding: "10px 15px"
  search-field:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.field}"
    padding: "0 13px"
  navigation-selected:
    backgroundColor: "{colors.sage}"
    textColor: "{colors.green}"
    rounded: "{rounded.field}"
    padding: "13px"
  filter-chip:
    backgroundColor: "{colors.paper}"
    textColor: "#70806a"
    rounded: "{rounded.chip}"
    padding: "8px 13px"
  session-card:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.card}"
  timeline-current:
    backgroundColor: "#edf4e5"
    rounded: "{rounded.button}"
    padding: "12px 8px"
  step-badge:
    backgroundColor: "#eaf0e3"
    textColor: "#61764e"
    rounded: "{rounded.badge}"
    padding: "4px 7px"
  map-node:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "20px"
    width: "400px"
  map-node-decision:
    backgroundColor: "{colors.map-decision}"
  map-node-boundary:
    backgroundColor: "{colors.sage}"
    rounded: "{rounded.map-boundary}"
  map-action-inspector:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    padding: "24px"
  process-step:
    textColor: "{colors.ink}"
    padding: "30px 0 38px"
  process-reason:
    backgroundColor: "{colors.process-reason}"
    padding: "17px 19px"
  process-metadata:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.card}"
    padding: "24px"
---

# Design System: UserHelper

## Overview

**Creative North Star: "La sala de edición compartida"**

UserHelper se siente como una mesa de trabajo luminosa: superficies blancas, fondo apenas verde y controles de bosque oscuro. La identidad acompaña una tarea en curso y la lectura posterior de sus decisiones. La densidad es operativa, con aire entre grupos y detalles compactos dentro de cada herramienta.

Manrope une navegación, contenido y datos temporales. Las ventanas y miniaturas de la biblioteca sintética son ilustraciones construidas con CSS y SVG; los procedimientos privados muestran capturas reales junto a sus acciones cuando están disponibles; el logotipo combina una U abierta con un trazo central. La personalidad es profesional, clara y respetuosa. El registro de demostración permanece visible en los recorridos sintéticos.

**Key Characteristics:**

- Superficies claras separadas por bordes suaves y cambios de tono.
- Verde oscuro para acciones principales y selección; azul y arena para distinguir ejemplos.
- Tipografía única, títulos compactos y párrafos con interlineado generoso.
- Pasos, tiempos y razones conectados por una misma selección.
- Movimiento breve de estado y navegación, con reducción de movimiento respetada.

Este documento registra el código terminado de `src/styles.css`, `src/components/Shared.tsx`, `src/App.tsx` y `src/features/`, incluida la cascada final de legibilidad y la extensión de mapas en `src/features/ProcessMaps.tsx` y `ProcessMaps.css`. Los tokens del frontmatter son normativos; los ejemplos completos y las extensiones están en `.impeccable/design.json`.

## Colors

La paleta tiene una base vegetal sobria, blancos limpios y tintes suaves que separan funciones sin competir con el contenido.

### Primary

- **Verde bosque** (`green`): acción principal, marca, enlaces de acción y navegación seleccionada.
- **Bosque profundo** (`green-deep`): interacción de la acción principal y palabra de marca.
- **Salvia de selección** (`sage`): fondo de navegación activa; evita convertir toda la superficie en un bloque saturado.

### Secondary

- **Salvia, azul y arena de ilustración** (`illustration-sage`, `illustration-blue`, `illustration-sand`): familias de escenas sintéticas y miniaturas. Son tratamientos de contenido, no tres colores de acción intercambiables.
- **Terracota de cierre** (`end-background`, `end-text`): botón de finalizar con fondo claro y texto cálido. Los errores tienen además icono y mensaje explícito.

- **Decisión del procedimiento** (`map-decision`): fondo claro del nodo de decisión en la vista de diagrama; conserva la etiqueta y un borde reforzado.
- **Imagen y motivo** (`process-image`, `process-reason`): soporte neutro para la captura y bloque salvia para el criterio del experto.
- **Conexión del diagrama** (`map-connection`): línea continua entre acciones, con flecha; las alternativas se explican en el contenido del paso.

### Neutral

- **Tinta vegetal** (`ink`): texto principal.
- **Texto secundario** (`muted`): descripción y metadatos corrientes.
- **Texto operativo secundario** (`operational-secondary`): tiempos y categorías del proceso, recordatorios de contexto, fecha, metadatos de sesión y estado de registro. Conserva la corrección de contraste del cierre visual.
- **Mesa clara**, **papel** y **línea** (`workspace`, `paper`, `line`): fondo de aplicación, contenedores y divisiones respectivamente.
- **Verde de foco** (`focus`): contorno de teclado visible.

**The State Has Words Rule.** Una conexión, pausa, decisión o variante se reconoce por texto y, cuando corresponde, icono o forma; el color nunca carga solo con su significado.

## Typography

**Display / Body Font:** Manrope Variable, Manrope, sans-serif. La fuente se importa localmente desde `@fontsource-variable/manrope`.

El sistema usa una sola familia geométrica de trazos amables. La jerarquía depende de tamaño, peso variable y espacio; la escala no sigue una razón matemática única. No hay una segunda familia ornamental ni monoespaciada.

- **Headline:** título base de página; el token describe escritorio. Se adapta a tamaños de (27–28px) bajo los puntos de cambio de escritorio y móvil.
- **Title:** encabezado base de sección. Las secciones recientes usan (19px) en escritorio; los títulos de detalle y explicación tienen ajustes propios.
- **Card title:** títulos de sesiones, con dos líneas cuando lo pide el contenido. La tarjeta amplia de biblioteca en móvil sube a (17px), mientras la tarjeta reciente compacta usa (12px).
- **Body:** explicación de una acción y su propósito. Otras descripciones operativas usan (12–14px); el interlineado observado es de (1.7–1.9). No convertir los textos minúsculos de una escena ilustrada en una escala de lectura.
- **Button / Navigation:** controles compactos; la selección de navegación aumenta el peso a (740). El botón de inicio tiene una variante más visible de (14px).
- **Tiempo:** temporizadores y marcas de reproducción usan cifras tabulares; el contador de sesión usa (19px), peso (620) y espaciado de (1px).

La guía de procedimientos conserva esta familia: título según `process-step-title`, explicación según `process-explanation`, número de paso con cifras tabulares (26px) y metadatos a (12px). El título aparece antes de actividad, tipo y tiempo. En móvil, el título baja a (20px) y la explicación a (13px). El diagrama alterno usa `map-node-title`; su inspector comienza por el título de la acción (21px) y continúa con cómo ejecutarla y su motivo.

**The Reading Before Ornament Rule.** La información que permite operar y comprender conserva la escala final de lectura; las pequeñas ventanas de ejemplo siguen siendo ilustraciones.

## Layout

La estructura de escritorio combina navegación fija a la izquierda (232px), una barra superior (73px) y contenido centrado con ancho máximo (1410px). El relleno horizontal principal es (38px). El contenido usa columnas flexibles de mínimo cero para contener nombres, escenas y tarjetas sin ensanchar la página.

La superficie senior distribuye la sesión y un acompañamiento lateral de (265px), con separación de (31px). El detalle combina contenido flexible y proceso de (310px), separado por (27px); el proceso permanece pegado a (22px) del borde superior durante el desplazamiento de escritorio. Las sesiones forman tres columnas; los bloques de explicación distribuyen acción y propósito en dos columnas.

Los cambios efectivos son:

- Desde (1500px), aumentan algunos márgenes y los paneles laterales: (295px) en senior y (340px) en detalle.
- Hasta (1200px), navegación de (210px), márgenes de (27px) y paneles más estrechos.
- Hasta (1000px), navegación de (190px), contenido de una columna para senior y detalle, tarjetas en dos columnas y proceso colocado antes del reproductor. El proceso se transforma en una fila desplazable horizontal con ajuste de posición por paso.
- Hasta (700px), navegación como cajón de (248px), barra superior de (64px), margen de contenido de (20px) y tarjetas en una columna. Las sesiones recientes conservan una composición horizontal con miniatura de (110px). El menú y el cierre de navegación aparecen solo en este rango; el cajón cerrado queda oculto también a la interacción por teclado.

La cadencia es contextual: separaciones compactas dentro de controles y metadatos; más aire entre escenario, explicación y secciones. No imponer una cuadrícula de espaciado rígida a los valores existentes. El desplazamiento horizontal está contenido dentro del proceso, no en el documento.

La guía visual de procedimientos se lee en una columna de pasos separados por líneas. Dentro de cada paso, captura y explicación comparten una cuadrícula de proporción (1.15:1), separación de (30px) y sangría de (48px) respecto al número. Hasta (1100px), desaparece esa sangría y la separación baja a (22px). Hasta (950px), imagen y explicación se apilan. Ampliar la imagen abre un diálogo independiente a tamaño original, con desplazamiento interno; conserva la cuadrícula del paso. El visor ocupa hasta (96vw), con límite de (1600px), altura máxima de (94dvh) y región de imagen desplazable hasta (76dvh).

La vista alternativa de diagrama incorpora un lienzo y un inspector lateral de (360px), reducido a (300px) hasta (1100px). Hasta (950px), el inspector pasa debajo del lienzo y deja de limitar su altura interna. El lienzo pasa de (580px) a (500px) en ese rango y a (440px) hasta (580px); en este último rango se oculta el minimapa, se apilan filtros y campos de clasificación y se reorganizan las acciones. Son puntos de cambio propios de procedimientos, sin reemplazar los del marco general.

## Elevation & Depth

La profundidad habitual proviene de superficies blancas, tintes y bordes de un píxel. Las tarjetas permanecen planas; su interacción cambia el borde. Las sombras se reservan para elementos superpuestos o affordances puntuales: diálogo, aviso flotante, cajón móvil y botón de reproducción sobre una miniatura. Los valores exactos viven en las extensiones del sidecar.

**The Flat Work Surface Rule.** Los paneles de trabajo descansan sobre tono y borde; la elevación marca una superposición, no cada contenedor.

## Shapes

Los rectángulos tienen esquinas suaves y escala de radio según función: pequeño para etiquetas, intermedio para botones y campos, mayor para tarjetas y escenario. El radio de escenario procede de `--radius`; las tarjetas de sesión y de proceso comparten el radio de tarjeta. Las escenas se recortan dentro de su contenedor.

En la biblioteca de ejemplos, círculos pequeños indican estado o paso habitual. Decisiones y variantes usan nodos más cuadrados; la variante añade línea discontinua y una rama lateral. Los avatares son círculos con iniciales, sin retratos sintéticos. La marca es un SVG blanco de extremos redondos dentro de un cuadrado verde redondeado; conservar su geometría, no sustituirla por un carácter tipográfico.

En el diagrama alterno de procedimientos privados, el nodo es una tarjeta de borde suave. Inicio y fin usan extremos más redondos; una decisión refuerza el borde a (2px), y la selección añade el contorno verde de foco separado del borde. Las conexiones continuas bajan de una acción a la siguiente con codos suaves y flecha final. El lienzo tiene una retícula de puntos discreta; nodos y controles no reciben sombra de selección ni hover.

## Components

### Buttons

Controles firmes y compactos. Primario verde, secundario blanco con borde y texto verde apagado, cierre terracota y acción de texto subrayada al pasar el puntero. El botón base mide al menos (43px) de alto; el inicio de llamada llega a (47px). Su tamaño puede variar en herramientas específicas según el código existente.

Las transiciones de fondo, texto y borde duran (180ms). El foco visible usa contorno sólido de (3px), separado (4px). Un control deshabilitado conserva forma y reduce opacidad a (0.46). Los iconos SVG acompañan el texto; los controles de solo icono requieren nombre accesible.

### Chips

Los filtros son botones blancos con borde, radio pequeño y estado seleccionado de fondo salvia. Las etiquetas de tipo de paso son informativas: icono más texto; la variante tiene tono arena. En la explicación del paso, el título aparece antes de la fila de tipo y posición. Mantener esa jerarquía.

### Cards / Containers

Las tarjetas de sesión contienen una miniatura de proceso, título, datos del senior y duración. El borde se oscurece al pasar el puntero; la miniatura revela un símbolo de reproducción también con foco de teclado. Una tarjeta completa es un botón, sin acciones interactivas anidadas. El escenario y el proceso son contenedores separados por borde; la explicación vive directamente en el fondo de trabajo.

### Inputs / Fields

La búsqueda es un campo blanco con icono, borde y radio de campo; ocupa el espacio libre hasta (600px) y tiene altura mínima de (45px). Su foco se dibuja en el contenedor con borde verde y contorno salvia de (2px). El título de sesión es un campo de texto con etiqueta visible, borde y radio de (7px). Los selectores conservan el comportamiento nativo.

### Navigation

La navegación lateral usa icono lineal y etiqueta alineados. La selección añade fondo salvia y peso; el hover añade un fondo tenue. En móvil, el cajón entra en (280ms) con `--ease`, acompañado de una capa de fondo. Las pestañas del proceso usan borde inferior para la selección y admiten flechas del teclado. No extender los controles de abrir/cerrar cajón a escritorio.

### Timeline and explanation

En la biblioteca de ejemplos, la firma del sistema es la relación entre momento, paso y razón. El elemento elegido usa fondo salvia, borde y nodo distinguible; conserva su título, tipo y tiempo. Seleccionarlo actualiza la escena y el contenido contextual. Las variantes son ramas, no pasos indistinguibles. En tablet y móvil se convierte en una fila de pasos desplazable; conserva la selección y el orden de lectura.

### Process guides and action diagrams

La guía visual es la vista inicial del procedimiento; «Diagrama» es una alternativa del mismo contenido. El selector de vista usa texto, icono, estado presionado y borde inferior verde. La cantidad indicada corresponde a acciones. La lista de procesos usa filas blancas con título, departamento, tipo de tarea, fecha y conteos de acciones e imágenes. Los estados «Por revisar» y «Sin tarea identificada» acompañan los registros, separados de la biblioteca sintética.

Cada paso presenta número, título operativo y metadatos; después coloca la captura real junto a «Cómo hacerlo» y «Por qué se hace así». La captura conserva proporciones con ajuste `contain`, borde suave y radio de botón; su pie incluye tiempo, relación de momento cercano cuando corresponde y ampliación. La ausencia de captura se presenta como «Imagen pendiente». Un fallo de descarga indica «No pudimos cargar la imagen», aclara que la captura está registrada y ofrece «Reintentar imagen»; la variante compacta también conserva ese control. La carga muestra estado textual en una superficie con proporción (16:10), y la ampliación permanece deshabilitada hasta disponer de imagen. El contenedor de ausencia o error usa borde discontinuo; no representa una relación entre acciones. No se inventa una escena que simule evidencia.

«Ampliar imagen» abre un diálogo nativo con encabezado blanco, borde y radio de tarjeta sobre fondo oscurecido. La imagen se muestra a tamaño original, sin ajuste que reduzca su tamaño dentro del visor. La región desplazable puede recibir foco; el botón de cierre recibe el foco al abrir. Se cierra con ese botón, Escape o pulsación sobre el fondo del diálogo, conservando el comportamiento de foco del diálogo nativo.

El motivo usa fondo salvia. Decisiones, alternativas y condiciones para detenerse permanecen dentro de la explicación de la acción. El contenido de la conversación se consulta en un desplegable secundario, con autor y tiempo. Las instrucciones o motivos todavía ausentes se señalan como pendientes de confirmar; la presentación no acredita validación del experto.

En el diagrama, cada acción muestra primero título, después tipo y tiempo, miniatura real o estado de imagen pendiente y un extracto del motivo. Inicio y fin delimitan el procedimiento. Las conexiones comparten trazo continuo; las variantes antiguas de preguntas, pantallas y reglas separadas no forman parte del repertorio actual de nodos. El inspector presenta el título y la misma explicación operativa, con conversación desplegable.

React Flow conserva desplazamiento, zoom, minimapa y encuadre. Una selección por puntero o teclado actualiza el inspector; Enter selecciona y las flechas mueven el nodo. El selector y anterior/siguiente centran inmediatamente la acción elegida. «Ver todo» recupera orientación. El movimiento de nodos es exploratorio, no una edición del procedimiento.

### Process classification

Nombre, departamento y tipo de tarea se editan en un formulario blanco con borde, radio de tarjeta y etiquetas visibles. El nombre ocupa el ancho completo; departamento y tipo comparten dos columnas que se apilan en móvil. Los campos admiten escritura y sugerencias nativas del catálogo, incluido Contabilidad, sin una identidad visual distinta para cada departamento. Guardar usa el botón principal; cancelar usa el secundario. El catálogo organiza el contenido y no redefine la paleta del producto.

### Dialogs and feedback

El diálogo blanco usa radio de escenario, relleno de (28px) en escritorio y (22px) en móvil, con fondo oscurecido y desplazamiento vertical interno si es necesario. El aviso flotante tiene fondo verde y texto blanco. Carga, error, vacío y recuperación utilizan mensajes explícitos. La animación de conexión gira en (1.1s); con preferencia de movimiento reducido se anulan animaciones y transiciones.

## Do's and Don'ts

### Do:

- **Do** conservar la relación entre superficie blanca, borde suave y fondo vegetal claro.
- **Do** usar verde oscuro para acciones principales y selección reconocible por más de una señal.
- **Do** conservar texto operativo legible, cifras tabulares y foco de teclado visible.
- **Do** colocar el título del paso antes de su tipo y posición, y mantener acción, propósito y razón juntos.
- **Do** mantener el significado del proceso de la biblioteca sintética cuando pase de columna a fila desplazable.
- **Do** identificar las escenas y sesiones sintéticas como ejemplos en los recorridos de demostración.

- **Do** mantener sincronizada la selección del mapa y su inspector al usar puntero, Enter o selector de pasos.
- **Do** mantener título operativo, captura y motivo juntos; dejar la conversación en el desplegable secundario de evidencia.

### Don't:

- **Don't** extender las sombras de diálogo a todas las tarjetas del espacio de trabajo.
- **Don't** usar solo un cambio de color para comunicar conexión, pausa, selección o variante.
- **Don't** convertir la microtipografía de las ilustraciones en texto operativo de nuevas pantallas.
- **Don't** añadir una fuente ornamental que rompa la jerarquía única de Manrope.
- **Don't** mostrar controles del cajón móvil en el escritorio ni dejar interactivo su contenido cuando esté cerrado.
- **Don't** representar una variante como un paso habitual sin contexto, etiqueta ni distinción de forma.
- **Don't** convertir mensajes del agente, saludos u observaciones aisladas en pasos de la guía ni sustituir capturas ausentes por escenas inventadas.

## Mi espacio: conversación individual

El botón de inicio lleva encima un indicador compacto con icono y texto: agente accesible, conexión activa, comprobación, error o estado sin confirmar. Debajo se muestra el alcance de la comprobación, su hora y «Volver a comprobar». Verde significa respuesta autenticada del agente o conversación confirmada, siempre diferenciadas con texto. La lectura del agente no se presenta como una reserva de cupo para una llamada. Los estados desconocidos y errores no conservan verde. El mismo componente acompaña la conversación; el inicio permanece deshabilitado sin acceso vigente. No se añaden tarjetas ni métricas.

La entrada senior queda reducida a un botón primario centrado: «Iniciar conversación con el agente», sin tarjetas de llamada del equipo, llamada simulada, eslogan ni sesiones recientes. Conserva Manrope, verde bosque y el fondo claro; botón de 56px de alto, texto de 14px y foco visible. En móvil conserva el menú en cajón y ajusta el texto sin ensanchar el documento.

## Extensión de conversación individual

Al pulsar el botón de Mi espacio se abre el formulario existente de ElevenLabs, con foco en el encabezado, consentimiento, alternativas de voz/texto, estado de conexión, pantalla compartida y transcripción. El inicio no abre dispositivos. La navegación principal conserva Mi espacio, Biblioteca, Guardadas y Mapas de procesos; las rutas históricas de agente y videollamada se normalizan a Mi espacio. La ayuda distingue la conversación real de los ejemplos de biblioteca.

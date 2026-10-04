---
name: "UserHelper"
description: "Un estudio de conocimiento: una voz, un espacio de trabajo y una entrada clara."
colors:
  workspace: "#080909"
  ink: "#eeeeeb"
  muted: "#a1a4a0"
  primary: "#dcfa92"
  primary-hover: "#c4e87b"
  paper: "#121412"
  raised: "#1b1d1a"
  line: "#2e302d"
  panel: "#171a15ed"
  field: "#10120f"
  field-border: "#52584b"
  control: "#f1f2eb"
  control-ink: "#141710"
  selected: "#2b3420"
  selected-ink: "#e4f5c6"
  error: "#ffb4a7"
  warning: "#eaca93"
  particle: "#e0ff95"
  particle-muted: "#a2ad88"
  map-process: "#1c2316"
  map-topic: "#303f22"
typography:
  display:
    fontFamily: "\"Manrope Variable\", Manrope, sans-serif"
    fontSize: "clamp(68px, min(10.7vw, calc((100svh - 560px) / 2)), 164px)"
    fontWeight: 550
    lineHeight: 1.07
    letterSpacing: "-0.04em"
  display-mobile:
    fontFamily: "\"Manrope Variable\", Manrope, sans-serif"
    fontSize: "clamp(38px, 10.8vw, 72px)"
    fontWeight: 550
    lineHeight: 1.07
    letterSpacing: "-0.04em"
  entry-title:
    fontFamily: "\"Manrope Variable\", Manrope, sans-serif"
    fontSize: "24px"
    fontWeight: 550
    letterSpacing: "-0.025em"
  workspace-title:
    fontFamily: "\"Manrope Variable\", Manrope, sans-serif"
    fontSize: "clamp(52px, 6.3vw, 90px)"
    fontWeight: 500
    lineHeight: 1.02
    letterSpacing: "-0.04em"
  body:
    fontFamily: "\"Manrope Variable\", Manrope, sans-serif"
    fontSize: "13px"
    fontWeight: 450
    lineHeight: 1.7
  field:
    fontFamily: "\"Manrope Variable\", Manrope, sans-serif"
    fontSize: "16px"
    fontWeight: 450
  label:
    fontFamily: "\"Manrope Variable\", Manrope, sans-serif"
    fontSize: "12px"
    fontWeight: 500
  note:
    fontFamily: "\"Manrope Variable\", Manrope, sans-serif"
    fontSize: "10px"
    fontWeight: 450
rounded:
  control: "7px"
  navigation: "9px"
  workspace-panel: "12px"
  entry-panel: "14px"
spacing:
  tight: "8px"
  control-gap: "10px"
  group: "16px"
  panel: "22px"
  mobile-panel: "24px"
  section: "40px"
components:
  entry-button:
    backgroundColor: "{colors.control}"
    textColor: "{colors.control-ink}"
    rounded: "{rounded.control}"
    height: "44px"
    padding: "10px 16px"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.control-ink}"
    rounded: "8px"
  entry-input:
    backgroundColor: "{colors.field}"
    textColor: "{colors.ink}"
    typography: "{typography.field}"
    rounded: "{rounded.control}"
    height: "44px"
  entry-panel:
    backgroundColor: "{colors.panel}"
    rounded: "{rounded.entry-panel}"
    padding: "22px"
    width: "420px"
---

# Design System: UserHelper

## Overview

**Creative North Star: "El conocimiento tiene voz"**

Una entrada expresiva abre un espacio de trabajo concentrado. La referencia elegida por el usuario es Gradium: escenario negro, sans de gran escala, acentos lima y partículas detrás de controles compactos. UserHelper conserva nombre, contenido y comportamiento propios. Esta dirección sustituye el sistema claro anterior; no utiliza assets ni tipografías propietarias de Gradium.

**Key Characteristics:**
- Tipografía grande que enmarca la acción sin taparla.
- Superficies negras con bordes finos y acento lima.
- Una cinta de partículas original, decorativa y controlable.
- Estados y permisos expresados con honestidad.

Fuente efectiva: `src/studio.css`, importada después de los estilos base. Contrato: primer comentario del body de `index.html`, seed `13a21a80`, dirección fijada por el usuario. La entrada es de demostración; no autentica cuentas.

## Colors

Los tokens superiores describen la paleta efectiva. `--green` conserva su nombre por compatibilidad y ahora corresponde al lima `#dcfa92`; `--green-deep` es `#c8ea78`. Los controles de entrada son blancos, las acciones del espacio son lima y los errores usan coral. Superficies y textos secundarios de la aplicación pueden llevar un matiz oliva. La familia de mapas distingue nodos de proceso, temas y decisiones.

**The Accent Rule.** Reservar lima para selección, foco, acción y estado positivo verdadero; nunca usarlo para simular conexión.

Las ilustraciones sintéticas heredadas conservan lienzos claros y tinta oscura dentro de sus marcos. No aplicar el foreground claro a los diagramas de ejemplo. Capturas reales de procesos mantienen sus colores originales.

## Typography

Manrope Variable se sirve desde el paquete existente. El titular del login usa peso 550 y tracking -0.04em. En escritorio su escala depende también de la altura: `clamp(68px, min(10.7vw, calc((100svh - 560px) / 2)), 164px)`. El espacio reservado arriba y abajo del formulario equivale al alto de una línea más 16 px. Así se leen completas ambas líneas en portátiles bajos.

En móvil el titular fluye antes del formulario, con `clamp(38px, 10.8vw, 72px)`. El formulario usa entradas de 16 px, etiquetas de 12 px y notas de 10 px. La interfaz operativa mantiene escalas funcionales de 12–16 px y títulos de sección existentes.

## Layout

Escritorio: cabecera discreta, titular a todo lo ancho, formulario central de máximo 420 px y pie breve. A 700 px o menos, la entrada pasa a una columna con 20 px laterales. El formulario aumenta su padding a 24 px y controles a 48 px. La aplicación conserva su sidebar de 232 px, navegación móvil y rutas existentes. El menú permite scroll; a alturas de 800 px o menores se retira su mensaje decorativo para que la salida siga accesible.

Mi espacio conserva una única acción para comenzar la conversación y un estado real del agente. Biblioteca, guardadas, mapas, tutor y ejemplos mantienen sus recorridos. La entrada y el perfil no autorizan APIs.

## Elevation & Depth

Los paneles se distinguen con borde fino, sin sombra decorativa. La entrada usa fondo `#171a15ed` y blur de 18 px para separar la cinta animada del formulario. El escenario no usa imágenes remotas ni dependencias de shaders.

**The Motion Rule.** La cinta es el único motivo animado nuevo; no añadir entradas repetidas o movimiento a cada control.

`VoiceField` dibuja geometría paramétrica en Canvas 2D, con 5200 puntos en la entrada y 2500 en Mi espacio. Resolución acotada a 2× y cuadros limitados aproximadamente a 30 fps. Ofrece pausa, detiene cuadros con la pestaña oculta y presenta una composición estática con movimiento reducido. Los observadores y cuadros se limpian al desmontar.

## Shapes

Controles de entrada de 7 px, navegación heredada de 9 px, panel operativo de 12 px y panel de entrada de 14 px. El botón circular de pausa mide 44 px. Conservar Lucide y el símbolo UserHelper; el logotipo usa trazo lima sin baldosa de fondo.

## Components

- **Entrada:** nombre, radios Compartir/Aprender y una acción «Entrar a mi espacio». Debe mantenerse visible «Acceso de demostración · Sin cuenta ni contraseña». No añadir botones OAuth o contraseñas sin integración real.
- **Formulario:** foco lima de 2 px, labels explícitos, error para nombres vacíos y límite de 60 caracteres. La selección de radio se reconoce por borde y superficie, además del texto.
- **Navegación:** nombre introducido, rol seleccionable y «Salir de la demo». El nombre se guarda en sessionStorage como preferencia de la pestaña y se renderiza como texto.
- **Conversación:** estados neutros, positivos, advertencia y error separados; disponibilidad real no equivale a sesión conectada. Se conservan consentimiento y controles de voz/texto/pantalla.
- **Mapas y biblioteca:** superficies oscuras y textos legibles, sin cambiar orden, filtros ni reglas de los datos. El preview 5183 mostró rechazo de origen; los diagramas con datos privados no se validaron visualmente desde este puerto.
- **Sistema:** selección de texto lima con tinta oscura, caret lima, scrollbar oscuro y foco visible coherente.

## Do's and Don'ts

### Do:
- Conservar la legibilidad completa del titular alrededor del formulario.
- Mantener visible el carácter de demostración y los estados reales.
- Respetar movimiento reducido y ofrecer pausa del motivo animado.
- Preservar consentimiento, controles y guardas existentes de las APIs.

### Don't:
- Confundir la preferencia de entrada con autenticación o autorización.
- Cubrir letras o controles con la composición decorativa.
- Copiar marca o assets de Gradium.
- Cambiar colores de capturas reales para adaptarlas al tema.

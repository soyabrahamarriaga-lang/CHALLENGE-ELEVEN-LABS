# Entrada y estudio visual de UserHelper

La rama `codex/login-frontend` adapta la referencia indicada por el usuario, [Gradium](https://gradium.ai/), a la identidad de UserHelper: escenario negro, tipografía Manrope de gran tamaño, controles blancos/lima y una cinta original de partículas Canvas. No se reutilizan logotipos, fuentes propietarias ni assets de Gradium.

## Recorrido

1. La primera visita presenta nombre y dos opciones: Compartir (senior) o Aprender (intern).
2. «Entrar a mi espacio» abre la interfaz existente. Se conserva un enlace profundo si pertenece al perfil elegido.
3. Nombre y perfil inicial se guardan en `sessionStorage`, bajo una clave versionada, exclusivamente como preferencias del prototipo. Una recarga conserva la entrada en esa pestaña. Si el navegador bloquea almacenamiento, el recorrido continúa en memoria.
4. «Salir de la demo» elimina la preferencia, desmonta la interfaz y regresa a la entrada. No modifica los marcadores existentes.

**No es autenticación.** No hay cuenta, contraseña, registro ni autorización nueva de APIs. El nombre no se envía como identidad al backend. La interfaz informa «Acceso de demostración · Sin cuenta ni contraseña». Los permisos y códigos del backend, la comprobación real del agente y el consentimiento para voz/texto/pantalla conservan sus contratos. Véase ADR-login-studio.md.

## Implementación visual

`src/studio.css`, importado al final del punto de entrada principal, mantiene las reglas estructurales existentes y sustituye superficies, texto y controles. Los selectores de la aplicación tienen prioridad frente a CSS cargado al abrir módulos diferidos. Algunas ilustraciones de ejemplos conservan su lienzo claro y colores propios.

La cinta de partículas es geometría original, sin audio, micrófono ni red. Usa Canvas 2D, densidad acotada y resolución máxima 2×. Se detiene al ocultar la pestaña y respeta `prefers-reduced-motion`; también tiene pausa manual. Sus observadores y cuadros se limpian al desmontar.

## Verificación local (2026-10-04)

- `npm test`: 23 archivos y 156 pruebas aprobadas, incluidas restauración/validación de la preferencia y conservación de enlaces profundos.
- `python3 -m unittest discover -s tests -v`: 28 pruebas aprobadas.
- Revisión visual independiente: `ship`; solapamiento del titular corregido y confirmado a 1280×800 y 1280×720; móvil sin regresiones.
- `npm run build`: correcto; persiste el contrato HTML con clave `13a21a80`. El chunk existente del proveedor de conversación sigue produciendo aviso de tamaño.
- Navegador: entrada senior, error de nombre vacío con espacios, cambio intern, persistencia tras recarga, salida y recarga sin reentrada, navegación móvil y pausa de animación.
- Revisión visual: escritorio 1280×720 y móvil 390×844; sin desbordamiento horizontal del login móvil. Menú con scroll en ventanas bajas; salida visible a 720 px.
- Se abrió la preparación de conversación y se observó la disponibilidad real; no se inició llamada ni se activaron micrófono o pantalla durante esta revisión.
- Biblioteca/Mapas privados: el backend ya activo en 3001 rechaza solicitudes desde el nuevo preview `http://127.0.0.1:5183` por origen. La recuperación y el mensaje de error son visibles. No se modificó la lista de orígenes ni se ensanchó acceso; los datos privados y diagramas con datos no se verificaron visualmente en este preview.

Para un entorno completo, ejecutar frontend y backend con el mismo `APP_ORIGIN` según `.env.example` y las instrucciones existentes. No reutilizar esta entrada de demostración como protección al publicar datos privados.

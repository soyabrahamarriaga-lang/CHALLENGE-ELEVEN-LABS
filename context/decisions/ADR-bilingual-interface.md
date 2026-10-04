# ADR: Interfaz bilingüe e idioma verificado de cada conversación

- Estado: aceptado para implementación; activación remota del inglés pendiente.
- Fecha: 2026-10-04
- Autor: Codex; operador: Abraham (`soyabrahamarriaga-lang`).
- Relacionados: ADR-mi-espacio-agente, ADR-intern-tutor, ADR-agent-background-voices, ADR-process-removal.

## Contexto

El usuario pidió integrar la eliminación de procesos en main y abrir otra rama con toda la interfaz intercambiable entre español e inglés, además de instrucciones para los agentes. PR #24 quedó integrado antes de crear `codex/bilingual-interface` desde main. Ambos agentes reales todavía tienen español como único idioma y deshabilitado el override de idioma.

## Decisión

1. Usar i18next/react-i18next con catálogos versionados ES/EN y selector global persistido bajo `userhelper.language.v1`. Español es el valor inicial. Un cambio de idioma actualiza texto, fechas, título y `html.lang`, sin cambiar claves React, rutas, IDs, permisos ni desmontar sesiones.
2. Localizar textos de interfaz, catálogo fijo y ejemplos ficticios. Conservar evidencia y contenido de procesos reales en su idioma original. No traducir la bóveda por un servicio externo. Las búsquedas reconocen etiquetas localizadas sin cambiar filtros canónicos.
3. Extender el reporte de disponibilidad con `defaultLanguage: es|en|null` y `selectableLanguages: (es|en)[]`, obtenidos por GET del agente. Los idiomas adicionales requieren tanto preset configurado como permiso de override. El estado de acceso y su caducidad conservan el contrato anterior. No afirmar que el inglés está listo por el mero hecho de seleccionar English.
4. Capturar el idioma antes de autorizar una llamada. Enviar solo `overrides.agent.language` cuando difiere del principal, tanto en WebRTC como WebSocket. Rechazar otros códigos en el iframe. Cambiar la interfaz durante una sesión informa que el idioma nuevo se aplicará a la siguiente llamada; no corta la sesión.
5. Publicar instrucciones de configuración y una plantilla del observador que respeta el idioma de sesión. No hacer PATCH a la configuración remota en esta tarea: el usuario solicitó instrucciones. Mantener controles de ruido/skip_turn, conocimiento y herramientas.

## Alternativas

- Duplicar agentes por idioma: añade gestión de prompts, base de conocimiento e IDs sin necesidad. Se conserva un agente por función con presets de idioma.
- Reemplazar texto en el DOM: pierde control sobre accesibilidad, contenido original y actualizaciones de React. Se usan traducciones explícitas en renderizado.
- Sobrescribir prompt/saludo/voz desde el navegador: requeriría permisos adicionales e introduciría divergencias. El cliente solo elige un idioma permitido y el proveedor aplica su preset.
- Traducir automáticamente registros existentes: cambia evidencia y agrega transmisión/coste. Se conserva el original y se explica en la interfaz inglesa.

## Consecuencias y límites

La UI inglesa puede utilizarse sin configurar el inglés remoto, pero los botones de inicio para ese idioma quedan deshabilitados hasta verificar soporte real. El reporte comprueba configuración y acceso; no garantiza una conversación exitosa ni detecta reglas contradictorias dentro del prompt. Se requiere probar ambos perfiles por voz y texto después de guardar la configuración. La plantilla versionada no despliega cambios por sí sola. El grafo y la extracción conservan su catálogo, códigos y reglas existentes; esta tarea no agrega inferencia semántica multilingüe.

## Ontología

No agrega entidades ni cambia identidad o relaciones del conocimiento. El idioma es preferencia de presentación y parámetro de una sesión nueva; las fuentes y las clasificaciones originales siguen siendo evidencia canónica.

## Verificación

Pruebas automáticas del catálogo, preferencia, preservación, filtros, reporte de idiomas y SDK; build de producción y pruebas del harness. Ver bitácora del aporte para resultados y pruebas de navegador observados.

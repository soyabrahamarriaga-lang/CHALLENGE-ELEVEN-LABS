# ADR: Eliminación persistente de procesos desde la plataforma

- Fecha: 2026-10-04
- Estado: aceptada
- Autor: Codex; operador: soyabrahamarriaga-lang
- Relación: amplía ADR-0011 y el contrato de Biblioteca/Mapas; concreta parcialmente TRUST-01.

## Problema y evidencia
El usuario pidió poder eliminar procesos desde la plataforma. Biblioteca, Guardadas y Mapas comparten identidades de conversación. Las notas alimentan al tutor y las conversaciones se importan periódicamente: ocultar una fila en el navegador o borrar solamente una nota permitiría reconstruirla.

## Alternativas
Borrar archivos originales y conversaciones de ElevenLabs excede el retiro desde la plataforma y destruye evidencia. Un filtro solo en localStorage no afecta otras vistas ni al tutor. Se elige una eliminación lógica persistente, con alcance explícito antes de confirmar.

## Decisión y razón
Biblioteca, Guardadas y el detalle ofrecen Eliminar proceso. Un diálogo nativo identifica el proceso, explica el alcance compartido y enfoca Cancelar. La acción requiere confirmación; durante la petición se bloquean envíos duplicados. El resultado retira inmediatamente el proceso, sus marcadores locales y relaciones de la colección compartida. Si se elimina desde el detalle, vuelve a Biblioteca.

`POST /api/vault/processes/:id/delete`, JSON `{confirm:true}`, conserva el guard de origen exacto del backend local y valida el ID. El marcador atómico privado `Retirados/<id>.json` excluye el proceso de listados, detalle, imágenes, edición, eventos, notas, importaciones y compilación del tutor. La operación es idempotente. Se regeneran índices y grafo. Las fuentes, capturas, notas de Obsidian, Canvas manuales, historial Git y las conversaciones originales del proveedor permanecen; no se afirma borrado de datos personales. Restauración administrativa: retirar únicamente el marcador del ID correcto y regenerar/sincronizar; todavía no hay papelera en UI.

Los métodos de bóveda y la sincronización del tutor comparten una cola por raíz dentro del mismo backend, evitando que una importación o reconstrucción en curso revierta el retiro. Se debe ejecutar una sola instancia de backend/sincronización por bóveda; varios puertos pueden compartir ese proceso. No es un bloqueo distribuido ni protege frente a escritores antiguos o ediciones manuales externas.

Después del retiro local se actualiza la base del tutor: se excluyen todas las notas con el mismo ID y, si no queda ningún proceso, se desadjunta el documento administrado por UserHelper sin tocar otros documentos ni el prompt/modelo. El resultado se relee. No modifica conversaciones del tutor ya abiertas. Una falla remota devuelve éxito local con `tutor:pending`, aviso persistente y reintento; la sincronización periódica también puede recuperarlo. Una falla en los índices devuelve `indexes:pending`. Sin credenciales del tutor devuelve `disabled` y se informa que el material remoto no se actualizó.

## Consecuencias
Los perfiles Senior/Intern de la demo no son cuentas ni permisos; el retiro afecta a todos los perfiles de esa instalación. El guard de origen sigue sin sustituir autenticación para una instalación pública. No se purgan originales, copias manuales, respaldos ni historial del proveedor. El retiro de evidencia parcial y la purga completa siguen pendientes.

## Impacto ontológico
La colección contiene únicamente procesos activos. El proceso retirado conserva evidencia fuera de la colección y deja de alimentar la compilación del tutor. Se añade esta invariante y se acota la pregunta pendiente sobre retiro parcial/purga. No se crean entidades de conocimiento nuevas ni se valida un Work Map.

## Verificación
Pruebas con bóvedas temporales: persistencia tras recrear backend, independencia de IDs con sufijos comunes, exclusión del tutor, último proceso, errores parciales, reintento, accesos y escrituras posteriores, importación concurrente, origen/JSON/ID/confirmación y enlaces simbólicos. Verificación de navegador con procesos ficticios en un servidor separado, sin eliminar procesos del usuario. Resultados observados en la entrada del aporte.

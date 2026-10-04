# Procedimientos visuales en UserHelper y Obsidian

Cada proceso presenta **acciones de trabajo con imagen, instrucciones, decisión y motivo del experto**. La conversación es evidencia secundaria. El resultado sigue siendo un procedimiento por revisar, no conocimiento confirmado. Extracción: [ADR-0017](../context/decisions/ADR-0017.md), que sustituye la extracción de ADR-0016.

## Una colección, dos vistas

**Biblioteca** agrupa por departamento y tipo de tarea, y ordena alfabéticamente dentro de cada grupo. **Mapas de procesos** presenta exactamente los mismos IDs como un grafo proceso ↔ tema/actividad. Ambos usan una única lectura de `POST /api/vault/processes`, comparten búsqueda/filtros y se actualizan juntos al renombrar o reclasificar. No son dos bases de datos. **Guardadas** filtra esta colección por marcadores de este navegador. Los ejemplos anteriores siguen disponibles en «Explorar la biblioteca demo» y conservan su almacenamiento separado.

El mapa une procesos con menciones explícitas a temas contables o con el mismo código de actividad del catálogo. Se analizan título de acción, instrucciones, decisión, motivo y límites documentados; no se utiliza la conversación bruta, el agente, el nombre del proceso ni el departamento como prueba de una relación. Cada conexión conserva paso, campo, extracto e IDs de evidencia. Selecciona nodo o conexión para consultar el sustento; el selector del panel ofrece la misma exploración con teclado o en móvil.

Solo aparecen nodos de tema/actividad compartidos por al menos dos procesos **dentro de los filtros actuales**. Todos los procesos permanecen en el mapa, incluso los aislados o sin tarea identificada. Los enlaces no llevan flechas: una coincidencia no acredita causalidad, secuencia, equivalencia de políticas ni validación experta. La detección usa un vocabulario explícito de Contabilidad y códigos del catálogo; no es búsqueda semántica general y puede omitir sinónimos o temas fuera de ese vocabulario. No llama a un proveedor de IA ni consume nuevos tokens.

Decisión de navegación y colección: [ADR-0018](../context/decisions/ADR-0018.md), que sustituye esa parte de ADR-0017. La extracción y la guía por acciones de ADR-0017 siguen vigentes.

## Usar el procedimiento

Abre **Biblioteca**, busca por nombre/tema o filtra por departamento y tipo. Selecciona un proceso. La **Guía visual** muestra cada acción con su captura e instrucciones. «Por qué se hace así» conserva el motivo expresado; si falta, se señala. «Consultar evidencia» despliega las citas que sustentan ese paso. **Diagrama** ofrece zoom, desplazamiento, selector y navegación de acciones. Los movimientos de nodos en UserHelper son temporales.

**Editar nombre y categoría** guarda un título concreto como «Rechazar una orden de compra» y permite escribir departamento/tipo nuevos. La propuesta inicial es Contabilidad con seis familias: [catálogo y reglas candidatas](ACCOUNTING-CATALOG.md). Las sugerencias globales se editan en `catalogo-procesos.json` de la bóveda; el formulario corrige cada proceso, no administra globalmente el catálogo remoto del agente.

**Abrir en Obsidian** abre `flujo.canvas`: cada fila reúne acción, imagen y motivo. La bóveda debe estar abierta en esa computadora. **Descargar Canvas** exporta el borrador actual; sus imágenes y enlaces requieren las notas de la misma bóveda, no quedan incrustados en el archivo. Las notas manuales y los Canvas editados se conservan y la app avisa cuando muestra una extracción más reciente.

## Archivos privados

```
catalogo-procesos.json
Procesos/
  Indice-generado.md
  Relaciones-generadas.md                 # sustento y enlaces de las coincidencias
  Mapa-de-conocimiento-generado.canvas    # grafo de la colección completa
  mapa-conocimiento-estado.json           # huella para preservar ediciones
  contabilidad/<tipo-de-tarea>/<nombre-del-proceso>--<conversation_id>.md
Sesiones/<fecha>-<conversation_id>/
  transcripcion.md          # fuente; se conserva
  eventos.md                # observaciones; se conservan
  extraccion-proceso.json   # análisis estructurado del proveedor, si existe
  proceso-metadata.json     # correcciones de nombre/departamento/tipo
  capturas.json             # índice de imágenes originales
  capturas/<frame-id>.jpg   # también PNG/WebP; no URLs firmadas
  process-flow.json         # contrato v2: acciones y evidencia
  flujo.canvas             # acción + imagen + motivo, interactivo
  evidencia-flujo.md        # citas y momentos con referencias estables
  mapa-generado.md          # guía de la ejecución
  catalogo-enlace.json      # huella de la nota clasificada
  work-map.md               # notas manuales; no se reemplazan
```

El nombre legible identifica el proceso; el ID distingue ejecuciones. Al renombrar, solo se retira la nota generada anterior si sigue intacta. Fuentes y notas modificadas se conservan. `Indice-generado.md` se actualiza al listar/reconstruir procesos. El grafo global y `Relaciones-generadas.md` se regeneran junto al índice usando la colección completa (los filtros de UserHelper son temporales). Abre el Canvas global desde Obsidian o desde el enlace en la nota de relaciones. Si editaste ese Canvas, se conserva y la nueva derivación se guarda como `Mapa-de-conocimiento-actualizado.canvas`; esta copia actualizada es generada. Conserva notas propias fuera de los índices generados. No hay push automático de la bóveda a GitHub.

## Configuración y sesiones anteriores

Con `VAULT_PATH`, `ELEVENLABS_API_KEY` y `ELEVENLABS_AGENT_ID` locales:

```sh
npm install
npm run maps:configure                 # inspección, no cambia el agente
npm run maps:configure -- --apply      # configura Data collection y respalda el análisis previo
npm run maps:rebuild -- --reanalyze    # reanaliza sesiones en ElevenLabs y recupera imágenes
npm run maps:backfill                  # regenera solo desde los archivos locales
npm run demo
```

Configurar el agente modifica solo los campos de análisis posterior de UserHelper. El respaldo va a `.userhelper-backups/` dentro de la bóveda privada. El reanálisis usa la cuenta existente y puede consumir créditos; no es necesario ejecutarlo en cada arranque. `maps:rebuild` sin `--reanalyze` recupera el análisis e imágenes ya disponibles. Los comandos imprimen conteos y errores sin claves ni conversaciones. Reinicia el backend al actualizar el código.

Las importaciones nuevas por app, sincronizador y webhook guardan el análisis que entregue el proveedor y las imágenes disponibles. El sincronizador omite conversaciones ya guardadas; para actualizar análisis posteriores usa la reconstrucción explícita. Si el análisis no está listo o falla, quedan acciones locales limitadas y un aviso. El original no desaparece.

## Imágenes y evidencia

Compartir pantalla en la conversación archiva capturas de cambios estabilizados en la bóveda; no requiere que el OCR encuentre texto. El aviso junto al control informa ese almacenamiento. Los envíos de imágenes al agente mantienen su propio máximo de diez capturas en pausas. El archivo local admite hasta 300 imágenes, 3 MiB cada una. Al terminar se espera el guardado en curso antes de importar la conversación.

Las capturas originales del proveedor se recuperan sin enviar la API key al almacenamiento. Se admiten JPEG, PNG y WebP por firma, no SVG, con host HTTPS permitido y descarga limitada. UserHelper las lee mediante POST de origen exacto y muestra objetos temporales que revoca al salir.

La imagen más próxima a cada acción, dentro de ±30 segundos, se propone como contexto. El rótulo «momento cercano» exige confirmar la asociación; no prueba que la imagen muestre exactamente ese paso. Fuera de esa ventana aparece **Imagen pendiente**. No se dibujan pantallas ficticias para sustituir capturas perdidas.

## Contrato local

Todas las rutas de procesos usan POST JSON y el origen exacto de `APP_ORIGIN`:

| Ruta | Cuerpo / resultado |
|---|---|
| `/api/vault/processes/:id/delete` | `{confirm:true}` → `{id, deleted:true, tutor:updated/pending/disabled, indexes:updated/pending}` |
| `/api/vault/processes` | `{}` → lista, categorías y fallas parciales |
| `/api/vault/sessions/:id/flow` | `{}` → procedimiento, Canvas y URI de Obsidian |
| `/api/vault/sessions/:id/metadata` | `{name, department, taskType}` → guarda y regenera |
| `/api/vault/sessions/:id/captures` | `{data: base64, at: segundos}` → captura privada |
| `/api/vault/sessions/:id/captures/:captureId` | `{}` → imagen binaria con `no-store` |
| `/api/vault/conversations/:id/import` | `{}` → transcripción, `flowStatus` y resultado de recuperación |

El origen exacto protege el servicio local frente a páginas externas; no sustituye autenticación por persona para desplegarlo públicamente.

## Eliminar un proceso

En Biblioteca o Guardadas, pulsa la papelera del proceso; en su detalle, pulsa **Eliminar proceso**. Confirma el nombre. Desaparece de la colección compartida y sus relaciones, incluso después de recargar. El tutor actualiza su material para conversaciones nuevas. Un fallo remoto deja el proceso eliminado localmente y muestra un aviso con **Reintentar actualización**; sin tutor configurado el aviso lo indica. El proceso no vuelve a importarse automáticamente.

El retiro es lógico: `Retirados/<id>.json` conserva el ID/fecha y bloquea listados, lecturas y escrituras posteriores. No borra originales en Obsidian/ElevenLabs, notas/Canvas manuales, historial Git ni conversaciones ya iniciadas. No hay papelera visible; restaurar administrativamente requiere retirar ese marcador y regenerar los procesos y el material del tutor. Guarda también los marcadores al sincronizar la bóveda privada.

Ejecuta **un backend actualizado por bóveda**: una instancia antigua puede publicar material del tutor sin respetar los retiros. El backend serializa importaciones, índices y actualización del tutor dentro de su proceso. Ver [ADR de eliminación](../context/decisions/ADR-process-removal.md).

## Límites del borrador

- Hasta 40 acciones agrupadas; saludos, preguntas del agente y comentarios técnicos no se convierten en pasos.
- Cada acción requiere una cita de la persona; cada motivo necesita cita propia, incluso de un turno posterior. Validar coincidencia textual no demuestra que toda la paráfrasis del modelo sea correcta.
- Las alternativas solo se conservan si la cita contiene ambas rutas. Se explican dentro de la decisión; el diagrama conecta las acciones documentadas en secuencia, sin dibujar caminos inventados.
- Un registro sin ejecución no se presenta como procedimiento. La transcripción sigue disponible.
- El formulario edita nombre/clasificación; editar contenido de pasos o confirmar asociaciones de imágenes en la app queda pendiente. Se puede trabajar manualmente en Obsidian, sin sincronización de esas ediciones hacia UserHelper.
- Una conversación sigue siendo una unidad de mapa. No se divide automáticamente en varios procesos.
- No implementa reglas fiscales, pagos, aprobación de OC, validación SAT, debrief, teach-back ni tutor del challenge.
- Se pueden eliminar procesos de la plataforma. La redacción automática, el retiro de evidencia parcial y la purga de originales/copias permanecen pendientes.

Fuentes: [Data collection de ElevenLabs](https://elevenlabs.io/docs/eleven-agents/customization/agent-analysis/data-collection), [reanálisis](https://elevenlabs.io/docs/eleven-agents/api-reference/conversations/analysis/run-analysis), [JSON Canvas 1.0](https://jsoncanvas.org/spec/1.0/), [React Flow](https://reactflow.dev/learn).

# Mapas de procesos: UserHelper y Obsidian

Cada conversación archivada en la bóveda privada genera un **borrador de diagrama**, con pasos narrados, posibles decisiones/reglas y evidencia atribuida. No hace falta otra clave ni otro servicio de IA. Decisión: [ADR-0016](../context/decisions/ADR-0016.md).

## Usar el mapa

En UserHelper abre **Mapas de procesos**, elige una sesión y selecciona un nodo. El panel muestra texto, autor, minuto y observaciones de pantalla próximas. Usa zoom, desplazamiento, vista general, el selector de pasos o las flechas anterior/siguiente. La pantalla se adapta a móvil y los controles se pueden operar con teclado. Los movimientos de nodos se reinician al salir.

**Abrir en Obsidian** abre `flujo.canvas` de la misma sesión; la bóveda debe haberse abierto antes en esa computadora. **Descargar Canvas** entrega una copia del borrador actual. Los enlaces de evidencia requieren las notas de esa misma bóveda. En Obsidian puedes mover y editar el Canvas: sus cambios se detectan y conservan, pero no se transfieren a UserHelper. La aplicación lo indica y permite descargar el nuevo borrador sin reemplazar tu edición.

Al terminar una conversación, el aviso de transcripción ofrece **Ver diagrama del proceso**. Las conversaciones externas que importe el sincronizador también generan diagrama. No confundir la biblioteca de ejemplos sintéticos con estos procesos privados.

## Archivos privados por sesión

```
Sesiones/<fecha>-<conversation_id>/
  transcripcion.md        # fuente original; se conserva
  eventos.md              # fuente original; se conserva
  process-flow.json       # grafo y evidencia derivados
  flujo.canvas            # Canvas de Obsidian
  evidencia-flujo.md      # referencias estables a citas y momentos
  mapa-generado.md        # recorrido legible y enlaces
  work-map.md             # notas manuales existentes; no se sobrescriben
```

El índice usa referencias derivadas del contenido para que insertar un turno anterior no cambie el destino de otras citas. Los archivos generados se escriben de forma atómica y las peticiones simultáneas al mismo proceso se serializan dentro del backend. La huella de fuentes determina si es necesario regenerar. No se versionan estos datos en el repositorio público.

## Sesiones anteriores y ejecución

Con `VAULT_PATH` configurado en `.env`:

```sh
npm install
npm run maps:backfill
npm run demo
```

El comando de mapas procesa lo que ya existe localmente, sin llamar a ElevenLabs, y solo imprime conteos. La lista de procesos también repara mapas pendientes al abrirse. Reinicia el backend al actualizar código. Si ejecutas servidores manualmente, usa `npm run dev:token` y `npm run dev`.

API local, bajo el mismo control de origen/JSON de la bóveda:

- `POST /api/vault/processes`, cuerpo `{}`: lista procesos y fallas parciales, generando mapas faltantes.
- `POST /api/vault/sessions/:id/flow`, cuerpo `{}`: grafo con evidencia, Canvas y enlace de Obsidian; 404 si no existe transcripción.
- `POST /api/vault/conversations/:id/import`: conserva la respuesta previa y añade `flowStatus` (`ready` o `failed`). Un fallo de derivación no elimina la transcripción.

No hay publicación ni sincronización automática de notas hacia GitHub. El equipo puede sincronizar su bóveda privada con su flujo existente. No copiar notas, IDs privados ni capturas reales a un issue o PR público.

## Qué significa el borrador

- Las líneas discontinuas representan orden temporal; no demuestran que un paso cause el siguiente.
- Las ramas sólidas se generan solo ante alternativas explícitas como «Si supera 30 días, rechazo; si no, continúo». No se inventa el camino que falta.
- La clasificación de decisiones/reglas usa patrones de texto, no comprensión semántica general. Puede fallar ante negaciones, otras expresiones o una transcripción errónea. Se etiqueta **por revisar**.
- Las razones solo se atribuyen a la persona cuando aparecen expresadas con conectores como «porque». El agente no valida las razones por mencionarlas.
- OCR cercano (±20 segundos) acompaña el paso como contexto; no acredita el motivo. OCR repetido se agrupa por ventanas de 15 segundos fuera de pasos narrados. Los eventos sin tiempo relativo permanecen fuera de la secuencia.
- La vista incluye hasta 180 momentos seleccionados y conserva toda la evidencia en sus notas. No sustituye la transcripción.
- Una conversación es una unidad de mapa. Dividir automáticamente una conversación en varios procesos, editar reglas desde UserHelper y sincronizar ediciones de Obsidian son ampliaciones futuras.
- El estado sigue siendo borrador: no acredita debrief, teach-back confirmado, Work Map validado ni Teach del challenge. Retirar una fuente requiere revisar también las copias derivadas y los Canvas editados.

Fuentes de formato e interfaz: [JSON Canvas 1.0](https://jsoncanvas.org/spec/1.0/), [React Flow](https://reactflow.dev/learn), [URI de Obsidian](https://obsidian.md/help/uri).

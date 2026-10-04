# ADR: disponibilidad verificada y conexión real del agente

- Fecha: 2026-10-03 (America/Mexico_City)
- Estado: aceptada; amplía ADR-0010 y ADR-mi-espacio-agente.
- Actor: Codex; operador: soyabrahamarriaga-lang.
- Evidencia: el usuario pidió ver en Mi espacio si el agente está disponible o conectado, de forma real y fiable.

## Decisión

El estado antiguo /api/elevenlabs/status solo comprueba variables locales y se conserva para compatibilidad. La UI utiliza /api/elevenlabs/availability: consulta en modo lectura el agente configurado en ElevenLabs y comprueba su identidad, su configuración y que no esté archivado. No solicita tokens WebRTC ni URLs firmadas; no reserva sesiones ni solicita dispositivos. Los accesos temporales se generan únicamente cuando la persona inicia explícitamente una conversación.

El backend devuelve únicamente disponibilidad, modos habilitados por la configuración remota, causas públicas, hora de comprobación y vigencia restante. La clave, prompts, tokens y URLs firmadas no se devuelven en este informe. Compartir una comprobación en curso y cachear 15 segundos evita peticiones duplicadas; la vigencia máxima es de 30 segundos. Respuestas no-store, bloqueo de origen ajeno y timeouts de proveedor.

Mi espacio comprueba al entrar, cada 20 segundos mientras la pestaña está visible, al volver a ella y al recuperar internet. Permite comprobar manualmente, muestra la hora y deshabilita los modos sin verificación vigente. Una respuesta tardía no puede renovar artificialmente la vigencia; se descuenta el tiempo de petición. Una desconexión de navegador invalida consultas pendientes, cierra la sesión local y evita que respuestas antiguas restauren un verde falso.

Agente accesible significa que ElevenLabs respondió a una lectura autenticada del agente en la comprobación indicada. El texto visible aclara que la conexión se confirma al iniciar. No se presenta como garantía de capacidad ni de autorización de una llamada. Conectado solo aparece después del evento real onConnect del SDK con un identificador de conversación no vacío. Preparando, conectando, desconectado, caducado, sin configurar, sin internet y disponibilidad parcial se distinguen. No poder comprobar el servicio local se muestra como disponibilidad sin confirmar, no como una afirmación de que ElevenLabs esté caído.

## Límites

Una lectura correcta del agente no garantiza que la siguiente conversación llegue a establecerse: pueden cambiar capacidad, permisos, cuota o red; el micrófono también requiere permiso. No se anuncia una conversación activa ni éxito de audio a partir de esta consulta. La conexión y los errores definitivos siguen viniendo del SDK. No se modifican permisos, claves ni configuración remota.

## Ontología

Se conserva agent_connection y su distinción entre configuración, acceso verificado y conversación efectiva. No se modifica evidencia de procesos ni se considera esta verificación una captura de conocimiento.

## Evidencia

Consulta de lectura real al agente configurado: identidad válida, no archivado y modo de voz habilitado. Un primer ensayo que generaba accesos temporales detectó después un 429 de capacidad del workspace. Se descartó ese diseño: emitir tokens WebRTC puede reservar recursos y no es una comprobación inocua. La verificación final usa solo el endpoint de lectura del agente; una prueba automática impide volver a introducir solicitudes de credenciales en el sondeo. Prueba real por texto: el SDK confirmó conexión, llegó el saludo del agente y se terminó la conversación; el indicador volvió al estado sin conversación activa. No se activaron micrófono ni pantalla. Los resultados de pruebas automáticas, fallo del backend y recuperación se documentan en la nueva bitácora de esta tarea.

## Fuentes de los contratos

- [Get agent](https://elevenlabs.io/docs/eleven-agents/api-reference/agents/get)
- [Get conversation token](https://elevenlabs.io/docs/eleven-agents/api-reference/conversations/get-webrtc-token)
- [Get signed URL](https://elevenlabs.io/docs/eleven-agents/api-reference/conversations/get-signed-url)
- [JavaScript SDK](https://elevenlabs.io/docs/eleven-agents/libraries/java-script)

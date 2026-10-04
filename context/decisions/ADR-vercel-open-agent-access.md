# ADR: Inicio sin código en la demo pública de Vercel

- Fecha: 2026-10-04.
- Estado: aceptado por petición explícita del operador Abraham; autor: Codex.
- Sustituye exclusivamente la obligatoriedad del código y las cuatro variables de ADR-vercel-conversation-demo; extiende el mecanismo de ADR-0014 a la demo pública.

## Contexto y decisión

El usuario ya accedió al sitio público y pide quitar el código de acceso por ahora. El adaptador Vercel activa `AGENT_OPEN_ACCESS` por defecto; una configuración explícita distinta de `true` conserva la validación del código. El modo abierto funciona aunque siga existiendo el código importado previamente y aunque no exista ningún código. Senior e Intern informan `requiresCode:false` y la interfaz ya usa ese dato para ocultar el campo y permitir el inicio.

No se cambia la configuración local por defecto, los agentes remotos ni sus idiomas. La API key sigue solo en servidor; los destinos del proveedor son fijos. Se mantienen consentimiento, origen exacto, validación del cuerpo, límites de solicitudes y bloqueo de operaciones de bóveda.

## Consecuencias y alternativa

Cualquier visitante del sitio puede iniciar conversaciones y consumir créditos del proyecto. La validación de Origin y el límite por instancia no sustituyen la autenticación. Mantener o recordar el código no cumple la petición. Para recuperar la barrera se puede configurar `AGENT_OPEN_ACCESS=false` y un `LIVEKIT_JOIN_CODE` válido y redeployar.

## Ontología y verificación

No cambia ninguna entidad ni la evidencia persistida. Las pruebas comprueban ambos roles sin código, incluso con un código antiguo configurado, consentimiento obligatorio, rechazo de otros orígenes y restauración explícita del requisito. Los resultados ejecutados se registran en la nueva entrada de bitácora.

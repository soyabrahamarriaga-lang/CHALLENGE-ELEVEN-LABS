# ADR: entrada de demostración y frontend inspirado en Gradium

- Fecha: 2026-10-04
- Estado: adoptado para el prototipo local; autenticación real pendiente de definición
- Autor: Codex
- Operador: soyabrahamarriaga-lang
- Tarea: login-frontend

## Contexto

El usuario pidió una rama nueva para un login sencillo que lleve a la interfaz de UserHelper y fijó gradium.ai como referencia visual. La aplicación existente no tiene cuentas de usuario. Sus APIs, consentimiento y acceso al proveedor tienen contratos independientes de la selección de perfiles senior/intern.

## Decisión

Implementar una entrada de demostración explícita que pide nombre y perfil y monta después la aplicación existente. Guardar una preferencia validada y versionada en sessionStorage; ante almacenamiento no disponible, continuar en memoria. Ofrecer salida que elimina esa preferencia y desmonta la conversación. No recoger contraseñas ni simular verificación de identidad. El perfil seleccionado describe un recorrido de interfaz, no un rol autorizado por el servidor.

Aplicar la referencia Gradium con tipografía grande, superficies negras, acentos lima y una cinta Canvas original. Conservar marca UserHelper, funciones existentes, estados reales y consentimiento. La entrada no solicita permisos de dispositivos ni inicia sesiones del proveedor. El motivo animado admite pausa y respeta movimiento reducido.

## Alternativas

- Añadir un proveedor de autenticación y cuentas: requiere definir usuarios, recuperación, backend y permisos; queda fuera de esta primera entrega visual, pendiente de respuesta a la aclaración de alcance.
- Formulario de correo/contraseña ficticio: descartado porque aparentaría una protección inexistente y recogería credenciales sin necesidad.
- Solo modificar el inicio existente: no satisface el recorrido de entrada solicitado.

## Consecuencias y evidencia

La preferencia puede modificarse desde el navegador y no protege datos. El límite está visible en el formulario y en la documentación. Los guardas de origen/código/consentimiento existentes no se alteran. El preview usa un puerto nuevo y la biblioteca privada devuelve rechazo de origen; esa restricción se conserva.

Pruebas y recorrido observados en docs/FRONTEND-STUDIO.md. La ontología de experto, aprendiz, sesión y Work Map no cambia; la preferencia de entrada no constituye una nueva identidad de dominio.

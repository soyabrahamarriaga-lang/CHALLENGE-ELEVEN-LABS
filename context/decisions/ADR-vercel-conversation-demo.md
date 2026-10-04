# ADR: Demo urgente de conversaciones en Vercel sin bóveda

- Estado: aceptado e implementado; deployment público pendiente del operador.
- Fecha: 2026-10-04.
- Autor: Codex; operador: Abraham (`soyabrahamarriaga-lang`).
- Relacionados: ADR-mi-espacio-agente, ADR-intern-tutor, ADR-agent-session-language, ADR-0011.

## Contexto

El usuario necesita publicar inmediatamente y pospone migrar la bóveda a un disco de pago. Autoriza priorizar conversaciones. Importar variables en el preset Vite no ejecutaba el servidor local; hacen falta endpoints de funciones.

## Decisión

Añadir `api/demo.mjs` y reescrituras `/api/*`. El adaptador reutiliza la validación y acceso temporal existentes, con dos agentes fijos y código compartido obligatorio. Admite los orígenes exactos obtenidos de variables de sistema del deployment/producción y un dominio explícito opcional; no confía en Host ni en Origin para crear una lista autorizada. Acepta tanto streams Node como JSON ya procesado por Vercel, con límite de 4096 bytes.

No conectar la bóveda ni usar `/tmp` como almacenamiento duradero. El adaptador responde deshabilitado a todas sus operaciones aunque se importe una ruta local por error. No inicia sincronizadores. El build de Vercel activa una interfaz que declara ese límite, conserva ejemplos, evita peticiones a la colección y escrituras de evidencia; mantiene envío de voz, texto, OCR e imágenes al agente.

El usuario importa cuatro variables privadas en su propio proyecto: clave, IDs Senior/Intern y código de acceso. No se publica en la cuenta distinta que aparece en el conector de Vercel. No se cambia configuración de agentes, modelos, idioma, ruido ni voces.

## Alternativas

Render con disco reutiliza la bóveda, pero requiere la migración que el usuario pospuso. Obsidian Sync/Headless puede sincronizar archivos con un servidor; por sí solo no aloja la API ni elimina la configuración de servidor. Copiar la bóveda a funciones efímeras aparentaría guardar datos sin persistencia y no satisface el contrato.

## Consecuencias y ontología

Esta entrega permite conversar y enseñar con el conocimiento ya configurado en ElevenLabs. No completa Capture → Map → Teach en la nube ni agrega procesos a la biblioteca. La versión local conserva su funcionamiento. No cambia entidades ni convierte transcripciones en evidencia validada. El código compartido no es autenticación individual; el limitador es por instancia. No se amplía acceso a la bóveda.

## Verificación

214 pruebas Vitest, 28 pruebas Python y build local pasaron. HTTP real con el adaptador y las credenciales privadas obtuvo respuestas 200 y credenciales temporales para ambos agentes en voz/texto. La llamada física y el deploy remoto quedan pendientes; no se presentan como comprobados.

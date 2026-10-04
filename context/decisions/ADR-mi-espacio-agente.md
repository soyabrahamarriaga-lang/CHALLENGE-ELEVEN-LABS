# ADR: Mi espacio como entrada única a la conversación del agente

- Fecha: 2026-10-03 (America/Mexico_City)
- Estado: aceptada; sustituye la navegación de sala del equipo de ADR-0009 y la entrada independiente de ADR-0010.
- Actor: Codex; operador: soyabrahamarriaga-lang.
- Tarea local: mi-espacio-agente.

## Problema y decisión

El usuario confirmó que la aplicación se utilizará para conversar individualmente con el chatbot y pidió un único inicio dentro de Mi espacio. Se retiran del menú Tu aprendiz de IA y Videollamada; se sustituye el inicio senior simulado por un botón que abre la conversación existente de ElevenLabs en esa misma sección. Se eliminan las tarjetas sobre compartir con el equipo, iniciar demo y el valor del porqué.

Se conserva el consentimiento y la selección voz/texto después del botón; pulsarlo no inicia el micrófono. Se mantiene compartir pantalla con el agente, finalizar, transcripción y vínculo al mapa generado. Los enlaces históricos de agente y sala se redirigen a Mi espacio. Biblioteca, Guardadas, Mapas de procesos y perfil intern se mantienen. La ayuda y el arranque local se alinean con la nueva entrada.

## Alternativas y límites

Ocultar únicamente los botones dejaría la sala accesible mediante su URL: se retira también su montaje. Borrar los adaptadores LiveKit del backend ampliaría el cambio y afectaría el servicio de tokens que también autoriza ElevenLabs; se conservan por ahora sin exposición en el frontend. No se cambia el agente remoto, la retención ni las credenciales.

El otro chat trabaja en mapas en codex/process-flow-maps. Esta tarea se prepara en un worktree propio desde origin/main con una copia de sus cambios pendientes para verificar la UI combinada, sin cambiar aquel checkout. No se publica ni se atribuye su trabajo como propio. El parche de esta tarea contiene únicamente los cambios sobre esa copia base.

## Ontología

La conversación individual y el mensaje conservan su significado. La sala de equipo queda fuera de los recorridos del producto; su entidad histórica en la ontología documenta infraestructura heredada. No se redefine una conversación como conocimiento validado ni se modifican los borradores de mapas.

## Validación

92 pruebas Vitest aprobadas, incluidas regresiones de rutas históricas y enlaces a mapas; TypeScript y build de Vite aprobados. Verificación de navegador en escritorio y móvil: botón único, apertura por teclado, foco de llegada, consentimiento y controles de voz/texto, menú sin videollamada ni entrada AI separada, navegación a biblioteca y guardadas. No se activa un micrófono ni se inicia una conversación real durante esta revisión de frontend.

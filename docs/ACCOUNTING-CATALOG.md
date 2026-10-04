# Catálogo propuesto: Contabilidad

Fuente: actividades y reglas aportadas por el usuario el 3 de octubre de 2026. **La estructura de clasificación está implementada; las reglas de negocio y fiscales de este documento son propuestas pendientes de validación, no controles ejecutados ni afirmaciones de legislación vigente.** No se han verificado tasas, fechas, documentos obligatorios ni efectos fiscales con fuentes oficiales en este cambio.

## Organización editable

Departamento inicial: **Contabilidad**. El departamento propietario no determina quién solicita, compra, aprueba o recibe; los roles cruzan áreas. Tipo de tarea = familia funcional; código = actividad del catálogo. Nombre del proceso = verbo + objeto + contexto relevante. Cada ejecución conserva un ID distinto.

| Familia / tipo de tarea | Códigos | Ejemplo de nombre |
|---|---|---|
| Compras y órdenes de compra | 2.1–2.12 | Rechazar una OC por documentación vencida |
| Alta y validación de proveedores | 3.1–3.7 | Revisar el expediente de un proveedor |
| Recepción y validación de CFDI | 3.8–3.16 | Conciliar una factura con su OC y recepción |
| Retenciones | 3C | Determinar retenciones de un servicio |
| Seguimiento de facturas y materialidad | 3.17–3.20 | Completar el expediente de una operación |
| Cotizaciones y negociación | 4.1–4.11 | Comparar cotizaciones y formalizar condiciones |

El formulario permite corregir nombre, departamento y tipo de cada proceso; `catalogo-procesos.json` permite cambiar sugerencias locales. «Por clasificar» expresa evidencia insuficiente. El catálogo enviado al análisis remoto se configura desde `server/processCatalog.mjs` con `npm run maps:configure -- --apply`; editar el archivo privado no modifica automáticamente al agente. No se inventan actividades adicionales ni tasas para completar un mapa.

## 2. Compras y órdenes de compra

| Código | Actividad | Datos o comportamiento propuestos por el usuario |
|---|---|---|
| 2.1 | Recibir requisiciones | Artículo, cantidad, centro de costo, justificación, urgencia y fecha requerida |
| 2.2 | Revisar inventario | Consultar stock antes de comprar |
| 2.3 | Revisar presupuesto | Disponible = presupuesto − comprometido − ejercido |
| 2.4 | Revisar vigencia del proveedor | Bloquear compra si no está dado de alta o tiene bloqueo fiscal; conexión con familia 3 |
| 2.5 | Exigir cotizaciones | Sobre un monto todavía no definido, pedir al menos tres; conexión con familia 4 |
| 2.6 | Generar OC | Folio, proveedor, partidas, precio, IVA, condiciones de pago, fecha y lugar de entrega |
| 2.7 | Aprobar por niveles | Elegir aprobador según monto |
| 2.8 | Rechazar o devolver | Comentario obligatorio |
| 2.9 | Enviar y obtener confirmación | Confirmación de la fecha de entrega por el proveedor |
| 2.10 | Modificar o cancelar | Conservar versiones; si sube el monto, volver a aprobar |
| 2.11 | Seguimiento | Alerta si venció la fecha sin entrega |
| 2.12 | Recibir y cerrar | Recepción parcial o total; cerrar al completarse |

Matriz de autorización aportada **como ejemplo en MXN**:

| Monto tal como fue propuesto | Aprueba |
|---|---|
| Menos de $10,000 | Comprador |
| $10,000 a $50,000 | Gerente de Compras |
| $50,000 a $250,000 | Director de Finanzas |
| Más de $250,000 | Director General |

Pendiente: asignar inequívocamente el límite de $50,000 (las dos bandas se superponen), definir base con/sin IVA, moneda, sustituciones y autoridad para excepciones. No se transforman estas bandas en reglas de código.

Reglas candidatas: quien solicita no aprueba y quien aprueba no recibe; detectar varias OC al mismo proveedor en pocos días que juntas superen un nivel (ventana aún sin definir); urgencias con justificación y reporte «fuera de proceso»; aprobación compromete presupuesto y factura lo convierte en ejercido.

Estados aportados: Borrador → En aprobación → Aprobada / Rechazada → Enviada → Confirmada → Recibida parcial → Recibida total → Cerrada; Cancelada antes de la recepción. Pendiente precisar qué ocurre después de una recepción parcial y con devoluciones.

## 3A. Alta y control del proveedor

| Código | Actividad | Datos o comprobación propuesta |
|---|---|---|
| 3.1 | Expediente | RFC, razón social, régimen, CP fiscal y Constancia de Situación Fiscal de menos de 30 días |
| 3.2 | Opinión 32-D | Positiva; renovación mensual o trimestral por definir |
| 3.3 | Lista 69-B | Presunto, definitivo, desvirtuado o sentencia favorable |
| 3.4 | Lista 69 | No localizados, créditos firmes y cancelados |
| 3.5 | REPSE | Aplicabilidad a servicios especializados y vigencia |
| 3.6 | Bancos | Estado de cuenta; CLABE a nombre del proveedor |
| 3.7 | Documentos legales | Acta constitutiva, poder, INE y contrato |

Bloqueos candidatos aportados: 69-B definitivo bloquea al proveedor; presunto u opinión negativa impide OC nuevas y alerta al gerente; documentos con alerta 15 días antes y bloqueo al vencer. Su alcance legal y la política interna requieren validación separada.

## 3B. Recepción y validación de CFDI

| Código | Revisión | Regla candidata aportada |
|---|---|---|
| 3.8 | XML + PDF | Sin XML no registrar |
| 3.9 | Vigencia SAT | Vigente o cancelado |
| 3.10 | Emisor | RFC igual al proveedor de la OC |
| 3.11 | Receptor | RFC, nombre, régimen y CP de la empresa en CFDI 4.0 |
| 3.12 | Uso | Congruencia con compra: G01, G03 o I0x como ejemplos |
| 3.13 | Método y forma | PUE: una exhibición; PPD: crédito con forma 99, según propuesta recibida |
| 3.14 | Moneda/cambio | Revisar tipo de cambio si está en USD |
| 3.15 | Impuestos | Tasas 16%, 8%, 0% o exento según artículo y aplicabilidad por verificar |
| 3.16 | Conciliación triple | OC, recepción y factura: cantidad, precio y total; tolerancia de ejemplo ±1% |

## 3C. Retenciones

Registro fiel de la tabla candidata recibida; **no usar como tabla fiscal validada ni como valores predeterminados de cálculo**:

| Caso aportado | ISR propuesto | IVA retenido propuesto |
|---|---|---|
| Persona física, honorarios o arrendamiento | 10% | 2/3 del IVA (10.6667% indicado por el usuario) |
| Persona física RESICO | 1.25% | Según servicio |
| Fletes, autotransporte de bienes | n/a | 4% |
| Servicios especializados REPSE | n/a | 6% |

Todas las tasas y supuestos, incluida la fila REPSE, quedan pendientes de revisión de vigencia y aplicabilidad por el contador. Este documento conserva la propuesta para no perder contexto; no certifica su corrección normativa.

## 3D. Seguimiento de facturas y materialidad

| Código | Actividad | Regla candidata aportada |
|---|---|---|
| 3.17 | REP | Para PPD, marcar faltantes; plazo propuesto: día 5 del mes siguiente al pago, por validar |
| 3.18 | Notas de crédito | Devoluciones/descuentos ligados a factura original |
| 3.19 | Cancelaciones | Solicitudes con motivos 01 a 04 |
| 3.20 | Materialidad | OC, contrato, recepción, fotos y entregables para sustentar la operación |

Estados aportados: Recibida → En validación → Con diferencias / Rechazada → Validada → Programada para pago → Pagada → REP recibido. Falta acordar transiciones de resolución y distinguir facturas para las que no aplica REP.

## 4. Cotizaciones y negociación

| Código | Actividad | Datos o comportamiento propuesto |
|---|---|---|
| 4.1 | Analizar consumo | Histórico por artículo/proveedor y volumen anual estimado |
| 4.2 | Referencias | Último precio, promedio y mínimo histórico |
| 4.3 | RFQ | Misma especificación y fecha límite para varios proveedores |
| 4.4 | Comparativo | Precio, flete, descuento, entrega, plazo de pago, garantía y calificación |
| 4.5 | Costo total | Precio + flete + costo financiero + riesgo de calidad |
| 4.6 | Objetivos | Precio meta y máximo aceptable |
| 4.7 | Rondas | Oferta → contraoferta → oferta final |
| 4.8 | Condiciones | Crédito, pronto pago, volumen, precio fijo, ajuste cambiario, penalizaciones, consignación |
| 4.9 | Formalizar | Lista autorizada con vigencia o contrato marco |
| 4.10 | Ahorro | Contra precio previo, primera cotización y aumentos evitados |
| 4.11 | Renegociar | Alertas antes del vencimiento de listas/contratos |

## Qué registra el mapa

Por paso: actividad concreta, instrucciones observadas, captura original disponible, condición/decisión, motivo expresado y fuente. Una regla de este catálogo solo entra como evidencia de una ejecución cuando el experto la describe; la mera presencia en el catálogo no demuestra que se haya cumplido. La taxonomía sirve para encontrar procedimientos, sin convertir una conversación en una ejecución automática de compras o contabilidad.

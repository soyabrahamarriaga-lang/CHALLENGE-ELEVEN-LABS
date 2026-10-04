// User-provided activity catalogue; business/tax policy validation is separate.
export const PROCESS_CATALOG = {
  version: 1,
  defaultDepartment: "Contabilidad",
  departments: ["Contabilidad"],
  families: [
    {
      id: "compras-oc",
      name: "Compras y órdenes de compra",
      activities: [
        ["2.1", "Recibir requisiciones de las áreas"],
        ["2.2", "Revisar inventario"],
        ["2.3", "Revisar presupuesto disponible"],
        ["2.4", "Revisar vigencia del proveedor"],
        ["2.5", "Exigir cotizaciones"],
        ["2.6", "Generar la orden de compra"],
        ["2.7", "Aprobar por niveles"],
        ["2.8", "Rechazar o devolver con comentario"],
        ["2.9", "Enviar al proveedor y obtener confirmación"],
        ["2.10", "Modificar o cancelar la OC"],
        ["2.11", "Dar seguimiento a la entrega"],
        ["2.12", "Recibir y cerrar"],
      ],
    },
    {
      id: "proveedores",
      name: "Alta y validación de proveedores",
      activities: [
        ["3.1", "Integrar expediente del proveedor"],
        ["3.2", "Revisar opinión de cumplimiento 32-D"],
        ["3.3", "Revisar lista 69-B"],
        ["3.4", "Revisar lista 69"],
        ["3.5", "Revisar REPSE"],
        ["3.6", "Validar datos bancarios"],
        ["3.7", "Integrar documentos legales"],
      ],
    },
    {
      id: "cfdi",
      name: "Recepción y validación de CFDI",
      activities: [
        ["3.8", "Recibir XML y PDF"],
        ["3.9", "Revisar vigencia en el SAT"],
        ["3.10", "Validar emisor"],
        ["3.11", "Validar receptor"],
        ["3.12", "Revisar uso de CFDI"],
        ["3.13", "Revisar método y forma de pago"],
        ["3.14", "Revisar moneda y tipo de cambio"],
        ["3.15", "Revisar impuestos"],
        ["3.16", "Conciliar OC, recepción y factura"],
      ],
    },
    {
      id: "retenciones",
      name: "Retenciones",
      activities: [["3C", "Determinar retenciones según proveedor y servicio"]],
    },
    {
      id: "seguimiento-facturas",
      name: "Seguimiento de facturas y materialidad",
      activities: [
        ["3.17", "Dar seguimiento al complemento de pago"],
        ["3.18", "Gestionar notas de crédito"],
        ["3.19", "Gestionar cancelaciones"],
        ["3.20", "Integrar evidencia de materialidad"],
      ],
    },
    {
      id: "negociacion",
      name: "Cotizaciones y negociación",
      activities: [
        ["4.1", "Analizar consumo"],
        ["4.2", "Consultar precios de referencia"],
        ["4.3", "Solicitar cotizaciones"],
        ["4.4", "Comparar propuestas"],
        ["4.5", "Calcular costo total"],
        ["4.6", "Definir objetivos de precio"],
        ["4.7", "Registrar rondas de negociación"],
        ["4.8", "Negociar condiciones"],
        ["4.9", "Formalizar precios o contrato"],
        ["4.10", "Medir ahorro"],
        ["4.11", "Renegociar antes del vencimiento"],
      ],
    },
  ],
};
export const CATALOG_DESCRIPTION = PROCESS_CATALOG.families
  .map(
    (f) =>
      f.name +
      ": " +
      f.activities.map(([id, name]) => id + " " + name).join("; "),
  )
  .join("\n");
export function classifyActivity(action, catalog = PROCESS_CATALOG) {
  const rules = [
    ["2.8", /rechaz|devolver/i],
    ["2.7", /aproba|aprobar|autoriz/i],
    ["2.6", /generar.*(?:orden|oc\b)/i],
    ["2.3", /presupuest/i],
    ["2.2", /inventario|stock/i],
    ["3.2", /32.?d|opini[oó]n.*cumplimiento/i],
    ["3.3", /69.?b/i],
    ["3.5", /repse/i],
    ["3.16", /conciliar|3.way/i],
    ["3.8", /xml|pdf/i],
    ["3.17", /complemento.*pago/i],
    ["4.4", /comparar.*coti/i],
    ["4.8", /negociar/i],
  ];
  const id = rules.find(([, regex]) => regex.test(action))?.[0];
  const family = catalog.families.find((f) =>
    f.activities.some((a) => a[0] === id),
  );
  return { activityCode: id || "", taskType: family?.name || "Por clasificar" };
}

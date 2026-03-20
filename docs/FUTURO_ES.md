# Futuro del MVP (roadmap)

Este MVP está diseñado para crecer sin reescribir el motor de RAG/IA.

## Integración WhatsApp Business (futura)

- Conectar con WhatsApp Business Cloud API.
- Enviar cada mensaje entrante al endpoint del chatbot (`/api/chat`) reutilizando el mismo sistema de recuperación de contexto (archivos + chunks).
- Responder con el texto en español y registrar metadatos (fuente y archivo usado).

## Pagos / órdenes (futuro)

- Endpoint para “estado de pedido”, “cotización” y “confirmación”.
- Usar el mismo RAG para precios/catálogos y un flujo adicional para confirmación.
- Guardar historial de conversaciones y pedidos (modelo de datos separado).

## Agentes de voz (futuro)

- Soporte de inbound/outbound: convertir voz a texto y viceversa.
- Mantener el mismo motor de RAG: la voz alimenta el texto de la pregunta.

## Múltiples casos de uso (futuro)

- Estructuras de normalización por industria:
  - Ropa: inventario por tallas/colores, precios.
  - Inmobiliaria: ubicaciones, precios, características.
  - Auto agency: modelo, año, kilometraje, estado, VIN/serie.
- La extracción puede etiquetar “dominio” para mejorar prompts y recuperación.

## Multi-subdominio / multi-negocio (futuro)

- Ejecutar contenedores separados por subdominio (por ejemplo, `autos.tudominio.com`, `ropa.tudominio.com`).
- Cada contenedor usa su propio `db/`, `uploads/` y `parsed/` mediante volúmenes.
- En una versión posterior se puede pasar a un sistema multi-tenant más avanzado, pero el MVP ya funciona por separación de contenedores.


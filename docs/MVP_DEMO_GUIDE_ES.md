# Guía de Demo (MVP) — Chatbot en Español

## Objetivo

Demostrar en pocos minutos que el sistema:

1. Permite iniciar sesión en un panel de administración.
2. Permite cargar un archivo (por ejemplo, el PDF de inventario/precios).
3. Procesa el archivo y guarda conocimiento buscable.
4. Responde preguntas en español usando la información del archivo.

## Flujo recomendado para la demo

### 1) Iniciar sesión

- Ir a `http://localhost:3000/login`
- Credenciales demo:
  - Correo: **admin@demo.com**
  - Contraseña: **admin1234**

### 2) Subir el PDF (o Excel/CSV/Word/TXT)

- Ir a `http://localhost:3000/admin`
- En “Subir archivo”, arrastrar el PDF de inventario/precios o usar “Elegir archivo”.
- Esperar a que el estado cambie a **Listo**.
- En “Vista previa” se verá una parte del texto extraído.

### 3) Probar el chatbot

- Ir a `http://localhost:3000/chat`
- Preguntas sugeridas (ejemplos):
  - **¿Qué autos están disponibles?**
  - **¿Cuál es el precio del [modelo]?**
  - **¿Qué unidades hay por menos de X?**
  - **¿Hay opciones en color blanco?**

### 4) Ver “Fuentes”

Cuando la respuesta se basa en archivos cargados, al final verás:

> “Esta respuesta fue generada usando: [nombre del archivo]”

## Notas importantes (MVP)

- El MVP usa una búsqueda simple (por palabras) y fragmentos (chunks).
- Si no hay API key de IA configurada, el sistema funciona en modo “fallback” (sin IA) y responde con la información encontrada.
- Para una versión final se puede mejorar el RAG con embeddings, multi-tenant, WhatsApp Business, etc.


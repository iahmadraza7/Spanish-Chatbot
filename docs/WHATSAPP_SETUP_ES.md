# Manual: Obtener los valores de WhatsApp (Meta Cloud API)

El chatbot necesita **3 valores** para conectarse a WhatsApp. Aquí se explica
de dónde sale cada uno.

> Requisito previo: tener una **App** creada en
> [developers.facebook.com](https://developers.facebook.com) con el producto
> **WhatsApp** agregado (es la pantalla "Configuración de la API" / "API Setup").

---

## 1. `WHATSAPP_PHONE_NUMBER_ID` (Identificador del número de teléfono)

1. Entra a tu App en **developers.facebook.com**.
2. Menú izquierdo → **WhatsApp → Configuración de la API**.
3. En la sección **"Desde"** (From) verás tu número de WhatsApp y, debajo, el
   campo **"Identificador del número de teléfono"** (*Phone number ID*).
4. Copia ese número largo. **Ese es el valor.**

> ⚠️ NO es el número de teléfono (+52…), es el **ID** que aparece debajo.

---

## 2. `WHATSAPP_ACCESS_TOKEN` (Token de acceso)

En la misma pantalla aparece un **token temporal** que dura **24 horas** —
sirve solo para pruebas. Para producción se necesita un **token permanente**:

1. Ve a **Business Settings** (Configuración del negocio) →
   [business.facebook.com/settings](https://business.facebook.com/settings).
2. **Usuarios → Usuarios del sistema** → **Agregar** → crea uno
   (rol: Administrador).
3. Selecciónalo → **Agregar activos** → elige tu **App** y activa los permisos
   de control total.
4. Clic en **Generar nuevo token** → elige la App → marca estos permisos:
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
5. **Genera** y copia el token (empieza con `EAA...`). **Ese es el valor.**
   Guárdalo bien: no se vuelve a mostrar.

---

## 3. `WHATSAPP_VERIFY_TOKEN` (Token de verificación)

Este **NO se obtiene de Meta** — es una contraseña que **tú inventas** (cualquier
texto, ej. `banzai-webhook-2026`). Se usa para que Meta y el chatbot confirmen
que el webhook es legítimo.

Pasos:
1. Define el texto que quieras y ponlo en el `.env` del servidor como
   `WHATSAPP_VERIFY_TOKEN`.
2. En tu App → **WhatsApp → Configuración** → **Webhooks → Editar**:
   - **URL de devolución de llamada:**
     `https://demo.chatbot.codificamax.com/api/whatsapp/webhook`
   - **Verificar token:** el mismo texto que pusiste en el `.env`.
3. **Verificar y guardar**, y suscríbete al campo **messages**.

---

## Resumen para enviar

| Variable | De dónde sale |
|----------|----------------|
| `WHATSAPP_PHONE_NUMBER_ID` | Meta → WhatsApp → Configuración de la API (Phone number ID) |
| `WHATSAPP_ACCESS_TOKEN` | Token **permanente** desde un Usuario del Sistema |
| `WHATSAPP_VERIFY_TOKEN` | Lo inventas tú; el mismo texto va en el `.env` y en el Webhook |

> El chatbot **web funciona sin esto**. WhatsApp es la Fase 2 y se activa
> cuando estos 3 valores estén configurados en el servidor.

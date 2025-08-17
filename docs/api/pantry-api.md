
# Cenaria – API de Despensa (Pantry) – v0.1

**Fecha:** 2025-08-17  
**Ambiente:** `dev`  
**Base URL:** `https://y3sh6vq335.execute-api.us-east-2.amazonaws.com/dev`  
**Auth:** Cognito (JWT). Enviar `Authorization: Bearer <ID_TOKEN>`.

---

## Esquemas (DTOs)

### PantryItem
```json
{
  "id": "string (ulid)",
  "name": "string (2..80)",
  "quantity": "number (>=0)",
  "unit": "g|kg|ml|l|pieza|taza|cda|cdta",
  "category": "verduras|frutas|carnes|lácteos|granos|especias|enlatados|otros",
  "perishable": "boolean (opcional)",
  "notes": "string (opcional)",
  "createdAt": "epoch_ms",
  "updatedAt": "epoch_ms",
  "version": "integer (OCC)"
}
```

### NewPantryItem (POST)
```json
{
  "name": "string",
  "quantity": "number",
  "unit": "Unit",
  "category": "Category (opcional)",
  "perishable": "boolean (opcional)",
  "notes": "string (opcional)"
}
```

---

## Paginación & Idempotencia

- **Paginación:** `limit` (1..100, default 20) y `cursor` (base64) con `nextCursor` en la respuesta.
- **Idempotencia:** (opcional) `Idempotency-Key` en `POST /pantry` si se habilita.

---

## Endpoints

### GET `/v1/pantry`
Lista los ingredientes del usuario autenticado.

**Query:** `search?`, `category?`, `limit?`, `cursor?`  
**200:** `{ items: PantryItem[], nextCursor?: string }`

**Ejemplo**
```bash
curl -sS "https://y3sh6vq335.execute-api.us-east-2.amazonaws.com/dev/v1/pantry?limit=50"   -H "Authorization: Bearer $IDTOKEN"
```

---

### POST `/v1/pantry`
Crea uno o varios ingredientes.  
**Body:** `{ items: NewPantryItem[] }`  
**201:** `{ items: PantryItem[] }`

**Ejemplo**
```bash
curl -sS -X POST "https://y3sh6vq335.execute-api.us-east-2.amazonaws.com/dev/v1/pantry"   -H "Authorization: Bearer $IDTOKEN"   -H "content-type: application/json"   -d '{"items":[{"name":"Arroz","quantity":1,"unit":"kg","category":"granos"}]}'
```

---

### GET `/v1/pantry/{id}`
Obtiene un ingrediente por ID.  
**200:** `PantryItem` | **404** Not Found

**Ejemplo**
```bash
ID="01K2ABCDEF123..."
curl -sS "https://y3sh6vq335.execute-api.us-east-2.amazonaws.com/dev/v1/pantry/$ID"   -H "Authorization: Bearer $IDTOKEN"
```

---

### PUT `/v1/pantry/{id}`
Reemplaza completamente el ítem. **OCC requerido:** `If-Match: <version>`.  
**200:** `PantryItem` | **409** Conflict

**Ejemplo**
```bash
curl -sS -X PUT "https://y3sh6vq335.execute-api.us-east-2.amazonaws.com/dev/v1/pantry/$ID"   -H "Authorization: Bearer $IDTOKEN"   -H "If-Match: 2"   -H "content-type: application/json"   -d '{"name":"Arroz","quantity":2,"unit":"kg","category":"granos","perishable":false}'
```

---

### PATCH `/v1/pantry/{id}`
Actualiza parcialmente campos: `name, quantity, unit, category, perishable, notes`.  
**OCC opcional** con `If-Match`.  
**200:** `PantryItem` | **409** Conflict

**Ejemplo**
```bash
curl -sS -X PATCH "https://y3sh6vq335.execute-api.us-east-2.amazonaws.com/dev/v1/pantry/$ID"   -H "Authorization: Bearer $IDTOKEN"   -H "If-Match: 2"   -H "content-type: application/json"   -d '{"quantity":3,"perishable":true,"notes":"comprado hoy"}'
```

---

### DELETE `/v1/pantry/{id}`
Elimina un ingrediente. **OCC opcional** con `If-Match`.  
**204:** No Content | **409** si versión no coincide | **404** si no existe (sin OCC).

**Ejemplo**
```bash
curl -i -sS -X DELETE "https://y3sh6vq335.execute-api.us-east-2.amazonaws.com/dev/v1/pantry/$ID"   -H "Authorization: Bearer $IDTOKEN"   -H "If-Match: 3"
```

---

## Códigos de Estado

- `200` OK
- `201` Created
- `204` No Content
- `400` Bad Request
- `401/403` Unauthorized/Forbidden
- `404` Not Found
- `409` Conflict (OCC)
- `413` Payload Too Large
- `429` Rate Limit
- `500` Internal Error

---

## Reglas de Validación

- `quantity ≥ 0`, `name` 2..80, `notes ≤ 240`.  
- `unit` y `category` deben ser valores permitidos.  
- Normalización de `name` a minúsculas sin acentos para búsqueda por prefijo.

---

© 2025 Cenaria — Módulo Despensa

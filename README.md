# Proyecto BD2 - API + Frontend Vite

Estructura separada por capas:
- `backend/` para API y acceso a MongoDB.
- `frontend/` para interfaz Vite (modular por features).

## Estructura de carpetas

```txt
.
|- backend/
|  |- src/
|  |  |- routes/
|  |  |- utils/
|  |  |- app.js
|  |  |- db.js
|  |- .env.example
|  |- package.json
|  |- server.js
|- frontend/
|  |- src/
|  |  |- api/
|  |  |- features/
|  |  |- state/
|  |  |- styles/
|  |  |- utils/
|  |  |- main.js
|  |- index.html
|  |- package.json
|  |- vite.config.js
|- init.js
|- seed_users.js
|- seed_restaurants.js
|- seed_orders.js
|- seed_reviews.js
|- package.json
```

## Setup

1. Instalar backend:
```bash
npm install --prefix backend
```

2. Instalar frontend:
```bash
npm install --prefix frontend
```

3. Crear `backend/.env` desde `backend/.env.example`:
```env
MONGODB_URI=...
DB_NAME=restaurant_management
PORT=3000
```

4. Ejecutar backend:
```bash
npm run dev:backend
```

5. En otra terminal, ejecutar frontend Vite:
```bash
npm run dev:frontend
```

## URLs

- Frontend (Vite): `http://localhost:5173`
- API: `http://localhost:3000`
- Healthcheck API: `http://localhost:3000/api/health`

## Frontend (Vite) y organizacion

El frontend usa Vite + JavaScript modular:
- `src/api/`: cliente HTTP.
- `src/features/`: logica por vista (`dashboard`, `orders`, `history`, `reviews`, `restaurants`, `tabs`).
- `src/state/`: estado compartido de la app.
- `src/utils/`: formato, helpers de DOM.
- `src/styles/`: estilos globales.

Esto evita un `app.js` monolitico y mantiene separacion clara por responsabilidad.

## Endpoints principales

### Usuarios
- `GET /api/users`
- `GET /api/users/:id`
- `POST /api/users`
- `PATCH /api/users/:id`
- `DELETE /api/users/:id`

### Restaurantes
- `GET /api/restaurants`
- `GET /api/restaurants/:id`
- `POST /api/restaurants`
- `PATCH /api/restaurants/:id`
- `DELETE /api/restaurants/:id`

### Ordenes
- `GET /api/orders`
- `GET /api/orders/:id`
- `POST /api/orders`
- `PATCH /api/orders/:id`
- `DELETE /api/orders/:id`
- `PATCH /api/orders/:id/cancel`
- `PATCH /api/orders/:id/status`
- `GET /api/orders/:id/status-history`
- `GET /api/orders/enriched` (`$lookup`)

### Reviews
- `GET /api/reviews`
- `GET /api/reviews/:id`
- `POST /api/reviews`
- `PATCH /api/reviews/:id`
- `DELETE /api/reviews/:id`
- `GET /api/reviews/enriched` (`$lookup`)

### Analytics
- `GET /api/analytics/overview`
- `GET /api/analytics/top-restaurants`
- `GET /api/analytics/orders-by-status`
- `GET /api/analytics/monthly-sales`
- `GET /api/analytics/top-dishes`

## Query params soportados

En listados `GET /api/...`:
- `sort`, `order`
- `skip`, `limit`
- `fields` o `projection`
- `filter` (JSON)
- filtros por campo (`status=pending`)
- operadores por sufijo: `_gte`, `_lte`, `_gt`, `_lt`, `_ne`, `_in`, `_nin`

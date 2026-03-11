# Proyecto1-BD2 - Tiendas to Casas

Aplicacion full-stack para gestion de restaurantes, ordenes, resenas y analitica sobre MongoDB.

## Video demo

https://youtu.be/JYcfVTPGDu8

## Contenido del proyecto

- `backend/`: API REST con Express + MongoDB.
- `frontend/`: cliente web con Vite + JavaScript modular.
- `ETL/`: proceso ETL MongoDB -> PostgreSQL para analitica/BI.

## Funcionalidades principales

### Dashboard

- Conteos generales (`users`, `restaurants`, `orders`, `reviews`).
- Agregaciones:
  - ordenes por estado
  - top restaurantes por rating (incluye normalizacion de ids para datos legacy)
  - top platos
  - ventas mensuales

### Buscar restaurantes

- Filtro por texto (`q`) y categoria (`tipo_comida`).
- Filtro por rating minimo (`rating_gte`).
- Ordenamiento por `rating`, `name`, `createdAt`.
- Orden asc/desc.
- `limit` configurable.
- Si `limit` va vacio, la API no aplica limite en esa consulta.

### Crear orden

- Seleccion de usuario y restaurante (listas completas).
- Carga dinamica del menu del restaurante.
- Precio automatico al seleccionar item.
- Multiples items por orden.
- Calculo de total en tiempo real.
- Boton `Cancelar` para limpiar formulario y items.
- Bloqueo del restaurante cuando ya hay items agregados.
- Solo permite enviar si hay items en la lista.

### Historial de ordenes (logica de negocio)

- Cambio de estado de orden.
- Cancelacion de orden.
- Reglas:
  - `dispatched` no se puede cancelar
  - `delivered` no se puede cancelar
  - `cancelled` no se puede cancelar ni cambiar estado

### Resenas

- Crear resena por usuario/restaurante.
- Validacion de restaurante correcto al crear.
- Listado reciente con datos enriquecidos (`$lookup`).
- Boton para eliminar resena.

## Arquitectura y estructura

```txt
.
|- backend/
|  |- src/
|  |  |- routes/
|  |  |- utils/
|  |  |- app.js
|  |  |- db.js
|  |- server.js
|  |- reseed.js
|  |- test_endpoints.js
|  |- package.json
|- frontend/
|  |- src/
|  |  |- api/
|  |  |- features/
|  |  |- state/
|  |  |- styles/
|  |  |- utils/
|  |  |- main.js
|  |- index.html
|  |- vite.config.js
|  |- package.json
|- ETL/
|  |- etl.py
|  |- config.json
|  |- requirements.txt
|- package.json
```

## Tecnologias

- Backend: Node.js, Express, MongoDB Driver, dotenv, cors
- Frontend: Vite, JavaScript modular, CSS
- ETL: Python, MongoDB, PostgreSQL

## Requisitos

- Node.js 18+
- npm 9+
- MongoDB (Atlas o local)
- Python 3.8+ (solo para ETL)
- PostgreSQL (solo para ETL)

## Configuracion

Crear archivo `backend/.env`:

```env
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/
DB_NAME=Pr1
PORT=3000
CORS_ORIGIN=http://localhost:5173
```

En frontend, opcionalmente puedes definir `VITE_API_BASE` en `frontend/.env`.
Si no se define, se usa el mismo host del frontend.

## Instalacion

Desde la raiz:

```bash
npm run install:backend
npm run install:frontend
```

## Ejecucion en desarrollo

Terminal 1 (backend):

```bash
npm run dev:backend
```

Terminal 2 (frontend):

```bash
npm run dev:frontend
```

## URLs locales

- Frontend: `http://localhost:5173`
- API: `http://localhost:3000`
- Healthcheck: `http://localhost:3000/api/health`

## Seed de datos

Para poblar la base con datos de prueba e indices:

```bash
cd backend
node reseed.js
```

## Pruebas de endpoints

Con el backend corriendo:

```bash
cd backend
node test_endpoints.js
```

## Endpoints API (resumen)

Base URL: `http://localhost:3000/api`

### Users (`/users`)

- `GET /`
- `GET /:id`
- `POST /`
- `POST /many`
- `PATCH /:id`
- `POST /:id/favoritos`
- `DELETE /:id/favoritos/:restaurantId`
- `DELETE /:id`

### Restaurants (`/restaurants`)

- `GET /`
- `GET /:id`
- `POST /`
- `PATCH /:id`
- `DELETE /:id`
- `POST /:id/menu`
- `PATCH /:id/menu/:menuItemId`
- `DELETE /:id/menu/:menuItemId`

### Orders (`/orders`)

- `GET /`
- `GET /enriched`
- `GET /:id`
- `GET /:id/status-history`
- `POST /`
- `POST /many`
- `PATCH /bulk-status`
- `PATCH /:id/status`
- `PATCH /:id/cancel`
- `PATCH /:id`
- `DELETE /:id`

### Reviews (`/reviews`)

- `GET /`
- `GET /enriched`
- `GET /:id`
- `POST /`
- `PATCH /:id`
- `DELETE /bulk`
- `DELETE /:id`

### Analytics (`/analytics`)

- `GET /overview`
- `GET /top-restaurants`
- `GET /orders-by-status`
- `GET /monthly-sales`
- `GET /top-dishes`
- `GET /distinct-food-types`
- `GET /revenue-by-restaurant`
- `GET /user-spending`

## Query params soportados en listados

- `sort`, `order`
- `skip`, `limit`
- `fields` o `projection`
- `filter` (JSON)
- filtros directos por campo (`status=pending`)
- operadores: `_gte`, `_lte`, `_gt`, `_lt`, `_ne`, `_in`, `_nin`

## ETL (MongoDB -> PostgreSQL)

Ubicacion: `ETL/`

Pasos:

1. Instalar dependencias:

```bash
cd ETL
pip install -r requirements.txt
```

2. Configurar `ETL/config.json` (MongoDB y PostgreSQL).
3. Ejecutar:

```bash
python etl.py
```

El ETL:

- extrae datos con pipelines de agregacion desde MongoDB
- exporta CSV en `ETL/output/`
- crea/carga tablas en PostgreSQL para consumo en Power BI

## Scripts utiles (raiz)

- `npm run install:backend`
- `npm run install:frontend`
- `npm run dev:backend`
- `npm run dev:frontend`
- `npm run build:frontend`
- `npm run preview:frontend`

## Notas

- Si cambias rutas de backend, reinicia el servidor.
- Para consultas grandes de restaurantes, deja `limit` vacio.
- Si el frontend no refleja cambios, limpia cache del navegador y recarga.

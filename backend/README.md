# Backend — API Express + MongoDB

## Setup

1. Instalar dependencias:
   ```bash
   cd backend
   npm install
   ```

2. Crear archivo `.env` en `backend/` con:
   ```
   MONGODB_URI=mongodb+srv://<usuario>:<password>@<cluster>.mongodb.net/
   DB_NAME=Pr1
   PORT=3000
   ```

3. Iniciar servidor en modo desarrollo (hot-reload):
   ```bash
   npm run dev
   ```
   El servidor corre en `http://localhost:3000`.

## Seed (poblar la base de datos)

```bash
cd backend
node reseed.js
```

Esto borra y re-crea las 4 colecciones (users, Restaurant, orders, reviews) con datos de prueba e índices.

## Probar los endpoints

Con el servidor corriendo:

```bash
node test_endpoints.js
```

Ejecuta pruebas automáticas contra todos los endpoints y muestra ✅ o ❌ por cada uno.

## Endpoints disponibles

Base URL: `http://localhost:3000/api`

### Users `/api/users`
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/` | Listar usuarios (soporta query: limit, skip, sort, filter) |
| GET | `/:id` | Obtener usuario por ID |
| POST | `/` | Crear usuario |
| POST | `/many` | Crear varios usuarios (insertMany) |
| PATCH | `/:id` | Actualizar usuario |
| POST | `/:id/favoritos` | Agregar restaurante a favoritos ($addToSet) |
| DELETE | `/:id/favoritos/:restaurantId` | Quitar restaurante de favoritos ($pull) |
| DELETE | `/:id` | Eliminar usuario |

### Restaurants `/api/restaurants`
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/` | Listar restaurantes (soporta `?q=` para búsqueda) |
| GET | `/:id` | Obtener restaurante por ID |
| POST | `/` | Crear restaurante |
| PATCH | `/:id` | Actualizar restaurante |
| POST | `/:id/menu` | Agregar item al menú ($push) |
| PATCH | `/:id/menu/:menuItemId` | Actualizar item del menú (arrayFilters) |
| DELETE | `/:id/menu/:menuItemId` | Eliminar item del menú ($pull) |
| DELETE | `/:id` | Eliminar restaurante |

### Orders `/api/orders`
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/` | Listar órdenes |
| GET | `/enriched` | Listar órdenes con $lookup a users y Restaurant |
| GET | `/:id` | Obtener orden por ID |
| GET | `/:id/status-history` | Historial de estados |
| POST | `/` | Crear orden (transacción: descuenta inventario) |
| POST | `/many` | Crear varias órdenes (insertMany) |
| PATCH | `/bulk-status` | Actualizar status en lote (updateMany) |
| PATCH | `/:id/status` | Cambiar status ($push a statusHistory) |
| PATCH | `/:id/cancel` | Cancelar orden (transacción: restaura inventario) |
| PATCH | `/:id` | Actualizar orden |
| DELETE | `/:id` | Eliminar orden |

### Reviews `/api/reviews`
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/` | Listar reviews |
| GET | `/enriched` | Listar reviews con $lookup a users y Restaurant |
| GET | `/:id` | Obtener review por ID |
| POST | `/` | Crear review (transacción: recalcula rating) |
| PATCH | `/:id` | Actualizar review (transacción: recalcula rating) |
| DELETE | `/bulk` | Eliminar reviews por restaurantId (deleteMany + transacción) |
| DELETE | `/:id` | Eliminar review (transacción: recalcula rating) |

### Analytics `/api/analytics`
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/overview` | Conteo total de cada colección |
| GET | `/top-restaurants` | Top restaurantes por rating |
| GET | `/orders-by-status` | Órdenes agrupadas por status ($group) |
| GET | `/monthly-sales` | Ventas mensuales ($group por año/mes) |
| GET | `/top-dishes` | Platillos más vendidos ($unwind + $group) |
| GET | `/distinct-food-types` | Tipos de comida únicos (distinct) |
| GET | `/revenue-by-restaurant` | Ingresos por restaurante ($group + $lookup) |
| GET | `/user-spending` | Gasto por usuario ($group + $lookup) |

## Estructura de archivos

```
backend/
├── server.js              # Entry point
├── reseed.js              # Script para poblar la BD
├── test_endpoints.js      # Pruebas automáticas
├── .env                   # Variables de entorno (no se sube a git)
└── src/
    ├── app.js             # Express app config + rutas
    ├── db.js              # Conexión MongoDB + helpers
    ├── routes/
    │   ├── users.js
    │   ├── restaurants.js
    │   ├── orders.js
    │   ├── reviews.js
    │   └── analytics.js
    └── utils/
        ├── http.js        # asyncHandler
        ├── objectId.js    # toObjectId helper
        ├── query.js       # buildFindConfig, parseFilter, etc.
        ├── restaurantStats.js  # refreshRestaurantRating
        └── transaction.js # runWithOptionalTransaction
```

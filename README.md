# 🍽 Proyecto Base de Datos II  
Sistema de Gestión de Restaurantes – MongoDB

---

## 📌 Descripción

Este proyecto implementa un sistema completo de gestión de restaurantes utilizando **MongoDB Atlas** como base de datos principal.

Incluye:

- Modelado híbrido (embedding + referencing)
- Índices avanzados
- Aggregation Pipelines
- Optimización con `explain()`
- Simulación de volumen real de datos
- Preparación para transacciones y BI

---

# 🗂 Modelo de Datos

## 1️⃣ users
```js
{
  _id,
  name,
  email,              // unique
  favoritos: [ObjectId], // multikey
  createdAt
}

## Restaurnat
{
  _id,
  name,
  tipo_comida,
  rating,
  totalReviews,
  location: {
    type: "Point",
    coordinates: [lng, lat]
  },
  menu: [
    { name, price }
  ],
  createdAt
}

## reviews

{
  _id,
  userId,
  restaurantId,
  rating,
  comment,
  createdAt
}


## orders

{
  _id,
  userId,
  restaurantId,
  items: [
    { name, price, quantity }
  ],
  totalAmount,
  status,
  createdAt,
  updatedAt
}
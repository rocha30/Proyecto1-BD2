// Crear índices

db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ favoritos: 1 });

db.Restaurant.createIndex({ location: "2dsphere" });
db.Restaurant.createIndex({ tipo_comida: 1, rating: -1 });

db.reviews.createIndex({ restaurantId: 1 });
db.reviews.createIndex({ userId: 1 });
db.reviews.createIndex({ restaurantId: 1, rating: -1 });

db.orders.createIndex({ userId: 1 });
db.orders.createIndex({ restaurantId: 1 });
db.orders.createIndex({ createdAt: -1 });
db.orders.createIndex({ status: 1 });
db.orders.createIndex({ userId: 1, createdAt: -1 });

db.orders.deleteMany({});

const userIds = db.users.find().map(u => u._id);
const restaurants = db.Restaurant.find().toArray();

if (userIds.length === 0 || restaurants.length === 0) {
  print("❌ ERROR: Corre seed_users.js y seed_restaurants.js primero");
  quit(1);
}

let bulk = [];

for (let i = 0; i < 4000; i++) {
  const rest = restaurants[Math.floor(Math.random() * restaurants.length)];
  const menuItem = rest.menu && rest.menu.length > 0
    ? rest.menu[Math.floor(Math.random() * rest.menu.length)]
    : { _id: new ObjectId(), nombre: "Item genérico", precio: 50 };
  const quantity = Math.floor(Math.random() * 3) + 1;
  const status = ["pending", "confirmed", "delivered"][Math.floor(Math.random() * 3)];
  const createdAt = new Date(2026, Math.floor(Math.random() * 6), Math.floor(Math.random() * 28) + 1);

  bulk.push({
    insertOne: {
      document: {
        userId: userIds[Math.floor(Math.random() * userIds.length)],
        restaurantId: rest._id,
        items: [
          {
            menuItemId: menuItem._id,
            nombre: menuItem.nombre,
            precio: menuItem.precio,
            quantity: quantity
          }
        ],
        totalAmount: menuItem.precio * quantity,
        status: status,
        statusHistory: [{ status: status, at: createdAt }],
        createdAt: createdAt,
        updatedAt: createdAt
      }
    }
  });

  if (bulk.length === 500) {
    db.orders.bulkWrite(bulk);
    bulk = [];
  }
}

if (bulk.length > 0) {
  db.orders.bulkWrite(bulk);
}

print("✅ Orders insertadas:", db.orders.countDocuments());
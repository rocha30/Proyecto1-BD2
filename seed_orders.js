
db.orders.deleteMany({});

const userIds = db.users.find().map(u => u._id);
const restaurantIds = db.Restaurant.find().map(r => r._id);

let bulk = [];

for (let i = 0; i < 4000; i++) {

  const price = Math.floor(Math.random() * 100) + 20;
  const quantity = Math.floor(Math.random() * 3) + 1;

  bulk.push({
    insertOne: {
      document: {
        userId: userIds[Math.floor(Math.random() * userIds.length)],
        restaurantId: restaurantIds[Math.floor(Math.random() * restaurantIds.length)],
        items: [
          {
            name: "Item A",
            price: price,
            quantity: quantity
          }
        ],
        totalAmount: price * quantity,
        status: ["pending", "confirmed", "delivered"][Math.floor(Math.random() * 3)],
        createdAt: new Date(
          2026,
          Math.floor(Math.random() * 6),
          Math.floor(Math.random() * 28) + 1
        ),
        updatedAt: new Date()
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
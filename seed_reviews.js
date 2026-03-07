
db.reviews.deleteMany({});

const userIds = db.users.find().map(u => u._id);
const restaurantIds = db.Restaurant.find().map(r => r._id);

let bulk = [];

for (let i = 0; i < 15000; i++) {
  bulk.push({
    insertOne: {
      document: {
        userId: userIds[Math.floor(Math.random() * userIds.length)],
        restaurantId: restaurantIds[Math.floor(Math.random() * restaurantIds.length)],
        rating: Math.floor(Math.random() * 5) + 1,
        comment: "Review automática " + i,
        createdAt: new Date()
      }
    }
  });

  if (bulk.length === 1000) {
    db.reviews.bulkWrite(bulk);
    bulk = [];
  }
}

if (bulk.length > 0) {
  db.reviews.bulkWrite(bulk);
}

print("✅ Reviews insertadas:", db.reviews.countDocuments());
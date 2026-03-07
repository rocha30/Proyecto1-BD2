
db.Restaurant.deleteMany({});

const tipos = ["Mexicana", "Italiana", "Japonesa", "Americana", "Vegana", "China", "India"];
let bulk = [];

for (let i = 0; i < 800; i++) {
  bulk.push({
    insertOne: {
      document: {
        name: "Restaurant " + i,
        tipo_comida: tipos[Math.floor(Math.random() * tipos.length)],
        rating: Math.random() * 5,
        totalReviews: 0,
        location: {
          type: "Point",
          coordinates: [
            -99.0 + Math.random(),
            19.0 + Math.random()
          ]
        },
        menu: [
          { name: "Item A", price: Math.floor(Math.random() * 100) },
          { name: "Item B", price: Math.floor(Math.random() * 100) }
        ],
        createdAt: new Date()
      }
    }
  });

  if (bulk.length === 200) {
    db.Restaurant.bulkWrite(bulk);
    bulk = [];
  }
}

if (bulk.length > 0) {
  db.Restaurant.bulkWrite(bulk);
}

print("✅ Restaurants insertados:", db.Restaurant.countDocuments());
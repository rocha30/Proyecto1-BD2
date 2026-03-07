
db.users.deleteMany({});

let bulk = [];

for (let i = 0; i < 3000; i++) {
  bulk.push({
    insertOne: {
      document: {
        name: "User " + i,
        email: "user" + i + "@email.com",
        favoritos: [],
        createdAt: new Date()
      }
    }
  });

  if (bulk.length === 500) {
    db.users.bulkWrite(bulk);
    bulk = [];
  }
}

if (bulk.length > 0) {
  db.users.bulkWrite(bulk);
}

print("✅ Users insertados:", db.users.countDocuments());
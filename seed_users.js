
db.users.deleteMany({});

const ciudades = ["Guatemala", "Quetzaltenango", "Escuintla", "Mixco", "Villa Nueva"];
let bulk = [];

for (let i = 0; i < 3000; i++) {
  bulk.push({
    insertOne: {
      document: {
        name: "User " + i,
        email: "user" + i + "@email.com",
        favoritos: [],
        telefono: "5" + String(Math.floor(Math.random() * 90000000) + 10000000),
        direccion: {
          calle: "Calle " + Math.floor(Math.random() * 50) + 1,
          ciudad: ciudades[Math.floor(Math.random() * ciudades.length)],
          codigoPostal: "0" + (Math.floor(Math.random() * 9000) + 1000)
        },
        fechaRegistro: new Date(),
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
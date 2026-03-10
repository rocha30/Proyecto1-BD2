
db.Restaurant.deleteMany({});

const tipos = ["Mexicana", "Italiana", "Japonesa", "Americana", "Vegana", "China", "India"];
const categorias = ["Entrada", "Plato fuerte", "Postre", "Bebida", "Ensalada"];
const platillos = ["Tacos", "Pizza", "Sushi", "Hamburguesa", "Ensalada Caesar", "Pad Thai", "Ramen", "Burrito", "Pasta", "Curry"];
let bulk = [];

for (let i = 0; i < 800; i++) {
  const menuSize = Math.floor(Math.random() * 5) + 2;
  const menu = [];
  for (let j = 0; j < menuSize; j++) {
    menu.push({
      _id: new ObjectId(),
      nombre: platillos[Math.floor(Math.random() * platillos.length)] + " " + j,
      descripcion: "Delicioso platillo #" + j,
      precio: Math.floor(Math.random() * 150) + 20,
      categoria: categorias[Math.floor(Math.random() * categorias.length)],
      inventarioDisponible: Math.floor(Math.random() * 100) + 10,
      activo: true
    });
  }
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
        menu: menu,
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
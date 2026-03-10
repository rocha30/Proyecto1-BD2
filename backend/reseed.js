/**
 * Re-seed all collections using the Node.js MongoDB driver.
 * Run from project root:  node reseed.js
 */
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });

const { MongoClient, ObjectId } = require("mongodb");

const uri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME || "Pr1";

async function main() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);
  console.log(`Connected to ${dbName}`);

  // ─── 1. Users ───
  console.log("\n=== Seeding users ===");
  await db.collection("users").deleteMany({});
  const ciudades = ["Guatemala", "Quetzaltenango", "Escuintla", "Mixco", "Villa Nueva"];
  const userDocs = [];
  for (let i = 0; i < 3000; i++) {
    userDocs.push({
      name: `User ${i}`,
      email: `user${i}@email.com`,
      favoritos: [],
      telefono: "5" + String(Math.floor(Math.random() * 90000000) + 10000000),
      direccion: {
        calle: `Calle ${Math.floor(Math.random() * 50) + 1}`,
        ciudad: ciudades[Math.floor(Math.random() * ciudades.length)],
        codigoPostal: "0" + (Math.floor(Math.random() * 9000) + 1000)
      },
      fechaRegistro: new Date(),
      createdAt: new Date()
    });
  }
  await db.collection("users").insertMany(userDocs, { ordered: false });
  console.log(`✅ Users: ${await db.collection("users").countDocuments()}`);

  // ─── 2. Restaurants ───
  console.log("\n=== Seeding Restaurant ===");
  await db.collection("Restaurant").deleteMany({});
  const tipos = ["Mexicana", "Italiana", "Japonesa", "Americana", "Vegana", "China", "India"];
  const categorias = ["Entrada", "Plato fuerte", "Postre", "Bebida", "Ensalada"];
  const platillos = ["Tacos", "Pizza", "Sushi", "Hamburguesa", "Ensalada Caesar", "Pad Thai", "Ramen", "Burrito", "Pasta", "Curry"];
  const restDocs = [];
  for (let i = 0; i < 800; i++) {
    const menuSize = Math.floor(Math.random() * 5) + 2;
    const menu = [];
    for (let j = 0; j < menuSize; j++) {
      menu.push({
        _id: new ObjectId(),
        nombre: `${platillos[Math.floor(Math.random() * platillos.length)]} ${j}`,
        descripcion: `Delicioso platillo #${j}`,
        precio: Math.floor(Math.random() * 150) + 20,
        categoria: categorias[Math.floor(Math.random() * categorias.length)],
        inventarioDisponible: Math.floor(Math.random() * 100) + 10,
        activo: true
      });
    }
    restDocs.push({
      name: `Restaurant ${i}`,
      tipo_comida: tipos[Math.floor(Math.random() * tipos.length)],
      rating: +(Math.random() * 5).toFixed(2),
      totalReviews: 0,
      location: {
        type: "Point",
        coordinates: [-99.0 + Math.random(), 19.0 + Math.random()]
      },
      menu,
      createdAt: new Date()
    });
  }
  await db.collection("Restaurant").insertMany(restDocs, { ordered: false });
  console.log(`✅ Restaurants: ${await db.collection("Restaurant").countDocuments()}`);

  // ─── 3. Orders ───
  console.log("\n=== Seeding orders ===");
  await db.collection("orders").deleteMany({});
  const allUsers = await db.collection("users").find({}, { projection: { _id: 1 } }).toArray();
  const allRests = await db.collection("Restaurant").find({}, { projection: { _id: 1, menu: 1 } }).toArray();
  const userIds = allUsers.map((u) => u._id);

  const orderDocs = [];
  for (let i = 0; i < 4000; i++) {
    const rest = allRests[Math.floor(Math.random() * allRests.length)];
    const menuItem = rest.menu && rest.menu.length > 0
      ? rest.menu[Math.floor(Math.random() * rest.menu.length)]
      : { _id: new ObjectId(), nombre: "Item genérico", precio: 50 };
    const quantity = Math.floor(Math.random() * 3) + 1;
    const status = ["pending", "confirmed", "delivered"][Math.floor(Math.random() * 3)];
    const createdAt = new Date(2026, Math.floor(Math.random() * 6), Math.floor(Math.random() * 28) + 1);

    orderDocs.push({
      userId: userIds[Math.floor(Math.random() * userIds.length)],
      restaurantId: rest._id,
      items: [{
        menuItemId: menuItem._id,
        nombre: menuItem.nombre,
        precio: menuItem.precio,
        quantity
      }],
      totalAmount: menuItem.precio * quantity,
      status,
      statusHistory: [{ status, at: createdAt }],
      createdAt,
      updatedAt: createdAt
    });
  }
  // Insert in batches of 500
  for (let i = 0; i < orderDocs.length; i += 500) {
    await db.collection("orders").insertMany(orderDocs.slice(i, i + 500), { ordered: false });
  }
  console.log(`✅ Orders: ${await db.collection("orders").countDocuments()}`);

  // ─── 4. Reviews ───
  console.log("\n=== Seeding reviews ===");
  await db.collection("reviews").deleteMany({});
  const restIds = allRests.map((r) => r._id);
  const reviewDocs = [];
  for (let i = 0; i < 15000; i++) {
    reviewDocs.push({
      userId: userIds[Math.floor(Math.random() * userIds.length)],
      restaurantId: restIds[Math.floor(Math.random() * restIds.length)],
      rating: Math.floor(Math.random() * 5) + 1,
      comment: `Review automática ${i}`,
      createdAt: new Date()
    });
  }
  for (let i = 0; i < reviewDocs.length; i += 1000) {
    await db.collection("reviews").insertMany(reviewDocs.slice(i, i + 1000), { ordered: false });
  }
  console.log(`✅ Reviews: ${await db.collection("reviews").countDocuments()}`);

  // ─── 5. Indexes ───
  console.log("\n=== Creating indexes ===");
  await db.collection("users").createIndex({ email: 1 }, { unique: true });
  await db.collection("users").createIndex({ favoritos: 1 });
  await db.collection("Restaurant").createIndex({ location: "2dsphere" });
  await db.collection("Restaurant").createIndex({ tipo_comida: 1, rating: -1 });
  await db.collection("reviews").createIndex({ restaurantId: 1 });
  await db.collection("reviews").createIndex({ userId: 1 });
  await db.collection("reviews").createIndex({ restaurantId: 1, rating: -1 });
  await db.collection("orders").createIndex({ userId: 1 });
  await db.collection("orders").createIndex({ restaurantId: 1 });
  await db.collection("orders").createIndex({ createdAt: -1 });
  await db.collection("orders").createIndex({ status: 1 });
  await db.collection("orders").createIndex({ userId: 1, createdAt: -1 });
  console.log("✅ Indexes created");

  console.log("\n🎉 Seed completo!");
  await client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

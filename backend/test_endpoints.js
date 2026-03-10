/**
 * Test script for all new endpoints.
 * Run: node test_endpoints.js
 */
const BASE = "http://localhost:3000/api";

async function request(method, path, body) {
  const url = `${BASE}${path}`;
  const opts = {
    method,
    headers: { "Content-Type": "application/json" }
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
}

function log(label, res) {
  const icon = res.status < 400 ? "✅" : "❌";
  console.log(`${icon} [${res.status}] ${label}`);
  if (res.status >= 400) console.log("   ", JSON.stringify(res.data));
}

async function main() {
  console.log("=== HEALTH CHECK ===");
  log("GET /health", await request("GET", "/health"));

  // ─── GET existing IDs to use in tests ───
  console.log("\n=== Getting existing data ===");
  const usersRes = await request("GET", "/users?limit=1");
  const restRes = await request("GET", "/restaurants?limit=1");
  const ordersRes = await request("GET", "/orders?limit=1");
  const reviewsRes = await request("GET", "/reviews?limit=1");

  const userId = usersRes.data?.data?.[0]?._id;
  const restaurantId = restRes.data?.data?.[0]?._id;
  const orderId = ordersRes.data?.data?.[0]?._id;
  const restaurant = restRes.data?.data?.[0];
  const menuItem = restaurant?.menu?.[0];

  console.log(`  userId:       ${userId}`);
  console.log(`  restaurantId: ${restaurantId}`);
  console.log(`  orderId:      ${orderId}`);
  console.log(`  menuItemId:   ${menuItem?._id}`);

  // ─── POINT 3: CRUD ───
  console.log("\n========== POINT 3: CRUD ==========");

  // --- Users ---
  console.log("\n--- Users: POST /many (insertMany) ---");
  const usersMany = await request("POST", "/users/many", [
    { name: "Test User A", email: "testa@test.com", telefono: "1234" },
    { name: "Test User B", email: "testb@test.com", telefono: "5678" }
  ]);
  log("POST /users/many", usersMany);

  console.log("\n--- Users: POST /:id/favoritos ($addToSet) ---");
  if (userId && restaurantId) {
    const addFav = await request("POST", `/users/${userId}/favoritos`, { restaurantId });
    log("POST /users/:id/favoritos", addFav);
  }

  console.log("\n--- Users: DELETE /:id/favoritos/:restaurantId ($pull) ---");
  if (userId && restaurantId) {
    const removeFav = await request("DELETE", `/users/${userId}/favoritos/${restaurantId}`);
    log("DELETE /users/:id/favoritos/:rid", removeFav);
  }

  // --- Restaurants: menu item management ---
  console.log("\n--- Restaurants: POST /:id/menu ($push) ---");
  let newMenuItemId;
  if (restaurantId) {
    const addMenu = await request("POST", `/restaurants/${restaurantId}/menu`, {
      nombre: "TEST Platillo",
      descripcion: "Platillo de prueba",
      precio: 99.99,
      categoria: "test",
      inventarioDisponible: 50,
      activo: true
    });
    log("POST /restaurants/:id/menu", addMenu);
    // Find the newly added menu item
    const newItem = addMenu.data?.menu?.find(m => m.nombre === "TEST Platillo");
    newMenuItemId = newItem?._id;
    console.log(`   newMenuItemId: ${newMenuItemId}`);
  }

  console.log("\n--- Restaurants: PATCH /:id/menu/:menuItemId ($set + arrayFilters) ---");
  if (restaurantId && newMenuItemId) {
    const patchMenu = await request("PATCH", `/restaurants/${restaurantId}/menu/${newMenuItemId}`, {
      precio: 109.99,
      descripcion: "Platillo actualizado"
    });
    log("PATCH /restaurants/:id/menu/:mid", patchMenu);
  }

  console.log("\n--- Restaurants: DELETE /:id/menu/:menuItemId ($pull) ---");
  if (restaurantId && newMenuItemId) {
    const delMenu = await request("DELETE", `/restaurants/${restaurantId}/menu/${newMenuItemId}`);
    log("DELETE /restaurants/:id/menu/:mid", delMenu);
  }

  // --- Orders ---
  console.log("\n--- Orders: POST /many (insertMany) ---");
  if (userId && restaurantId && menuItem) {
    const ordersMany = await request("POST", "/orders/many", [
      {
        userId, restaurantId,
        items: [{ menuItemId: menuItem._id, nombre: menuItem.nombre, precio: menuItem.precio, quantity: 1 }]
      },
      {
        userId, restaurantId,
        items: [{ menuItemId: menuItem._id, nombre: menuItem.nombre, precio: menuItem.precio, quantity: 2 }]
      }
    ]);
    log("POST /orders/many", ordersMany);
  }

  console.log("\n--- Orders: PATCH /bulk-status (updateMany) ---");
  const bulkStatus = await request("PATCH", "/orders/bulk-status", {
    filter: { status: "pending" },
    status: "confirmed"
  });
  log("PATCH /orders/bulk-status", bulkStatus);

  // ─── POINT 4: TRANSACTIONS ───
  console.log("\n========== POINT 4: TRANSACTIONS ==========");

  console.log("\n--- Orders: POST / (create with transaction + inventory) ---");
  if (userId && restaurantId && menuItem) {
    const createOrder = await request("POST", "/orders", {
      userId, restaurantId,
      items: [{ menuItemId: menuItem._id, nombre: menuItem.nombre, precio: menuItem.precio, quantity: 1 }]
    });
    log("POST /orders (transactional)", createOrder);

    if (createOrder.status === 201) {
      const newOrderId = createOrder.data._id;
      console.log("\n--- Orders: PATCH /:id/cancel (cancel with transaction + restore inventory) ---");
      const cancelOrder = await request("PATCH", `/orders/${newOrderId}/cancel`);
      log("PATCH /orders/:id/cancel (transactional)", cancelOrder);
    }
  }

  // --- Reviews: DELETE /bulk (deleteMany + transaction) ---
  console.log("\n--- Reviews: DELETE /bulk (deleteMany in transaction) ---");
  // Create a temp restaurant + reviews to test bulk delete
  const tempRest = await request("POST", "/restaurants", {
    name: "TEMP Test Restaurant",
    tipo_comida: "test"
  });
  if (tempRest.status === 201 && userId) {
    const tempRestId = tempRest.data._id;
    // Create 2 reviews for it
    await request("POST", "/reviews", { userId, restaurantId: tempRestId, rating: 4, comment: "test1" });
    await request("POST", "/reviews", { userId, restaurantId: tempRestId, rating: 3, comment: "test2" });
    const bulkDel = await request("DELETE", "/reviews/bulk", { restaurantId: tempRestId });
    log("DELETE /reviews/bulk", bulkDel);
    console.log(`   deletedCount: ${bulkDel.data?.deletedCount}`);
    // Cleanup temp restaurant
    await request("DELETE", `/restaurants/${tempRestId}`);
  }

  // ─── POINT 5: AGGREGATIONS ───
  console.log("\n========== POINT 5: AGGREGATIONS ==========");

  console.log("\n--- Analytics: GET /overview (countDocuments) ---");
  log("GET /analytics/overview", await request("GET", "/analytics/overview"));

  console.log("\n--- Analytics: GET /top-restaurants ($match+$sort+$limit) ---");
  log("GET /analytics/top-restaurants", await request("GET", "/analytics/top-restaurants"));

  console.log("\n--- Analytics: GET /orders-by-status ($group) ---");
  log("GET /analytics/orders-by-status", await request("GET", "/analytics/orders-by-status"));

  console.log("\n--- Analytics: GET /monthly-sales ($group by year/month) ---");
  log("GET /analytics/monthly-sales", await request("GET", "/analytics/monthly-sales?limit=3"));

  console.log("\n--- Analytics: GET /top-dishes ($unwind+$group) ---");
  log("GET /analytics/top-dishes", await request("GET", "/analytics/top-dishes?limit=5"));

  console.log("\n--- Analytics: GET /distinct-food-types (distinct) ---");
  log("GET /analytics/distinct-food-types", await request("GET", "/analytics/distinct-food-types"));

  console.log("\n--- Analytics: GET /revenue-by-restaurant ($group+$lookup) ---");
  const revByRest = await request("GET", "/analytics/revenue-by-restaurant?limit=3");
  log("GET /analytics/revenue-by-restaurant", revByRest);
  if (revByRest.data?.data?.[0]) {
    console.log("   Sample:", JSON.stringify(revByRest.data.data[0]));
  }

  console.log("\n--- Analytics: GET /user-spending ($group+$lookup) ---");
  const userSpend = await request("GET", "/analytics/user-spending?limit=3");
  log("GET /analytics/user-spending", userSpend);
  if (userSpend.data?.data?.[0]) {
    console.log("   Sample:", JSON.stringify(userSpend.data.data[0]));
  }

  // ─── CLEANUP test users ───
  console.log("\n=== Cleanup ===");
  if (usersMany.data?.insertedIds) {
    for (const [, id] of Object.entries(usersMany.data.insertedIds)) {
      await request("DELETE", `/users/${id}`);
    }
    console.log("✅ Cleaned up test users");
  }

  // Revert the bulk-status change back to pending
  await request("PATCH", "/orders/bulk-status", {
    filter: { status: "confirmed" },
    status: "pending"
  });
  console.log("✅ Reverted bulk-status back to pending");

  console.log("\n🎉 All tests completed!");
}

main().catch(console.error);

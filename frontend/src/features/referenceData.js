import { api } from "../api/client";
import { appState } from "../state/appState";
import { fillSelect } from "../utils/dom";

async function fetchAll(path, queryParams) {
  const pageSize = 100;
  let skip = 0;
  let total = Number.POSITIVE_INFINITY;
  const allItems = [];

  while (allItems.length < total) {
    const params = new URLSearchParams({
      ...queryParams,
      skip: String(skip),
      limit: String(pageSize)
    });

    const response = await api(`${path}?${params.toString()}`);
    const pageItems = Array.isArray(response.data) ? response.data : [];
    const metaTotal = Number(response.meta?.total);

    if (Number.isFinite(metaTotal)) {
      total = metaTotal;
    }

    allItems.push(...pageItems);

    if (pageItems.length === 0) {
      break;
    }

    skip += pageItems.length;

    if (pageItems.length < pageSize && !Number.isFinite(metaTotal)) {
      break;
    }
  }

  return allItems;
}

export async function loadReferenceData() {
  const [users, restaurants] = await Promise.all([
    fetchAll("/users", { sort: "createdAt", order: "desc", fields: "_id,name,email" }),
    fetchAll("/restaurants", { sort: "rating", order: "desc", fields: "_id,name,tipo_comida,rating,totalReviews,menu" })
  ]);

  appState.users = users;
  appState.restaurants = restaurants;

  fillSelect("order-user", appState.users, (user) => `${user.name} (${user.email})`);
  fillSelect("history-user", appState.users, (user) => `${user.name} (${user.email})`);
  fillSelect("review-user", appState.users, (user) => `${user.name} (${user.email})`);
  fillSelect("order-restaurant", appState.restaurants, (restaurant) => `${restaurant.name} (${restaurant.tipo_comida})`);
  const orderRestaurantSelect = document.getElementById("order-restaurant");
  if (orderRestaurantSelect) {
    orderRestaurantSelect.dispatchEvent(new Event("change"));
  }
  fillSelect(
    "review-restaurant",
    appState.restaurants,
    (restaurant) => `${restaurant.name} | rating ${Number(restaurant.rating || 0).toFixed(1)}`
  );
}

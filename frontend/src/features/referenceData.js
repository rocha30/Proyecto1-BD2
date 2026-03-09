import { api } from "../api/client";
import { appState } from "../state/appState";
import { fillSelect } from "../utils/dom";

export async function loadReferenceData() {
  const [usersResponse, restaurantsResponse] = await Promise.all([
    api("/users?limit=60&sort=createdAt&order=desc&fields=_id,name,email"),
    api("/restaurants?limit=60&sort=rating&order=desc&fields=_id,name,tipo_comida,rating,totalReviews")
  ]);

  appState.users = usersResponse.data;
  appState.restaurants = restaurantsResponse.data;

  fillSelect("order-user", appState.users, (user) => `${user.name} (${user.email})`);
  fillSelect("history-user", appState.users, (user) => `${user.name} (${user.email})`);
  fillSelect("review-user", appState.users, (user) => `${user.name} (${user.email})`);
  fillSelect("order-restaurant", appState.restaurants, (restaurant) => `${restaurant.name} (${restaurant.tipo_comida})`);
  fillSelect(
    "review-restaurant",
    appState.restaurants,
    (restaurant) => `${restaurant.name} | rating ${Number(restaurant.rating || 0).toFixed(1)}`
  );
}

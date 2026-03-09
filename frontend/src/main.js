import "./styles/main.css";

import { loadDashboard } from "./features/dashboard";
import { setupHistory, loadOrderHistory } from "./features/history";
import { setupOrders } from "./features/orders";
import { loadReferenceData } from "./features/referenceData";
import { setupRestaurantSearch, runRestaurantSearch } from "./features/restaurants";
import { setupReviews, loadRecentReviews } from "./features/reviews";
import { setupTabs } from "./features/tabs";
import { setMessage } from "./utils/dom";

async function refreshAfterOrderChanges() {
  await loadDashboard();
}

async function refreshAfterReviewChanges() {
  await Promise.all([loadDashboard(), loadReferenceData()]);
}

async function boot() {
  setupTabs();
  setupRestaurantSearch();
  setupOrders(refreshAfterOrderChanges);
  setupHistory(refreshAfterOrderChanges);
  setupReviews(refreshAfterReviewChanges);

  try {
    await loadReferenceData();
    await Promise.all([loadDashboard(), runRestaurantSearch(), loadRecentReviews(), loadOrderHistory()]);
  } catch (error) {
    setMessage("order-message", `Boot error: ${error.message}`, "error");
  }
}

boot();

import { api } from "../api/client";
import { buildQueryString } from "../utils/dom";
import { escapeHtml } from "../utils/format";

async function loadCategoryOptions() {
  const categorySelect = document.getElementById("search-category");
  if (!categorySelect) {
    return;
  }

  const defaultOption = `<option value="">Todas</option>`;

  try {
    const response = await api("/analytics/distinct-food-types");
    const categories = (response.data || [])
      .filter((category) => category !== null && category !== undefined && String(category).trim() !== "")
      .map((category) => String(category))
      .sort((a, b) => a.localeCompare(b));

    categorySelect.innerHTML = `${defaultOption}${categories
      .map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`)
      .join("")}`;
  } catch (_error) {
    categorySelect.innerHTML = defaultOption;
  }
}

export async function runRestaurantSearch(queryString = "sort=rating&order=desc") {
  const response = await api(`/restaurants?${queryString}`);
  const container = document.getElementById("search-results");

  if (!response.data.length) {
    container.innerHTML = "<p class='small'>No restaurants matched this query.</p>";
    return;
  }

  container.innerHTML = response.data
    .map(
      (restaurant) => `
        <article class="result-card">
          <h4>${escapeHtml(restaurant.name)}</h4>
          <p>${escapeHtml(restaurant.tipo_comida)}</p>
          <p class="small">rating ${Number(restaurant.rating || 0).toFixed(2)} | reviews ${restaurant.totalReviews || 0}</p>
          <p class="small">id ${restaurant._id}</p>
        </article>
      `
    )
    .join("");
}

export function setupRestaurantSearch() {
  const form = document.getElementById("search-form");
  void loadCategoryOptions();

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await runRestaurantSearch(buildQueryString(form));
    } catch (error) {
      document.getElementById("search-results").innerHTML = `<p class='small'>${escapeHtml(error.message)}</p>`;
    }
  });
}

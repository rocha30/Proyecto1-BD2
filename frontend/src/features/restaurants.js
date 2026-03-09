import { api } from "../api/client";
import { buildQueryString } from "../utils/dom";
import { escapeHtml } from "../utils/format";

export async function runRestaurantSearch(queryString = "limit=10&sort=rating&order=desc") {
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
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await runRestaurantSearch(buildQueryString(form));
    } catch (error) {
      document.getElementById("search-results").innerHTML = `<p class='small'>${escapeHtml(error.message)}</p>`;
    }
  });
}

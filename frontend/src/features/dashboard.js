import { api } from "../api/client";
import { escapeHtml, formatCurrency } from "../utils/format";

function renderBarChart(containerId, rows, valueKey, labelBuilder) {
  const container = document.getElementById(containerId);
  if (!container) {
    return;
  }

  if (!rows.length) {
    container.innerHTML = "<p class='small'>No data available</p>";
    return;
  }

  const max = Math.max(...rows.map((row) => Number(row[valueKey] || 0)), 1);
  container.innerHTML = rows
    .map((row) => {
      const value = Number(row[valueKey] || 0);
      const width = Math.max((value / max) * 100, 2);
      return `
      <div class="bar-row">
        <div>${escapeHtml(labelBuilder(row))} <strong>${value.toFixed(0)}</strong></div>
        <div class="bar-track"><div class="bar-fill" style="width:${width}%"></div></div>
      </div>
    `;
    })
    .join("");
}

export async function loadDashboard() {
  const [overview, topRestaurants, statusRows, monthlySales, topDishes] = await Promise.all([
    api("/analytics/overview"),
    api("/analytics/top-restaurants?limit=6"),
    api("/analytics/orders-by-status"),
    api("/analytics/monthly-sales"),
    api("/analytics/top-dishes?limit=6")
  ]);

  document.getElementById("stat-users").textContent = overview.users;
  document.getElementById("stat-restaurants").textContent = overview.restaurants;
  document.getElementById("stat-orders").textContent = overview.orders;
  document.getElementById("stat-reviews").textContent = overview.reviews;

  renderBarChart("orders-status-chart", statusRows.data, "count", (row) => row._id || "unknown");

  document.getElementById("top-restaurants-list").innerHTML = topRestaurants.data.length
    ? topRestaurants.data
        .map(
          (row) => `
            <div class="result-card">
              <strong>${escapeHtml(row.name)}</strong>
              <div class="small">${escapeHtml(row.tipo_comida)} | rating ${Number(row.rating || 0).toFixed(2)}</div>
            </div>
          `
        )
        .join("")
    : "<p class='small'>No restaurants with reviews yet.</p>";

  document.getElementById("top-dishes-list").innerHTML = topDishes.data.length
    ? topDishes.data
        .map(
          (row) => `
            <div class="result-card">
              <strong>${escapeHtml(row._id)}</strong>
              <div class="small">quantity ${row.totalQuantity} | revenue ${formatCurrency(row.totalRevenue)}</div>
            </div>
          `
        )
        .join("")
    : "<p class='small'>No dishes data available.</p>";

  document.getElementById("monthly-sales-list").innerHTML = monthlySales.data.length
    ? monthlySales.data
        .map(
          (row) => `
            <div class="result-card">
              <strong>${row._id.month}/${row._id.year}</strong>
              <div class="small">orders ${row.orders} | sales ${formatCurrency(row.totalSales)}</div>
            </div>
          `
        )
        .join("")
    : "<p class='small'>No sales data available.</p>";
}

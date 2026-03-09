import { api } from "../api/client";
import { escapeHtml, formatCurrency, formatDate } from "../utils/format";

const statusValues = ["pending", "confirmed", "preparing", "dispatched", "delivered", "cancelled"];

export async function loadOrderHistory() {
  const userId = document.getElementById("history-user").value;
  const response = await api(`/orders/enriched?userId=${encodeURIComponent(userId)}&limit=20&sort=createdAt&order=desc`);
  const container = document.getElementById("history-list");

  if (!response.data.length) {
    container.innerHTML = "<p class='small'>This user has no orders.</p>";
    return;
  }

  container.innerHTML = response.data
    .map((order) => {
      const history = (order.statusHistory || [])
        .map((entry) => `${entry.status} (${formatDate(entry.at)})`)
        .join(" -> ");

      const statusOptions = statusValues
        .map((status) => `<option value="${status}" ${status === order.status ? "selected" : ""}>${status}</option>`)
        .join("");

      return `
      <article class="history-item">
        <div class="history-row">
          <div>
            <strong>${escapeHtml(order.restaurant?.name || "Restaurant")}</strong>
            <div class="small">total ${formatCurrency(order.totalAmount)} | created ${formatDate(order.createdAt)}</div>
            <div class="small">history: ${escapeHtml(history || "none")}</div>
            <div class="small">id ${order._id}</div>
          </div>
          <div class="history-controls">
            <select data-status-select="${order._id}">
              ${statusOptions}
            </select>
            <button type="button" data-update-status="${order._id}">Update</button>
            <button type="button" data-cancel-order="${order._id}">Cancel</button>
          </div>
        </div>
      </article>
    `;
    })
    .join("");
}

export function setupHistory(onOrderChanged) {
  document.getElementById("history-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await loadOrderHistory();
    } catch (error) {
      document.getElementById("history-list").innerHTML = `<p class='small'>${escapeHtml(error.message)}</p>`;
    }
  });

  document.getElementById("history-list").addEventListener("click", async (event) => {
    const updateId = event.target.dataset.updateStatus;
    const cancelId = event.target.dataset.cancelOrder;

    try {
      if (updateId) {
        const select = document.querySelector(`[data-status-select="${updateId}"]`);
        await api(`/orders/${updateId}/status`, {
          method: "PATCH",
          body: JSON.stringify({ status: select.value })
        });
      } else if (cancelId) {
        await api(`/orders/${cancelId}/cancel`, { method: "PATCH" });
      } else {
        return;
      }

      await loadOrderHistory();
      if (typeof onOrderChanged === "function") {
        await onOrderChanged();
      }
    } catch (error) {
      document.getElementById("history-list").insertAdjacentHTML(
        "afterbegin",
        `<p class='small'>${escapeHtml(error.message)}</p>`
      );
    }
  });
}

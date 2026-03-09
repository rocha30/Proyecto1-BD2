import { api } from "../api/client";
import { appState } from "../state/appState";
import { formatCurrency, escapeHtml } from "../utils/format";
import { setMessage } from "../utils/dom";

function renderOrderItems() {
  const list = document.getElementById("order-items");
  if (appState.orderItems.length === 0) {
    list.innerHTML = "<li>No items added yet.</li>";
    return;
  }

  list.innerHTML = appState.orderItems
    .map(
      (item, index) => `
        <li>
          <span>${escapeHtml(item.name)} | ${item.quantity} x ${formatCurrency(item.price)}</span>
          <button type="button" data-remove-item="${index}">Remove</button>
        </li>
      `
    )
    .join("");
}

async function createOrder() {
  if (appState.orderItems.length === 0) {
    setMessage("order-message", "Add at least one item", "error");
    return null;
  }

  const payload = {
    userId: document.getElementById("order-user").value,
    restaurantId: document.getElementById("order-restaurant").value,
    items: appState.orderItems
  };

  const order = await api("/orders", {
    method: "POST",
    body: JSON.stringify(payload)
  });

  appState.orderItems = [];
  renderOrderItems();
  setMessage("order-message", `Order created: ${order._id}`);
  return order;
}

export function setupOrders(onOrderCreated) {
  renderOrderItems();

  document.getElementById("add-item-btn").addEventListener("click", () => {
    const name = document.getElementById("item-name").value.trim();
    const price = Number(document.getElementById("item-price").value);
    const quantity = Number(document.getElementById("item-qty").value);

    if (!name || !Number.isFinite(price) || price < 0 || !Number.isFinite(quantity) || quantity <= 0) {
      setMessage("order-message", "Invalid item values", "error");
      return;
    }

    appState.orderItems.push({ name, price, quantity });
    renderOrderItems();
    setMessage("order-message", "");

    document.getElementById("item-name").value = "";
    document.getElementById("item-price").value = "";
    document.getElementById("item-qty").value = "1";
  });

  document.getElementById("order-items").addEventListener("click", (event) => {
    const index = event.target.dataset.removeItem;
    if (index === undefined) {
      return;
    }
    appState.orderItems.splice(Number(index), 1);
    renderOrderItems();
  });

  document.getElementById("order-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const order = await createOrder();
      if (order && typeof onOrderCreated === "function") {
        await onOrderCreated(order);
      }
    } catch (error) {
      setMessage("order-message", error.message, "error");
    }
  });
}

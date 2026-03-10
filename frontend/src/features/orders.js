import { api } from "../api/client";
import { appState } from "../state/appState";
import { formatCurrency, escapeHtml } from "../utils/format";
import { setMessage } from "../utils/dom";

function getSelectedRestaurant() {
  const restaurantId = document.getElementById("order-restaurant").value;
  return appState.restaurants.find((restaurant) => String(restaurant._id) === String(restaurantId));
}

function getRestaurantMenuItems(restaurant) {
  if (!restaurant || !Array.isArray(restaurant.menu)) {
    return [];
  }

  return restaurant.menu.filter((item) => item && item.nombre);
}

function syncPriceFromSelectedMenuItem() {
  const itemSelect = document.getElementById("item-name");
  const priceInput = document.getElementById("item-price");
  const selectedOption = itemSelect.selectedOptions[0];

  if (!selectedOption || !selectedOption.value) {
    priceInput.value = "";
    return;
  }

  const selectedPrice = Number(selectedOption.dataset.price);
  if (Number.isFinite(selectedPrice)) {
    priceInput.value = String(selectedPrice);
    return;
  }

  priceInput.value = "";
}

function populateMenuItemsForRestaurant() {
  const itemSelect = document.getElementById("item-name");
  const restaurant = getSelectedRestaurant();
  const menuItems = getRestaurantMenuItems(restaurant);

  if (!restaurant) {
    itemSelect.innerHTML = "<option value=\"\">Selecciona un restaurante primero</option>";
    itemSelect.disabled = true;
    document.getElementById("item-price").value = "";
    return;
  }

  if (menuItems.length === 0) {
    itemSelect.innerHTML = "<option value=\"\">Este restaurante no tiene items en el menu</option>";
    itemSelect.disabled = true;
    document.getElementById("item-price").value = "";
    return;
  }

  itemSelect.innerHTML = [
    "<option value=\"\">Selecciona un item</option>",
    ...menuItems.map((item) => {
      const safeName = escapeHtml(item.nombre);
      const numericPrice = Number(item.precio);
      const priceValue = Number.isFinite(numericPrice) ? ` data-price=\"${numericPrice}\"` : "";
      return `<option value=\"${safeName}\"${priceValue}>${safeName}</option>`;
    })
  ].join("");
  itemSelect.disabled = false;
  itemSelect.selectedIndex = 0;
  document.getElementById("item-price").value = "";
}

function syncRestaurantLockState() {
  const restaurantSelect = document.getElementById("order-restaurant");
  const shouldLockRestaurant = appState.orderItems.length > 0;
  restaurantSelect.disabled = shouldLockRestaurant;
  restaurantSelect.title = shouldLockRestaurant ? "No puedes cambiar el restaurante despues de agregar items" : "";
}

function updateOrderTotal() {
  const totalElement = document.getElementById("order-items-total");
  if (!totalElement) {
    return;
  }

  const total = appState.orderItems.reduce((sum, item) => {
    const price = Number(item.price);
    const quantity = Number(item.quantity);
    if (!Number.isFinite(price) || !Number.isFinite(quantity)) {
      return sum;
    }
    return sum + (price * quantity);
  }, 0);

  totalElement.textContent = formatCurrency(total);
}

function renderOrderItems() {
  syncRestaurantLockState();
  updateOrderTotal();

  const list = document.getElementById("order-items");
  if (appState.orderItems.length === 0) {
    list.innerHTML = "<li class=\"order-item-empty\">Sin items</li>";
    return;
  }

  list.innerHTML = appState.orderItems
    .map(
      (item, index) => `
        <li>
          <span>${escapeHtml(item.name)} | ${item.quantity} x ${formatCurrency(item.price)}</span>
          <button type="button" class="remove-item-btn" data-remove-item="${index}">Remove</button>
        </li>
      `
    )
    .join("");
}

function resetOrderForm() {
  const form = document.getElementById("order-form");
  form.reset();
  appState.orderItems = [];
  populateMenuItemsForRestaurant();
  renderOrderItems();
  setMessage("order-message", "");
}

async function createOrder() {
  const userId = document.getElementById("order-user").value;
  const restaurantId = document.getElementById("order-restaurant").value;

  if (!userId || !restaurantId) {
    setMessage("order-message", "Selecciona usuario y restaurante", "error");
    return null;
  }

  if (appState.orderItems.length === 0) {
    setMessage("order-message", "Add at least one item", "error");
    return null;
  }

  const payload = {
    userId,
    restaurantId,
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
  document.getElementById("order-form").noValidate = true;
  renderOrderItems();
  populateMenuItemsForRestaurant();

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

  document.getElementById("order-restaurant").addEventListener("change", () => {
    populateMenuItemsForRestaurant();
  });

  document.getElementById("item-name").addEventListener("change", () => {
    syncPriceFromSelectedMenuItem();
  });

  document.getElementById("order-items").addEventListener("click", (event) => {
    const index = event.target.dataset.removeItem;
    if (index === undefined) {
      return;
    }
    appState.orderItems.splice(Number(index), 1);
    renderOrderItems();
  });

  document.getElementById("order-cancel-btn").addEventListener("click", () => {
    resetOrderForm();
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

import { escapeHtml } from "./format";

export function setMessage(elementId, text, type = "ok") {
  const element = document.getElementById(elementId);
  if (!element) {
    return;
  }
  element.textContent = text;
  element.classList.remove("ok", "error");
  if (text) {
    element.classList.add(type);
  }
}

export function fillSelect(selectId, items, labelBuilder) {
  const select = document.getElementById(selectId);
  if (!select) {
    return;
  }
  select.innerHTML = items
    .map((item) => `<option value="${item._id}">${escapeHtml(labelBuilder(item))}</option>`)
    .join("");
}

export function buildQueryString(formElement) {
  const params = new URLSearchParams();
  const formData = new FormData(formElement);
  for (const [key, value] of formData.entries()) {
    if (value !== "") {
      params.set(key, value);
    }
  }
  return params.toString();
}

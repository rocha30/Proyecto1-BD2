import { api } from "../api/client";
import { appState } from "../state/appState";
import { setMessage } from "../utils/dom";
import { escapeHtml, formatDate } from "../utils/format";

function normalizeId(value) {
  if (!value) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "object" && value.$oid) {
    return value.$oid;
  }
  return String(value);
}

function getReviewRestaurantId(review) {
  return normalizeId(review.restaurantId || review.restaurant_id || review.restaurant?._id);
}

function getRestaurantNameForReview(review) {
  const reviewRestaurantId = getReviewRestaurantId(review);
  if (reviewRestaurantId) {
    const matchedRestaurant = appState.restaurants.find(
      (restaurant) => String(restaurant._id) === reviewRestaurantId
    );
    if (matchedRestaurant?.name) {
      return matchedRestaurant.name;
    }
  }

  return review.restaurant?.name || "Unknown restaurant";
}

export async function loadRecentReviews() {
  const response = await api("/reviews/enriched?limit=8&sort=createdAt,_id&order=desc");
  const container = document.getElementById("reviews-list");

  if (!response.data.length) {
    container.innerHTML = "<p class='small'>No reviews yet.</p>";
    return;
  }

  container.innerHTML = response.data
    .map(
      (review) => `
        <article class="result-card">
          <strong>${escapeHtml(getRestaurantNameForReview(review))}</strong>
          <div class="small">user ${escapeHtml(review.user?.name || "Unknown")} | rating ${review.rating}</div>
          <div>${escapeHtml(review.comment || "")}</div>
          <div class="small">${formatDate(review.createdAt)}</div>
          <button type="button" class="delete-review-btn" data-review-id="${review._id}">Eliminar reseña</button>
        </article>
      `
    )
    .join("");
}

async function createReview() {
  const restaurantSelect = document.getElementById("review-restaurant");
  const selectedRestaurantId = restaurantSelect.value;
  const selectedRestaurantName =
    appState.restaurants.find((restaurant) => String(restaurant._id) === selectedRestaurantId)?.name ||
    restaurantSelect.options[restaurantSelect.selectedIndex]?.textContent ||
    "Unknown restaurant";

  const payload = {
    userId: document.getElementById("review-user").value,
    restaurantId: selectedRestaurantId,
    rating: Number(document.getElementById("review-rating").value),
    comment: document.getElementById("review-comment").value.trim()
  };

  const review = await api("/reviews", {
    method: "POST",
    body: JSON.stringify(payload)
  });

  const createdRestaurantId = getReviewRestaurantId(review);
  if (createdRestaurantId && createdRestaurantId !== selectedRestaurantId) {
    throw new Error("The created review restaurant does not match the selected restaurant.");
  }

  setMessage("review-message", `Review created for ${selectedRestaurantName}: ${review._id}`);
  document.getElementById("review-comment").value = "";
  return review;
}

export function setupReviews(onReviewCreated) {
  const reviewForm = document.getElementById("review-form");
  const reviewsList = document.getElementById("reviews-list");

  reviewForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const review = await createReview();
      if (review && typeof onReviewCreated === "function") {
        await onReviewCreated(review);
      }
      await loadRecentReviews();
    } catch (error) {
      setMessage("review-message", error.message, "error");
    }
  });

  reviewsList.addEventListener("click", async (event) => {
    const button = event.target.closest(".delete-review-btn");
    if (!button) {
      return;
    }

    const reviewId = button.dataset.reviewId;
    if (!reviewId) {
      return;
    }

    try {
      await api(`/reviews/${reviewId}`, { method: "DELETE" });
      setMessage("review-message", "Review deleted.");
      if (typeof onReviewCreated === "function") {
        await onReviewCreated();
      }
      await loadRecentReviews();
    } catch (error) {
      setMessage("review-message", error.message, "error");
    }
  });
}

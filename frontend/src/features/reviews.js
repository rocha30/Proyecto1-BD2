import { api } from "../api/client";
import { setMessage } from "../utils/dom";
import { escapeHtml, formatDate } from "../utils/format";

export async function loadRecentReviews() {
  const response = await api("/reviews/enriched?limit=8&sort=createdAt&order=desc");
  const container = document.getElementById("reviews-list");

  if (!response.data.length) {
    container.innerHTML = "<p class='small'>No reviews yet.</p>";
    return;
  }

  container.innerHTML = response.data
    .map(
      (review) => `
        <article class="result-card">
          <strong>${escapeHtml(review.restaurant?.name || "Unknown restaurant")}</strong>
          <div class="small">user ${escapeHtml(review.user?.name || "Unknown")} | rating ${review.rating}</div>
          <div>${escapeHtml(review.comment || "")}</div>
          <div class="small">${formatDate(review.createdAt)}</div>
        </article>
      `
    )
    .join("");
}

async function createReview() {
  const payload = {
    userId: document.getElementById("review-user").value,
    restaurantId: document.getElementById("review-restaurant").value,
    rating: Number(document.getElementById("review-rating").value),
    comment: document.getElementById("review-comment").value.trim()
  };

  const review = await api("/reviews", {
    method: "POST",
    body: JSON.stringify(payload)
  });

  setMessage("review-message", `Review created: ${review._id}`);
  document.getElementById("review-comment").value = "";
  return review;
}

export function setupReviews(onReviewCreated) {
  document.getElementById("review-form").addEventListener("submit", async (event) => {
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
}

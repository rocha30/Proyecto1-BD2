const { ObjectId } = require("mongodb");

const { getCollection } = require("../db");

async function refreshRestaurantRating(restaurantId, session) {
  const normalizedRestaurantId = typeof restaurantId === "string"
    ? new ObjectId(restaurantId)
    : restaurantId;

  const reviewsCollection = getCollection("reviews");
  const restaurantsCollection = getCollection("Restaurant");

  const aggregation = await reviewsCollection
    .aggregate(
      [
        { $match: { restaurantId: normalizedRestaurantId } },
        {
          $group: {
            _id: "$restaurantId",
            averageRating: { $avg: "$rating" },
            totalReviews: { $sum: 1 }
          }
        }
      ],
      { session }
    )
    .toArray();

  if (aggregation.length === 0) {
    await restaurantsCollection.updateOne(
      { _id: normalizedRestaurantId },
      { $set: { rating: 0, totalReviews: 0 } },
      { session }
    );
    return;
  }

  const [{ averageRating, totalReviews }] = aggregation;
  await restaurantsCollection.updateOne(
    { _id: normalizedRestaurantId },
    {
      $set: {
        rating: Number(averageRating.toFixed(2)),
        totalReviews
      }
    },
    { session }
  );
}

module.exports = {
  refreshRestaurantRating
};

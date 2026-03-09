const express = require("express");
const { ObjectId } = require("mongodb");

const { getCollection, startSession } = require("../db");
const { asyncHandler } = require("../utils/http");
const { toObjectId } = require("../utils/objectId");
const { buildFindConfig, parseFilter, parseLimit, parseSkip, parseSort } = require("../utils/query");
const { refreshRestaurantRating } = require("../utils/restaurantStats");

const router = express.Router();

function normalizeObjectIdFilter(filter, field) {
  if (!filter[field]) {
    return;
  }
  if (typeof filter[field] === "string" && ObjectId.isValid(filter[field])) {
    filter[field] = new ObjectId(filter[field]);
    return;
  }
  if (typeof filter[field] === "object" && Array.isArray(filter[field].$in)) {
    filter[field].$in = filter[field].$in.map((value) =>
      typeof value === "string" && ObjectId.isValid(value) ? new ObjectId(value) : value
    );
  }
  if (typeof filter[field] === "object" && Array.isArray(filter[field].$nin)) {
    filter[field].$nin = filter[field].$nin.map((value) =>
      typeof value === "string" && ObjectId.isValid(value) ? new ObjectId(value) : value
    );
  }
}

async function runWithOptionalTransaction(work) {
  const session = startSession();
  try {
    session.startTransaction();
    const result = await work(session);
    await session.commitTransaction();
    return result;
  } catch (error) {
    try {
      await session.abortTransaction();
    } catch (_abortError) {
      // no-op
    }

    const unsupportedTransaction = /Transaction numbers are only allowed|replica set|mongos/i.test(error.message);
    if (!unsupportedTransaction) {
      throw error;
    }

    return work(undefined);
  } finally {
    await session.endSession();
  }
}

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const reviewsCollection = getCollection("reviews");
    const { filter, options } = buildFindConfig(req.query, { createdAt: -1 });
    normalizeObjectIdFilter(filter, "userId");
    normalizeObjectIdFilter(filter, "restaurantId");

    const [data, total] = await Promise.all([
      reviewsCollection.find(filter, options).toArray(),
      reviewsCollection.countDocuments(filter)
    ]);

    res.json({
      data,
      meta: {
        total,
        skip: options.skip,
        limit: options.limit
      }
    });
  })
);

router.get(
  "/enriched",
  asyncHandler(async (req, res) => {
    const reviewsCollection = getCollection("reviews");
    const filter = parseFilter(req.query);
    normalizeObjectIdFilter(filter, "userId");
    normalizeObjectIdFilter(filter, "restaurantId");

    const skip = parseSkip(req.query);
    const limit = parseLimit(req.query);
    const sort = parseSort(req.query, { createdAt: -1 });
    const pipeline = [
      { $match: filter },
      { $sort: sort },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user"
        }
      },
      {
        $lookup: {
          from: "Restaurant",
          localField: "restaurantId",
          foreignField: "_id",
          as: "restaurant"
        }
      },
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
      { $unwind: { path: "$restaurant", preserveNullAndEmptyArrays: true } },
      { $skip: skip },
      { $limit: limit }
    ];

    const [data, totalResult] = await Promise.all([
      reviewsCollection.aggregate(pipeline).toArray(),
      reviewsCollection.aggregate([{ $match: filter }, { $count: "count" }]).toArray()
    ]);

    res.json({
      data,
      meta: {
        total: totalResult[0]?.count || 0,
        skip,
        limit,
        lookupCollections: ["users", "Restaurant"]
      }
    });
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const reviewsCollection = getCollection("reviews");
    const review = await reviewsCollection.findOne({ _id: toObjectId(req.params.id) });

    if (!review) {
      return res.status(404).json({ error: "Review not found" });
    }

    res.json(review);
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const usersCollection = getCollection("users");
    const restaurantsCollection = getCollection("Restaurant");
    const reviewsCollection = getCollection("reviews");

    const userId = toObjectId(req.body.userId, "userId");
    const restaurantId = toObjectId(req.body.restaurantId, "restaurantId");
    const rating = Number(req.body.rating);
    const comment = req.body.comment || "";

    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ error: "rating must be between 1 and 5" });
    }

    const [user, restaurant] = await Promise.all([
      usersCollection.findOne({ _id: userId }),
      restaurantsCollection.findOne({ _id: restaurantId })
    ]);

    if (!user || !restaurant) {
      return res.status(400).json({ error: "Invalid userId or restaurantId" });
    }

    let createdId;
    await runWithOptionalTransaction(async (session) => {
      const payload = {
        userId,
        restaurantId,
        rating,
        comment,
        createdAt: new Date()
      };
      const result = await reviewsCollection.insertOne(payload, { session });
      createdId = result.insertedId;
      await refreshRestaurantRating(restaurantId, session);
    });

    const created = await reviewsCollection.findOne({ _id: createdId });
    res.status(201).json(created);
  })
);

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const reviewsCollection = getCollection("reviews");
    const id = toObjectId(req.params.id);
    const current = await reviewsCollection.findOne({ _id: id });
    if (!current) {
      return res.status(404).json({ error: "Review not found" });
    }

    const update = {};
    if (req.body.rating !== undefined) {
      const rating = Number(req.body.rating);
      if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
        return res.status(400).json({ error: "rating must be between 1 and 5" });
      }
      update.rating = rating;
    }
    if (req.body.comment !== undefined) {
      update.comment = req.body.comment;
    }
    if (req.body.userId !== undefined) {
      update.userId = toObjectId(req.body.userId, "userId");
    }
    if (req.body.restaurantId !== undefined) {
      update.restaurantId = toObjectId(req.body.restaurantId, "restaurantId");
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }

    await runWithOptionalTransaction(async (session) => {
      await reviewsCollection.updateOne({ _id: id }, { $set: update }, { session });
      const oldRestaurantId = current.restaurantId;
      const newRestaurantId = update.restaurantId || current.restaurantId;
      await refreshRestaurantRating(oldRestaurantId, session);
      if (String(oldRestaurantId) !== String(newRestaurantId)) {
        await refreshRestaurantRating(newRestaurantId, session);
      }
    });

    const updated = await reviewsCollection.findOne({ _id: id });
    res.json(updated);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const reviewsCollection = getCollection("reviews");
    const id = toObjectId(req.params.id);
    const current = await reviewsCollection.findOne({ _id: id });
    if (!current) {
      return res.status(404).json({ error: "Review not found" });
    }

    await runWithOptionalTransaction(async (session) => {
      await reviewsCollection.deleteOne({ _id: id }, { session });
      await refreshRestaurantRating(current.restaurantId, session);
    });

    res.status(204).send();
  })
);

module.exports = router;

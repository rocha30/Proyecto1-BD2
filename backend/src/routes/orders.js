const express = require("express");
const { ObjectId } = require("mongodb");

const { getCollection } = require("../db");
const { asyncHandler } = require("../utils/http");
const { toObjectId } = require("../utils/objectId");
const { buildFindConfig, parseFilter, parseLimit, parseSkip, parseSort } = require("../utils/query");
const { runWithOptionalTransaction } = require("../utils/transaction");

const router = express.Router();

const VALID_STATUS = ["pending", "confirmed", "preparing", "dispatched", "delivered", "cancelled"];

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

function normalizeItems(rawItems) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return [];
  }

  return rawItems
    .map((item) => ({
      menuItemId: item.menuItemId ? new ObjectId(item.menuItemId) : undefined,
      nombre: item.nombre ?? item.name,
      precio: Number(item.precio ?? item.price),
      quantity: Number(item.quantity)
    }))
    .filter((item) => item.nombre && Number.isFinite(item.precio) && Number.isFinite(item.quantity) && item.quantity > 0);
}

function calculateTotal(items) {
  return Number(
    items
      .reduce((total, item) => total + item.precio * item.quantity, 0)
      .toFixed(2)
  );
}

router.post(
  "/many",
  asyncHandler(async (req, res) => {
    const ordersCollection = getCollection("orders");
    const docs = req.body;
    if (!Array.isArray(docs) || docs.length === 0) {
      return res.status(400).json({ error: "Body must be a non-empty array of orders" });
    }
    const now = new Date();
    const prepared = docs.map((d) => {
      const items = normalizeItems(d.items);
      const status = VALID_STATUS.includes(d.status) ? d.status : "pending";
      return {
        userId: toObjectId(d.userId, "userId"),
        restaurantId: toObjectId(d.restaurantId, "restaurantId"),
        items,
        totalAmount: calculateTotal(items),
        status,
        statusHistory: [{ status, at: now }],
        createdAt: now,
        updatedAt: now
      };
    });
    const result = await ordersCollection.insertMany(prepared, { ordered: false });
    res.status(201).json({ insertedCount: result.insertedCount, insertedIds: result.insertedIds });
  })
);

router.patch(
  "/bulk-status",
  asyncHandler(async (req, res) => {
    const ordersCollection = getCollection("orders");
    const { filter = {}, status } = req.body;
    if (!status || !VALID_STATUS.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${VALID_STATUS.join(", ")}` });
    }
    normalizeObjectIdFilter(filter, "userId");
    normalizeObjectIdFilter(filter, "restaurantId");
    const now = new Date();
    const result = await ordersCollection.updateMany(
      filter,
      {
        $set: { status, updatedAt: now },
        $push: { statusHistory: { status, at: now } }
      }
    );
    res.json({ matchedCount: result.matchedCount, modifiedCount: result.modifiedCount });
  })
);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const ordersCollection = getCollection("orders");
    const { filter, options } = buildFindConfig(req.query, { createdAt: -1 });
    normalizeObjectIdFilter(filter, "userId");
    normalizeObjectIdFilter(filter, "restaurantId");

    const [data, total] = await Promise.all([
      ordersCollection.find(filter, options).toArray(),
      ordersCollection.countDocuments(filter)
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
    const ordersCollection = getCollection("orders");
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
      ordersCollection.aggregate(pipeline).toArray(),
      ordersCollection.aggregate([{ $match: filter }, { $count: "count" }]).toArray()
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
  "/:id/status-history",
  asyncHandler(async (req, res) => {
    const ordersCollection = getCollection("orders");
    const order = await ordersCollection.findOne(
      { _id: toObjectId(req.params.id) },
      { projection: { statusHistory: 1, status: 1 } }
    );

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.json({
      status: order.status,
      statusHistory: order.statusHistory || []
    });
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const ordersCollection = getCollection("orders");
    const order = await ordersCollection.findOne({ _id: toObjectId(req.params.id) });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.json(order);
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const usersCollection = getCollection("users");
    const restaurantsCollection = getCollection("Restaurant");
    const ordersCollection = getCollection("orders");

    const userId = toObjectId(req.body.userId, "userId");
    const restaurantId = toObjectId(req.body.restaurantId, "restaurantId");
    const items = normalizeItems(req.body.items);

    if (items.length === 0) {
      return res.status(400).json({ error: "items must contain at least one valid item" });
    }

    const [user, restaurant] = await Promise.all([
      usersCollection.findOne({ _id: userId }),
      restaurantsCollection.findOne({ _id: restaurantId })
    ]);

    if (!user || !restaurant) {
      return res.status(400).json({ error: "Invalid userId or restaurantId" });
    }

    const status = VALID_STATUS.includes(req.body.status) ? req.body.status : "pending";
    const now = new Date();

    let createdId;
    await runWithOptionalTransaction(async (session) => {
      // Decrement inventory for each menu item
      for (const item of items) {
        if (item.menuItemId) {
          await restaurantsCollection.updateOne(
            { _id: restaurantId, "menu._id": item.menuItemId },
            { $inc: { "menu.$.inventarioDisponible": -item.quantity } },
            { session }
          );
        }
      }

      const payload = {
        userId,
        restaurantId,
        items,
        totalAmount: calculateTotal(items),
        status,
        statusHistory: [{ status, at: now }],
        createdAt: now,
        updatedAt: now
      };

      const result = await ordersCollection.insertOne(payload, { session });
      createdId = result.insertedId;
    });

    const created = await ordersCollection.findOne({ _id: createdId });
    res.status(201).json(created);
  })
);

router.patch(
  "/:id/status",
  asyncHandler(async (req, res) => {
    const ordersCollection = getCollection("orders");
    const status = req.body.status;
    if (!VALID_STATUS.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${VALID_STATUS.join(", ")}` });
    }

    const orderId = toObjectId(req.params.id);
    const current = await ordersCollection.findOne(
      { _id: orderId },
      { projection: { status: 1 } }
    );

    if (!current) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (current.status === "cancelled") {
      return res.status(400).json({ error: "Cancelled orders cannot change status" });
    }

    const order = await ordersCollection.findOneAndUpdate(
      { _id: orderId },
      {
        $set: { status, updatedAt: new Date() },
        $push: { statusHistory: { status, at: new Date() } }
      },
      { returnDocument: "after" }
    );

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.json(order);
  })
);

router.patch(
  "/:id/cancel",
  asyncHandler(async (req, res) => {
    const restaurantsCollection = getCollection("Restaurant");
    const ordersCollection = getCollection("orders");
    const current = await ordersCollection.findOne({ _id: toObjectId(req.params.id) });

    if (!current) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (current.status === "dispatched") {
      return res.status(400).json({ error: "Dispatched orders cannot be cancelled" });
    }

    if (current.status === "delivered") {
      return res.status(400).json({ error: "Delivered orders cannot be cancelled" });
    }

    if (current.status === "cancelled") {
      return res.status(400).json({ error: "Order is already cancelled" });
    }

    let order;
    await runWithOptionalTransaction(async (session) => {
      // Restore inventory for each menu item
      for (const item of current.items || []) {
        if (item.menuItemId) {
          await restaurantsCollection.updateOne(
            { _id: current.restaurantId, "menu._id": item.menuItemId },
            { $inc: { "menu.$.inventarioDisponible": item.quantity } },
            { session }
          );
        }
      }

      order = await ordersCollection.findOneAndUpdate(
        { _id: current._id },
        {
          $set: { status: "cancelled", updatedAt: new Date() },
          $push: { statusHistory: { status: "cancelled", at: new Date() } }
        },
        { returnDocument: "after", session }
      );
    });

    res.json(order);
  })
);

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const ordersCollection = getCollection("orders");
    const update = {};
    const orderId = toObjectId(req.params.id);
    let current = null;

    if (req.body.items !== undefined) {
      const items = normalizeItems(req.body.items);
      if (items.length === 0) {
        return res.status(400).json({ error: "items must contain at least one valid item" });
      }
      update.items = items;
      update.totalAmount = calculateTotal(items);
    }

    if (req.body.status !== undefined) {
      if (!VALID_STATUS.includes(req.body.status)) {
        return res.status(400).json({ error: `status must be one of: ${VALID_STATUS.join(", ")}` });
      }

      current = await ordersCollection.findOne(
        { _id: orderId },
        { projection: { status: 1 } }
      );

      if (!current) {
        return res.status(404).json({ error: "Order not found" });
      }

      if (current.status === "cancelled" && req.body.status !== "cancelled") {
        return res.status(400).json({ error: "Cancelled orders cannot change status" });
      }

      update.status = req.body.status;
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }

    update.updatedAt = new Date();
    const updates = { $set: update };

    if (update.status) {
      updates.$push = {
        statusHistory: { status: update.status, at: new Date() }
      };
    }

    const order = await ordersCollection.findOneAndUpdate(
      { _id: orderId },
      updates,
      { returnDocument: "after" }
    );

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.json(order);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const ordersCollection = getCollection("orders");
    const result = await ordersCollection.deleteOne({ _id: toObjectId(req.params.id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.status(204).send();
  })
);

module.exports = router;

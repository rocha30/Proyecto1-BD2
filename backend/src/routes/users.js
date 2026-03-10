const express = require("express");
const { ObjectId } = require("mongodb");

const { getCollection } = require("../db");
const { asyncHandler } = require("../utils/http");
const { toObjectId } = require("../utils/objectId");
const { buildFindConfig } = require("../utils/query");

const router = express.Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const usersCollection = getCollection("users");
    const { filter, options } = buildFindConfig(req.query, { createdAt: -1 });
    const [data, total] = await Promise.all([
      usersCollection.find(filter, options).toArray(),
      usersCollection.countDocuments(filter)
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
  "/:id",
  asyncHandler(async (req, res) => {
    const usersCollection = getCollection("users");
    const user = await usersCollection.findOne({ _id: toObjectId(req.params.id) });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const usersCollection = getCollection("users");
    const payload = {
      name: req.body.name,
      email: req.body.email,
      favoritos: Array.isArray(req.body.favoritos) ? req.body.favoritos : [],
      createdAt: new Date()
    };

    if (!payload.name || !payload.email) {
      return res.status(400).json({ error: "name and email are required" });
    }

    const result = await usersCollection.insertOne(payload);
    const created = await usersCollection.findOne({ _id: result.insertedId });
    res.status(201).json(created);
  })
);

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const usersCollection = getCollection("users");
    const update = {};

    for (const field of ["name", "email", "favoritos"]) {
      if (req.body[field] !== undefined) {
        update[field] = req.body[field];
      }
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    const id = toObjectId(req.params.id);
    const result = await usersCollection.findOneAndUpdate(
      { _id: id },
      { $set: update },
      { returnDocument: "after" }
    );

    if (!result) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(result);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const usersCollection = getCollection("users");
    const result = await usersCollection.deleteOne({ _id: toObjectId(req.params.id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(204).send();
  })
);

router.post(
  "/many",
  asyncHandler(async (req, res) => {
    const usersCollection = getCollection("users");
    const docs = req.body;
    if (!Array.isArray(docs) || docs.length === 0) {
      return res.status(400).json({ error: "Body must be a non-empty array of users" });
    }
    const prepared = docs.map((d) => ({
      name: d.name,
      email: d.email,
      favoritos: Array.isArray(d.favoritos) ? d.favoritos : [],
      telefono: d.telefono || null,
      direccion: d.direccion || null,
      createdAt: new Date()
    }));
    const result = await usersCollection.insertMany(prepared, { ordered: false });
    res.status(201).json({ insertedCount: result.insertedCount, insertedIds: result.insertedIds });
  })
);

router.post(
  "/:id/favoritos",
  asyncHandler(async (req, res) => {
    const usersCollection = getCollection("users");
    const restaurantId = new ObjectId(req.body.restaurantId);
    const result = await usersCollection.findOneAndUpdate(
      { _id: toObjectId(req.params.id) },
      { $addToSet: { favoritos: restaurantId } },
      { returnDocument: "after" }
    );
    if (!result) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(result);
  })
);

router.delete(
  "/:id/favoritos/:restaurantId",
  asyncHandler(async (req, res) => {
    const usersCollection = getCollection("users");
    const restaurantId = new ObjectId(req.params.restaurantId);
    const result = await usersCollection.findOneAndUpdate(
      { _id: toObjectId(req.params.id) },
      { $pull: { favoritos: restaurantId } },
      { returnDocument: "after" }
    );
    if (!result) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(result);
  })
);

module.exports = router;

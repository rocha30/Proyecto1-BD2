const express = require("express");

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

module.exports = router;

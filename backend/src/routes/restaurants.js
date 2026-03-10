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
    const restaurantsCollection = getCollection("Restaurant");
    const { filter, options } = buildFindConfig(
      req.query,
      { rating: -1 },
      { limitFallback: undefined, limitMax: null }
    );

    if (req.query.q) {
      filter.$or = [
        { name: { $regex: req.query.q, $options: "i" } },
        { tipo_comida: { $regex: req.query.q, $options: "i" } }
      ];
    }

    const [data, total] = await Promise.all([
      restaurantsCollection.find(filter, options).toArray(),
      restaurantsCollection.countDocuments(filter)
    ]);

    res.json({
      data,
      meta: {
        total,
        skip: options.skip,
        limit: options.limit ?? null
      }
    });
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const restaurantsCollection = getCollection("Restaurant");
    const restaurant = await restaurantsCollection.findOne({ _id: toObjectId(req.params.id) });

    if (!restaurant) {
      return res.status(404).json({ error: "Restaurant not found" });
    }

    res.json(restaurant);
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const restaurantsCollection = getCollection("Restaurant");

    const payload = {
      name: req.body.name,
      tipo_comida: req.body.tipo_comida,
      rating: Number(req.body.rating) || 0,
      totalReviews: Number(req.body.totalReviews) || 0,
      location: req.body.location || null,
      menu: Array.isArray(req.body.menu) ? req.body.menu : [],
      createdAt: new Date()
    };

    if (!payload.name || !payload.tipo_comida) {
      return res.status(400).json({ error: "name and tipo_comida are required" });
    }

    const result = await restaurantsCollection.insertOne(payload);
    const created = await restaurantsCollection.findOne({ _id: result.insertedId });
    res.status(201).json(created);
  })
);

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const restaurantsCollection = getCollection("Restaurant");
    const update = {};

    for (const field of ["name", "tipo_comida", "rating", "totalReviews", "location", "menu"]) {
      if (req.body[field] !== undefined) {
        update[field] = req.body[field];
      }
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    const restaurant = await restaurantsCollection.findOneAndUpdate(
      { _id: toObjectId(req.params.id) },
      { $set: update },
      { returnDocument: "after" }
    );

    if (!restaurant) {
      return res.status(404).json({ error: "Restaurant not found" });
    }

    res.json(restaurant);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const restaurantsCollection = getCollection("Restaurant");
    const result = await restaurantsCollection.deleteOne({ _id: toObjectId(req.params.id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Restaurant not found" });
    }

    res.status(204).send();
  })
);

router.post(
  "/:id/menu",
  asyncHandler(async (req, res) => {
    const restaurantsCollection = getCollection("Restaurant");
    const { nombre, descripcion, precio, categoria, inventarioDisponible, activo } = req.body;
    if (!nombre || precio === undefined) {
      return res.status(400).json({ error: "nombre and precio are required" });
    }
    const menuItem = {
      _id: new ObjectId(),
      nombre,
      descripcion: descripcion || "",
      precio: Number(precio),
      categoria: categoria || "",
      inventarioDisponible: Number(inventarioDisponible) || 0,
      activo: activo !== undefined ? Boolean(activo) : true
    };
    const result = await restaurantsCollection.findOneAndUpdate(
      { _id: toObjectId(req.params.id) },
      { $push: { menu: menuItem } },
      { returnDocument: "after" }
    );
    if (!result) {
      return res.status(404).json({ error: "Restaurant not found" });
    }
    res.status(201).json(result);
  })
);

router.patch(
  "/:id/menu/:menuItemId",
  asyncHandler(async (req, res) => {
    const restaurantsCollection = getCollection("Restaurant");
    const menuItemId = new ObjectId(req.params.menuItemId);
    const allowed = ["nombre", "descripcion", "precio", "categoria", "inventarioDisponible", "activo"];
    const setFields = {};
    for (const field of allowed) {
      if (req.body[field] !== undefined) {
        setFields[`menu.$[item].${field}`] = req.body[field];
      }
    }
    if (Object.keys(setFields).length === 0) {
      return res.status(400).json({ error: "No valid menu fields to update" });
    }
    const result = await restaurantsCollection.findOneAndUpdate(
      { _id: toObjectId(req.params.id) },
      { $set: setFields },
      { arrayFilters: [{ "item._id": menuItemId }], returnDocument: "after" }
    );
    if (!result) {
      return res.status(404).json({ error: "Restaurant or menu item not found" });
    }
    res.json(result);
  })
);

router.delete(
  "/:id/menu/:menuItemId",
  asyncHandler(async (req, res) => {
    const restaurantsCollection = getCollection("Restaurant");
    const menuItemId = new ObjectId(req.params.menuItemId);
    const result = await restaurantsCollection.findOneAndUpdate(
      { _id: toObjectId(req.params.id) },
      { $pull: { menu: { _id: menuItemId } } },
      { returnDocument: "after" }
    );
    if (!result) {
      return res.status(404).json({ error: "Restaurant or menu item not found" });
    }
    res.json(result);
  })
);

module.exports = router;

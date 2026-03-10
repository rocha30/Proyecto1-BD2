const express = require("express");

const { getCollection } = require("../db");
const { asyncHandler } = require("../utils/http");
const { parseLimit } = require("../utils/query");

const router = express.Router();

router.get(
  "/overview",
  asyncHandler(async (_req, res) => {
    const usersCollection = getCollection("users");
    const restaurantsCollection = getCollection("Restaurant");
    const ordersCollection = getCollection("orders");
    const reviewsCollection = getCollection("reviews");

    const [users, restaurants, orders, reviews] = await Promise.all([
      usersCollection.countDocuments(),
      restaurantsCollection.countDocuments(),
      ordersCollection.countDocuments(),
      reviewsCollection.countDocuments()
    ]);

    res.json({
      users,
      restaurants,
      orders,
      reviews
    });
  })
);

router.get(
  "/top-restaurants",
  asyncHandler(async (req, res) => {
    const restaurantsCollection = getCollection("Restaurant");
    const limit = parseLimit(req.query, 5, 20);

    const data = await restaurantsCollection
      .aggregate([
        { $match: { totalReviews: { $gt: 0 } } },
        { $sort: { rating: -1, totalReviews: -1 } },
        { $limit: limit },
        {
          $project: {
            name: 1,
            tipo_comida: 1,
            rating: 1,
            totalReviews: 1
          }
        }
      ])
      .toArray();

    res.json({
      data,
      meta: {
        aggregation: true,
        metric: "top_restaurants_by_rating"
      }
    });
  })
);

router.get(
  "/orders-by-status",
  asyncHandler(async (_req, res) => {
    const ordersCollection = getCollection("orders");
    const data = await ordersCollection
      .aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            revenue: { $sum: "$totalAmount" }
          }
        },
        { $sort: { count: -1 } }
      ])
      .toArray();

    res.json({
      data,
      meta: {
        aggregation: true,
        metric: "orders_by_status"
      }
    });
  })
);

router.get(
  "/monthly-sales",
  asyncHandler(async (req, res) => {
    const ordersCollection = getCollection("orders");
    const year = Number.parseInt(req.query.year, 10);
    const hasYear = Number.isFinite(year);

    const match = hasYear
      ? {
          createdAt: {
            $gte: new Date(`${year}-01-01T00:00:00.000Z`),
            $lt: new Date(`${year + 1}-01-01T00:00:00.000Z`)
          }
        }
      : {};

    const data = await ordersCollection
      .aggregate([
        { $match: match },
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" }
            },
            orders: { $sum: 1 },
            totalSales: { $sum: "$totalAmount" }
          }
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } }
      ])
      .toArray();

    res.json({
      data,
      meta: {
        aggregation: true,
        metric: "monthly_sales",
        year: hasYear ? year : null
      }
    });
  })
);

router.get(
  "/top-dishes",
  asyncHandler(async (req, res) => {
    const ordersCollection = getCollection("orders");
    const limit = parseLimit(req.query, 10, 30);

    const data = await ordersCollection
      .aggregate([
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.nombre",
            totalQuantity: { $sum: "$items.quantity" },
            totalRevenue: { $sum: { $multiply: ["$items.precio", "$items.quantity"] } }
          }
        },
        { $sort: { totalQuantity: -1 } },
        { $limit: limit }
      ])
      .toArray();

    res.json({
      data,
      meta: {
        aggregation: true,
        metric: "top_dishes"
      }
    });
  })
);

router.get(
  "/distinct-food-types",
  asyncHandler(async (_req, res) => {
    const restaurantsCollection = getCollection("Restaurant");
    const types = await restaurantsCollection.distinct("tipo_comida");
    res.json({ data: types, meta: { count: types.length } });
  })
);

router.get(
  "/revenue-by-restaurant",
  asyncHandler(async (req, res) => {
    const ordersCollection = getCollection("orders");
    const limit = parseLimit(req.query, 10, 50);

    const data = await ordersCollection
      .aggregate([
        { $match: { status: { $ne: "cancelled" } } },
        {
          $group: {
            _id: "$restaurantId",
            totalRevenue: { $sum: "$totalAmount" },
            totalOrders: { $sum: 1 }
          }
        },
        { $sort: { totalRevenue: -1 } },
        { $limit: limit },
        {
          $lookup: {
            from: "Restaurant",
            localField: "_id",
            foreignField: "_id",
            as: "restaurant"
          }
        },
        { $unwind: { path: "$restaurant", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 1,
            totalRevenue: 1,
            totalOrders: 1,
            restaurantName: "$restaurant.name",
            tipo_comida: "$restaurant.tipo_comida"
          }
        }
      ])
      .toArray();

    res.json({
      data,
      meta: {
        aggregation: true,
        metric: "revenue_by_restaurant",
        lookupCollection: "Restaurant"
      }
    });
  })
);

router.get(
  "/user-spending",
  asyncHandler(async (req, res) => {
    const ordersCollection = getCollection("orders");
    const limit = parseLimit(req.query, 10, 50);

    const data = await ordersCollection
      .aggregate([
        { $match: { status: { $ne: "cancelled" } } },
        {
          $group: {
            _id: "$userId",
            totalSpent: { $sum: "$totalAmount" },
            totalOrders: { $sum: 1 }
          }
        },
        { $sort: { totalSpent: -1 } },
        { $limit: limit },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "_id",
            as: "user"
          }
        },
        { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 1,
            totalSpent: 1,
            totalOrders: 1,
            userName: "$user.name",
            userEmail: "$user.email"
          }
        }
      ])
      .toArray();

    res.json({
      data,
      meta: {
        aggregation: true,
        metric: "user_spending",
        lookupCollection: "users"
      }
    });
  })
);

module.exports = router;

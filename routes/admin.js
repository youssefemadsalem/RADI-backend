const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const User = require("../models/User");

router.get("/overview", async (req, res) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    // 1. Core Total Aggregations
    const revenueAggregation = await Order.aggregate([
      { $group: { _id: null, totalSales: { $sum: "$total" } } }
    ]);
    const totalRevenue = revenueAggregation[0]?.totalSales || 0;
    const totalOrdersCount = await Order.countDocuments();
    const totalCustomersCount = await User.countDocuments({ role: "customer" });

    // 2. Analytical Trends (Current 30 Days vs Previous 30 Days)
    const currentPeriodRevenue = await Order.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: null, sum: { $sum: "$total" } } }
    ]);
    const prevPeriodRevenue = await Order.aggregate([
      { $match: { createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo } } },
      { $group: { _id: null, sum: { $sum: "$total" } } }
    ]);

    const currentRevenueSum = currentPeriodRevenue[0]?.sum || 0;
    const prevRevenueSum = prevPeriodRevenue[0]?.sum || 0;
    let revenueChange = "+0.0%";
    if (prevRevenueSum > 0) {
      const pct = ((currentRevenueSum - prevRevenueSum) / prevRevenueSum) * 100;
      revenueChange = `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
    }

    const currentOrders = await Order.countDocuments({ createdAt: { $gte: thirtyDaysAgo } });
    const prevOrders = await Order.countDocuments({ createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo } });
    let ordersChange = "+0.0%";
    if (prevOrders > 0) {
      const pct = ((currentOrders - prevOrders) / prevOrders) * 100;
      ordersChange = `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
    }

    const currentCustomers = await User.countDocuments({ role: "customer", createdAt: { $gte: thirtyDaysAgo } });
    const prevCustomers = await User.countDocuments({ role: "customer", createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo } });
    let customersChange = "+0.0%";
    if (prevCustomers > 0) {
      const pct = ((currentCustomers - prevCustomers) / prevCustomers) * 100;
      customersChange = `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
    }

    // 3. Recent Orders Map
    const rawRecentOrders = await Order.find().sort({ createdAt: -1 }).limit(5);
    const recentOrdersMapped = rawRecentOrders.map(order => {
      let statusClass = "bg-neutral-100 text-neutral-400"; 
      if (order.status === "CONFIRMED") statusClass = "bg-black text-white";
      if (order.status === "PENDING") statusClass = "border border-black text-black";

      return {
        id: order.orderCode,
        date: new Date(order.createdAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric"
        }),
        customer: `${order.customerDetails?.firstName || 'Client'} ${order.customerDetails?.lastName || ''}`.trim(),
        amount: `E£${(order.total || 0).toFixed(2)}`,
        status: order.status,
        statusClass
      };
    });

    res.json({
      metrics: {
        revenue: `E£${totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        revenueChange,
        orders: totalOrdersCount.toLocaleString(),
        ordersChange,
        customers: totalCustomersCount.toLocaleString(),
        customersChange
      },
      recentOrders: recentOrdersMapped
    });

  } catch (error) {
    res.status(500).json({ message: "Failed to compile analytical trends.", error: error.message });
  }
});

module.exports = router;
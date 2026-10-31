import { query } from "./_generated/server.js";

const ACTIVE_ORDER_STATUSES = ["pending", "preparing", "ready"];
const BASE_STATUSES = ["pending", "preparing", "ready", "served", "completed", "cancelled"];

const round2 = (n) => Math.round(n * 100) / 100;

// Same shape as server/db.js getRestaurantStats(), so AdminDashboard's stats object is unchanged.
// "Today" uses the UTC day, matching SQLite date('now') in the Express version.
export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const orders = await ctx.db.query("orders").collect();
    const menuItems = await ctx.db.query("menuItems").collect();
    const pendingCalls = await ctx.db
      .query("waiterCalls")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();

    const now = new Date();
    const startOfTodayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

    let totalRevenue = 0;
    let todayOrders = 0;
    let todayRevenue = 0;
    let activeOrders = 0;
    const ordersByStatus = Object.fromEntries(BASE_STATUSES.map((s) => [s, 0]));

    for (const order of orders) {
      ordersByStatus[order.status] = (ordersByStatus[order.status] || 0) + 1;
      if (order.status !== "cancelled") {
        totalRevenue += order.totalAmount;
      }
      if (order.createdAt >= startOfTodayUtc) {
        todayOrders += 1;
        if (order.status !== "cancelled") todayRevenue += order.totalAmount;
      }
      if (ACTIVE_ORDER_STATUSES.includes(order.status)) activeOrders += 1;
    }

    // Popular items: sum quantity/sales per item name across non-cancelled orders.
    const itemTotals = new Map();
    for (const order of orders) {
      if (order.status === "cancelled") continue;
      const items = await ctx.db
        .query("orderItems")
        .withIndex("by_order", (q) => q.eq("orderId", order._id))
        .collect();
      for (const item of items) {
        const entry = itemTotals.get(item.name) || { name: item.name, total_quantity: 0, sales: 0 };
        entry.total_quantity += item.quantity;
        entry.sales += item.price * item.quantity;
        itemTotals.set(item.name, entry);
      }
    }
    const popularItems = [...itemTotals.values()]
      .sort((a, b) => b.total_quantity - a.total_quantity)
      .slice(0, 5)
      .map((e) => ({ name: e.name, total_quantity: e.total_quantity, total_sales: round2(e.sales) }));

    return {
      total_orders: orders.length,
      total_revenue: round2(totalRevenue),
      today_orders: todayOrders,
      today_revenue: round2(todayRevenue),
      active_orders: activeOrders,
      active_waiter_calls: pendingCalls.length,
      total_menu_items: menuItems.length,
      available_menu_items: menuItems.filter((m) => m.isAvailable).length,
      orders_by_status: ordersByStatus,
      popular_items: popularItems,
    };
  },
});

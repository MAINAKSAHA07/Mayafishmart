import { subDays, format, startOfDay } from "date-fns";
import type { Order, OrderItem, PaymentMethod, OrderStatus } from "@mayafishmart/shared/types";

export type DayPoint = { date: string; label: string; revenuePaise: number; orders: number };
export type ProductPoint = { name: string; qty: number; revenuePaise: number };
export type SlicePoint = { key: string; label: string; value: number };

function isRevenueOrder(o: Order) {
  return o.payment_status === "paid" || o.status === "picked_up";
}

export function aggregateSales(
  orders: Array<Order & { order_items?: OrderItem[] }>,
  days = 30
) {
  const end = startOfDay(new Date());
  const start = startOfDay(subDays(end, days - 1));

  const dayMap = new Map<string, DayPoint>();
  for (let i = 0; i < days; i++) {
    const d = startOfDay(subDays(end, days - 1 - i));
    const key = format(d, "yyyy-MM-dd");
    dayMap.set(key, {
      date: key,
      label: format(d, "d MMM"),
      revenuePaise: 0,
      orders: 0,
    });
  }

  const productMap = new Map<string, ProductPoint>();
  const paymentMap = new Map<PaymentMethod, number>();
  const statusMap = new Map<OrderStatus, number>();

  for (const order of orders) {
    if (order.status === "cancelled") continue;
    const created = new Date(order.created_at);
    if (created < start) continue;

    const key = format(startOfDay(created), "yyyy-MM-dd");
    const day = dayMap.get(key);
    if (day) {
      day.orders += 1;
      if (isRevenueOrder(order)) day.revenuePaise += order.total_paise;
    }

    paymentMap.set(
      order.payment_method,
      (paymentMap.get(order.payment_method) ?? 0) + 1
    );
    statusMap.set(order.status, (statusMap.get(order.status) ?? 0) + 1);

    for (const item of order.order_items ?? []) {
      const existing = productMap.get(item.product_name) ?? {
        name: item.product_name,
        qty: 0,
        revenuePaise: 0,
      };
      existing.qty += Number(item.qty);
      existing.revenuePaise += item.line_total_paise;
      productMap.set(item.product_name, existing);
    }
  }

  const series = Array.from(dayMap.values());
  const topProducts = Array.from(productMap.values())
    .sort((a, b) => b.revenuePaise - a.revenuePaise)
    .slice(0, 8);

  const paymentSlices: SlicePoint[] = Array.from(paymentMap.entries()).map(([key, value]) => ({
    key,
    label: key,
    value,
  }));

  const statusSlices: SlicePoint[] = Array.from(statusMap.entries()).map(([key, value]) => ({
    key,
    label: key.replace("_", " "),
    value,
  }));

  const revenueTotal = series.reduce((s, d) => s + d.revenuePaise, 0);
  const orderTotal = series.reduce((s, d) => s + d.orders, 0);

  return {
    series,
    topProducts,
    paymentSlices,
    statusSlices,
    revenueTotal,
    orderTotal,
    days,
  };
}

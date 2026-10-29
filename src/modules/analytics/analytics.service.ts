import { client } from "../../config/mongodb";
import { BOOKING_STATUS } from "../booking/booking.constant";
import Booking from "../booking/booking.model";
import { CONTACT_STATUS } from "../contact/contact.constant";
import Contact from "../contact/contact.model";
import { inventoryService } from "../inventory/inventory.service";
import { ORDER_STATUS, PAYMENT_STATUS } from "../order/order.constant";
import Order from "../order/order.model";
import { PRODUCT_STATUS } from "../product/product.constant";
import Product from "../product/product.model";
import {
  ANALYTICS_PERIOD,
  DEFAULT_ANALYTICS_PERIOD,
  TAnalyticsPeriod,
} from "./analytics.constant";
import {
  TAdminBookingsData,
  TAdminOrdersData,
  TAdminOverviewData,
  TAdminProductsData,
  TAdminSalesData,
  TTimeSeriesBucket,
  TUserActivityData,
  TUserOverviewData,
} from "./analytics.types";

interface PeriodRangeInfo {
  startDate: Date;
  endDate: Date;
  format: "%Y-%m-%d" | "%Y-%m";
  buckets: Array<{ date: string; label: string }>;
}

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export const getPeriodRangeInfo = (
  periodInput?: string,
): PeriodRangeInfo => {
  const period: TAnalyticsPeriod =
    periodInput === ANALYTICS_PERIOD.SEVEN_DAYS ||
    periodInput === ANALYTICS_PERIOD.THIRTY_DAYS ||
    periodInput === ANALYTICS_PERIOD.NINETY_DAYS ||
    periodInput === ANALYTICS_PERIOD.TWELVE_MONTHS
      ? periodInput
      : DEFAULT_ANALYTICS_PERIOD;

  const now = new Date();
  const endDate = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      23,
      59,
      59,
      999,
    ),
  );

  if (period === ANALYTICS_PERIOD.TWELVE_MONTHS) {
    const buckets: Array<{ date: string; label: string }> = [];
    const currentYear = now.getUTCFullYear();
    const currentMonth = now.getUTCMonth();

    for (let i = 11; i >= 0; i--) {
      const d = new Date(Date.UTC(currentYear, currentMonth - i, 1));
      const y = d.getUTCFullYear();
      const m = String(d.getUTCMonth() + 1).padStart(2, "0");
      const dateKey = `${y}-${m}`;
      const label = `${MONTH_NAMES[d.getUTCMonth()]} ${y}`;
      buckets.push({ date: dateKey, label });
    }

    const firstBucketDate = new Date(
      Date.UTC(currentYear, currentMonth - 11, 1, 0, 0, 0, 0),
    );

    return {
      startDate: firstBucketDate,
      endDate,
      format: "%Y-%m",
      buckets,
    };
  }

  const daysCount =
    period === ANALYTICS_PERIOD.SEVEN_DAYS
      ? 7
      : period === ANALYTICS_PERIOD.NINETY_DAYS
        ? 90
        : 30;

  const buckets: Array<{ date: string; label: string }> = [];
  const startDay = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - (daysCount - 1),
      0,
      0,
      0,
      0,
    ),
  );

  for (let i = 0; i < daysCount; i++) {
    const d = new Date(
      Date.UTC(
        startDay.getUTCFullYear(),
        startDay.getUTCMonth(),
        startDay.getUTCDate() + i,
      ),
    );
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    const dateKey = `${y}-${m}-${day}`;
    const label = `${MONTH_NAMES[d.getUTCMonth()]} ${d.getUTCDate()}`;
    buckets.push({ date: dateKey, label });
  }

  return {
    startDate: startDay,
    endDate,
    format: "%Y-%m-%d",
    buckets,
  };
};

const getAdminOverview = async (
  periodInput?: string,
): Promise<TAdminOverviewData> => {
  const period: TAnalyticsPeriod =
    periodInput === ANALYTICS_PERIOD.SEVEN_DAYS ||
    periodInput === ANALYTICS_PERIOD.THIRTY_DAYS ||
    periodInput === ANALYTICS_PERIOD.NINETY_DAYS ||
    periodInput === ANALYTICS_PERIOD.TWELVE_MONTHS
      ? periodInput
      : DEFAULT_ANALYTICS_PERIOD;

  const { startDate, endDate, format, buckets } =
    getPeriodRangeInfo(period);
  const db = client.db(process.env.MONGODB_DB || "enviro-shield");

  const [
    inventoryStats,
    publishedProductsCount,
    lifetimeOrderStats,
    periodOrderStats,
    orderStatusCounts,
    paymentStatusCounts,
    lifetimeBookingStats,
    periodBookingStats,
    bookingStatusCounts,
    totalCustomers,
    newCustomersInPeriod,
    totalInquiries,
    newInquiries,
    periodInquiries,
    orderTimelineAgg,
    bookingTimelineAgg,
    recentOrders,
    recentBookings,
    recentInquiries,
    lowStockList,
  ] = await Promise.all([
    // 1. Inventory stats
    inventoryService.getInventoryStats(),
    // 2. Published products count
    Product.countDocuments({ status: PRODUCT_STATUS.PUBLISHED }),

    // 3. Lifetime order stats (non-cancelled orders value & paid value)
    Order.aggregate([
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          lifetimeOrderValue: {
            $sum: {
              $cond: [
                { $ne: ["$status", ORDER_STATUS.CANCELLED] },
                "$totalAmount",
                0,
              ],
            },
          },
          lifetimePaidOrderValue: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$paymentStatus", PAYMENT_STATUS.PAID] },
                    { $ne: ["$status", ORDER_STATUS.CANCELLED] },
                  ],
                },
                "$totalAmount",
                0,
              ],
            },
          },
        },
      },
    ]),

    // 4. Period order stats
    Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: null,
          periodOrders: { $sum: 1 },
          orderValue: {
            $sum: {
              $cond: [
                { $ne: ["$status", ORDER_STATUS.CANCELLED] },
                "$totalAmount",
                0,
              ],
            },
          },
          paidOrderValue: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$paymentStatus", PAYMENT_STATUS.PAID] },
                    { $ne: ["$status", ORDER_STATUS.CANCELLED] },
                  ],
                },
                "$totalAmount",
                0,
              ],
            },
          },
          paidOrdersCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$paymentStatus", PAYMENT_STATUS.PAID] },
                    { $ne: ["$status", ORDER_STATUS.CANCELLED] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          nonCancelledCount: {
            $sum: {
              $cond: [
                { $ne: ["$status", ORDER_STATUS.CANCELLED] },
                1,
                0,
              ],
            },
          },
        },
      },
    ]),

    // 5. Order status counts
    Order.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]),

    // 6. Payment status counts in period
    Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: "$paymentStatus",
          count: { $sum: 1 },
        },
      },
    ]),

    // 7. Lifetime booking stats
    Booking.aggregate([
      {
        $group: {
          _id: null,
          totalBookings: { $sum: 1 },
          lifetimeBookingValue: {
            $sum: {
              $cond: [
                {
                  $not: {
                    $in: [
                      "$status",
                      [
                        BOOKING_STATUS.CANCELLED,
                        BOOKING_STATUS.REJECTED,
                      ],
                    ],
                  },
                },
                "$finalPrice",
                0,
              ],
            },
          },
        },
      },
    ]),

    // 8. Period booking stats
    Booking.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: null,
          periodBookings: { $sum: 1 },
          bookingValue: {
            $sum: {
              $cond: [
                {
                  $not: {
                    $in: [
                      "$status",
                      [
                        BOOKING_STATUS.CANCELLED,
                        BOOKING_STATUS.REJECTED,
                      ],
                    ],
                  },
                },
                "$finalPrice",
                0,
              ],
            },
          },
        },
      },
    ]),

    // 9. Booking status counts
    Booking.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]),

    // 10. Total customers (non-admin accounts)
    db.collection("user").countDocuments({ role: { $ne: "admin" } }),

    // 11. New customers in period
    db.collection("user").countDocuments({
      role: { $ne: "admin" },
      createdAt: { $gte: startDate, $lte: endDate },
    }),

    // 12. Total inquiries
    Contact.countDocuments({}),

    // 13. New inquiries
    Contact.countDocuments({ status: CONTACT_STATUS.NEW }),

    // 14. Period inquiries
    Contact.countDocuments({
      createdAt: { $gte: startDate, $lte: endDate },
    }),

    // 15. Order time series in period
    Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format,
              date: "$createdAt",
              timezone: "UTC",
            },
          },
          ordersCount: { $sum: 1 },
          orderValue: {
            $sum: {
              $cond: [
                { $ne: ["$status", ORDER_STATUS.CANCELLED] },
                "$totalAmount",
                0,
              ],
            },
          },
          paidOrderValue: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$paymentStatus", PAYMENT_STATUS.PAID] },
                    { $ne: ["$status", ORDER_STATUS.CANCELLED] },
                  ],
                },
                "$totalAmount",
                0,
              ],
            },
          },
        },
      },
    ]),

    // 16. Booking time series in period
    Booking.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format,
              date: "$createdAt",
              timezone: "UTC",
            },
          },
          bookingsCount: { $sum: 1 },
          bookingValue: {
            $sum: {
              $cond: [
                {
                  $not: {
                    $in: [
                      "$status",
                      [
                        BOOKING_STATUS.CANCELLED,
                        BOOKING_STATUS.REJECTED,
                      ],
                    ],
                  },
                },
                "$finalPrice",
                0,
              ],
            },
          },
        },
      },
    ]),

    // 17. Recent orders (last 5)
    Order.find(
      {},
      {
        orderNumber: 1,
        customer: 1,
        totalAmount: 1,
        paymentStatus: 1,
        status: 1,
        createdAt: 1,
      },
    )
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),

    // 18. Recent bookings (last 5)
    Booking.find(
      {},
      {
        bookingNumber: 1,
        serviceId: 1,
        isSiteVisit: 1,
        siteVisitDate: 1,
        finalPrice: 1,
        status: 1,
        createdAt: 1,
      },
    )
      .populate("serviceId", "name")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),

    // 19. Recent inquiries (last 5)
    Contact.find(
      {},
      {
        fullName: 1,
        email: 1,
        phoneNumber: 1,
        status: 1,
        createdAt: 1,
      },
    )
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),

    // 20. Low stock products (up to 5)
    Product.find(
      {
        $expr: {
          $lte: ["$stockQuantity", "$lowStockThreshold"],
        },
      },
      {
        name: 1,
        sku: 1,
        stockQuantity: 1,
        lowStockThreshold: 1,
        status: 1,
      },
    )
      .sort({ stockQuantity: 1 })
      .limit(5)
      .lean(),
  ]);

  // Build Status Maps
  const orderStatusMap: Record<string, number> = {
    pending: 0,
    confirmed: 0,
    processing: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
  };
  orderStatusCounts.forEach((item: { _id: string; count: number }) => {
    if (item._id) {
      orderStatusMap[item._id] = item.count;
    }
  });

  const bookingStatusMap: Record<string, number> = {
    pending: 0,
    confirmed: 0,
    "in-progress": 0,
    completed: 0,
    cancelled: 0,
    rejected: 0,
  };
  bookingStatusCounts.forEach((item: { _id: string; count: number }) => {
    if (item._id) {
      bookingStatusMap[item._id] = item.count;
    }
  });

  const paymentStatusMap: Record<string, number> = {
    pending: 0,
    paid: 0,
    failed: 0,
    refunded: 0,
  };
  paymentStatusCounts.forEach((item: { _id: string; count: number }) => {
    if (item._id) {
      paymentStatusMap[item._id] = item.count;
    }
  });

  // Build zero-filled timeline
  const orderTimeMap = new Map<
    string,
    { ordersCount: number; orderValue: number; paidOrderValue: number }
  >();
  orderTimelineAgg.forEach((item) => {
    orderTimeMap.set(item._id, {
      ordersCount: item.ordersCount || 0,
      orderValue: Math.round((item.orderValue || 0) * 100) / 100,
      paidOrderValue: Math.round((item.paidOrderValue || 0) * 100) / 100,
    });
  });

  const bookingTimeMap = new Map<
    string,
    { bookingsCount: number; bookingValue: number }
  >();
  bookingTimelineAgg.forEach((item) => {
    bookingTimeMap.set(item._id, {
      bookingsCount: item.bookingsCount || 0,
      bookingValue: Math.round((item.bookingValue || 0) * 100) / 100,
    });
  });

  const timeline: TTimeSeriesBucket[] = buckets.map((b) => {
    const o = orderTimeMap.get(b.date);
    const bk = bookingTimeMap.get(b.date);
    return {
      date: b.date,
      label: b.label,
      ordersCount: o?.ordersCount || 0,
      orderValue: o?.orderValue || 0,
      paidOrderValue: o?.paidOrderValue || 0,
      bookingsCount: bk?.bookingsCount || 0,
      bookingValue: bk?.bookingValue || 0,
    };
  });

  const periodOrdersData = periodOrderStats[0] || {
    periodOrders: 0,
    orderValue: 0,
    paidOrderValue: 0,
    paidOrdersCount: 0,
    nonCancelledCount: 0,
  };
  const lifetimeOrdersData = lifetimeOrderStats[0] || {
    totalOrders: 0,
    lifetimeOrderValue: 0,
    lifetimePaidOrderValue: 0,
  };
  const periodBookingsData = periodBookingStats[0] || {
    periodBookings: 0,
    bookingValue: 0,
  };
  const lifetimeBookingsData = lifetimeBookingStats[0] || {
    totalBookings: 0,
    lifetimeBookingValue: 0,
  };

  const averageOrderValue =
    periodOrdersData.nonCancelledCount > 0
      ? Math.round(
          (periodOrdersData.orderValue /
            periodOrdersData.nonCancelledCount) *
            100,
        ) / 100
      : 0;

  return {
    period,
    periodRange: {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    },
    summary: {
      products: {
        totalProducts: inventoryStats.totalProducts,
        publishedProducts: publishedProductsCount,
        lowStockProducts: inventoryStats.lowStockProducts,
        outOfStockProducts: inventoryStats.outOfStockProducts,
        totalUnitsInStock: inventoryStats.totalUnitsInStock,
      },
      orders: {
        totalOrders: lifetimeOrdersData.totalOrders || 0,
        periodOrders: periodOrdersData.periodOrders || 0,
        pendingOrders: orderStatusMap.pending || 0,
        processingOrders: orderStatusMap.processing || 0,
        deliveredOrders: orderStatusMap.delivered || 0,
        cancelledOrders: orderStatusMap.cancelled || 0,
      },
      bookings: {
        totalBookings: lifetimeBookingsData.totalBookings || 0,
        periodBookings: periodBookingsData.periodBookings || 0,
        pendingBookings: bookingStatusMap.pending || 0,
        confirmedBookings: bookingStatusMap.confirmed || 0,
        inProgressBookings: bookingStatusMap["in-progress"] || 0,
        completedBookings: bookingStatusMap.completed || 0,
        cancelledBookings: bookingStatusMap.cancelled || 0,
      },
      customers: {
        totalCustomers,
        newCustomersInPeriod,
      },
      inquiries: {
        totalInquiries,
        newInquiries,
        periodInquiries,
      },
      financials: {
        orderValue: Math.round((periodOrdersData.orderValue || 0) * 100) / 100,
        paidOrderValue:
          Math.round((periodOrdersData.paidOrderValue || 0) * 100) / 100,
        paidOrdersCount: periodOrdersData.paidOrdersCount || 0,
        averageOrderValue,
        bookingValue:
          Math.round((periodBookingsData.bookingValue || 0) * 100) / 100,
        lifetimeOrderValue:
          Math.round((lifetimeOrdersData.lifetimeOrderValue || 0) * 100) / 100,
        lifetimePaidOrderValue:
          Math.round((lifetimeOrdersData.lifetimePaidOrderValue || 0) * 100) /
          100,
        lifetimeBookingValue:
          Math.round(
            (lifetimeBookingsData.lifetimeBookingValue || 0) * 100,
          ) / 100,
      },
    },
    timeline,
    distributions: {
      orderStatus: orderStatusMap,
      bookingStatus: bookingStatusMap,
      paymentStatus: paymentStatusMap,
    },
    recentActivity: {
      orders: recentOrders.map((o: any) => ({
        id: o._id.toString(),
        orderNumber: o.orderNumber,
        customerName: o.customer?.name || "Customer",
        customerEmail: o.customer?.email || "",
        totalAmount: o.totalAmount,
        paymentStatus: o.paymentStatus,
        status: o.status,
        createdAt: o.createdAt?.toISOString?.() || new Date(o.createdAt).toISOString(),
      })),
      bookings: recentBookings.map((b: any) => ({
        id: b._id.toString(),
        bookingNumber: b.bookingNumber,
        serviceName: b.serviceId?.name || "Service",
        isSiteVisit: Boolean(b.isSiteVisit),
        siteVisitDate: b.siteVisitDate
          ? new Date(b.siteVisitDate).toISOString()
          : null,
        finalPrice: b.finalPrice,
        status: b.status,
        createdAt: b.createdAt?.toISOString?.() || new Date(b.createdAt).toISOString(),
      })),
      inquiries: recentInquiries.map((c: any) => ({
        id: c._id.toString(),
        fullName: c.fullName,
        email: c.email,
        phoneNumber: c.phoneNumber,
        status: c.status,
        createdAt: c.createdAt?.toISOString?.() || new Date(c.createdAt).toISOString(),
      })),
      lowStockProducts: lowStockList.map((p: any) => ({
        id: p._id.toString(),
        name: p.name,
        sku: p.sku,
        stockQuantity: p.stockQuantity,
        lowStockThreshold: p.lowStockThreshold,
        status: p.status,
      })),
    },
  };
};

const getAdminSales = async (
  periodInput?: string,
): Promise<TAdminSalesData> => {
  const period: TAnalyticsPeriod =
    periodInput === ANALYTICS_PERIOD.SEVEN_DAYS ||
    periodInput === ANALYTICS_PERIOD.THIRTY_DAYS ||
    periodInput === ANALYTICS_PERIOD.NINETY_DAYS ||
    periodInput === ANALYTICS_PERIOD.TWELVE_MONTHS
      ? periodInput
      : DEFAULT_ANALYTICS_PERIOD;

  const { startDate, endDate, format, buckets } =
    getPeriodRangeInfo(period);

  const [salesSummaryAgg, paymentBreakdownAgg, timelineAgg] =
    await Promise.all([
      // Summary of sales in period
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $group: {
            _id: null,
            totalOrdersCount: { $sum: 1 },
            totalOrderValue: {
              $sum: {
                $cond: [
                  { $ne: ["$status", ORDER_STATUS.CANCELLED] },
                  "$totalAmount",
                  0,
                ],
              },
            },
            paidOrderValue: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ["$paymentStatus", PAYMENT_STATUS.PAID] },
                      { $ne: ["$status", ORDER_STATUS.CANCELLED] },
                    ],
                  },
                  "$totalAmount",
                  0,
                ],
              },
            },
            pendingOrderValue: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ["$paymentStatus", PAYMENT_STATUS.PENDING] },
                      { $ne: ["$status", ORDER_STATUS.CANCELLED] },
                    ],
                  },
                  "$totalAmount",
                  0,
                ],
              },
            },
            paidOrdersCount: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ["$paymentStatus", PAYMENT_STATUS.PAID] },
                      { $ne: ["$status", ORDER_STATUS.CANCELLED] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            nonCancelledCount: {
              $sum: {
                $cond: [
                  { $ne: ["$status", ORDER_STATUS.CANCELLED] },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ]),

      // Payment status breakdown
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $group: {
            _id: "$paymentStatus",
            count: { $sum: 1 },
            totalAmount: {
              $sum: {
                $cond: [
                  { $ne: ["$status", ORDER_STATUS.CANCELLED] },
                  "$totalAmount",
                  0,
                ],
              },
            },
          },
        },
      ]),

      // Timeline aggregation
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format,
                date: "$createdAt",
                timezone: "UTC",
              },
            },
            ordersCount: { $sum: 1 },
            orderValue: {
              $sum: {
                $cond: [
                  { $ne: ["$status", ORDER_STATUS.CANCELLED] },
                  "$totalAmount",
                  0,
                ],
              },
            },
            paidOrderValue: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ["$paymentStatus", PAYMENT_STATUS.PAID] },
                      { $ne: ["$status", ORDER_STATUS.CANCELLED] },
                    ],
                  },
                  "$totalAmount",
                  0,
                ],
              },
            },
            nonCancelledCount: {
              $sum: {
                $cond: [
                  { $ne: ["$status", ORDER_STATUS.CANCELLED] },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ]),
    ]);

  const summaryData = salesSummaryAgg[0] || {
    totalOrdersCount: 0,
    totalOrderValue: 0,
    paidOrderValue: 0,
    pendingOrderValue: 0,
    paidOrdersCount: 0,
    nonCancelledCount: 0,
  };

  const paymentStatusBreakdown: Record<
    string,
    { count: number; totalAmount: number }
  > = {
    pending: { count: 0, totalAmount: 0 },
    paid: { count: 0, totalAmount: 0 },
    failed: { count: 0, totalAmount: 0 },
    refunded: { count: 0, totalAmount: 0 },
  };

  paymentBreakdownAgg.forEach((item) => {
    if (item._id) {
      paymentStatusBreakdown[item._id] = {
        count: item.count || 0,
        totalAmount: Math.round((item.totalAmount || 0) * 100) / 100,
      };
    }
  });

  const timelineMap = new Map<
    string,
    {
      ordersCount: number;
      orderValue: number;
      paidOrderValue: number;
      nonCancelledCount: number;
    }
  >();

  timelineAgg.forEach((item) => {
    timelineMap.set(item._id, {
      ordersCount: item.ordersCount || 0,
      orderValue: Math.round((item.orderValue || 0) * 100) / 100,
      paidOrderValue: Math.round((item.paidOrderValue || 0) * 100) / 100,
      nonCancelledCount: item.nonCancelledCount || 0,
    });
  });

  const timeline = buckets.map((b) => {
    const data = timelineMap.get(b.date);
    const orderVal = data?.orderValue || 0;
    const count = data?.nonCancelledCount || 0;
    const avg = count > 0 ? Math.round((orderVal / count) * 100) / 100 : 0;
    return {
      date: b.date,
      label: b.label,
      ordersCount: data?.ordersCount || 0,
      orderValue: orderVal,
      paidOrderValue: data?.paidOrderValue || 0,
      averageOrderValue: avg,
    };
  });

  const avgOrderVal =
    summaryData.nonCancelledCount > 0
      ? Math.round(
          (summaryData.totalOrderValue / summaryData.nonCancelledCount) * 100,
        ) / 100
      : 0;

  return {
    period,
    periodRange: {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    },
    summary: {
      totalOrderValue:
        Math.round((summaryData.totalOrderValue || 0) * 100) / 100,
      paidOrderValue:
        Math.round((summaryData.paidOrderValue || 0) * 100) / 100,
      pendingOrderValue:
        Math.round((summaryData.pendingOrderValue || 0) * 100) / 100,
      paidOrdersCount: summaryData.paidOrdersCount || 0,
      totalOrdersCount: summaryData.totalOrdersCount || 0,
      averageOrderValue: avgOrderVal,
    },
    paymentStatusBreakdown,
    timeline,
  };
};

const getAdminOrders = async (
  periodInput?: string,
): Promise<TAdminOrdersData> => {
  const period: TAnalyticsPeriod =
    periodInput === ANALYTICS_PERIOD.SEVEN_DAYS ||
    periodInput === ANALYTICS_PERIOD.THIRTY_DAYS ||
    periodInput === ANALYTICS_PERIOD.NINETY_DAYS ||
    periodInput === ANALYTICS_PERIOD.TWELVE_MONTHS
      ? periodInput
      : DEFAULT_ANALYTICS_PERIOD;

  const { startDate, endDate, format, buckets } =
    getPeriodRangeInfo(period);

  const [
    totalLifetimeOrders,
    periodOrdersAgg,
    statusCountsAgg,
    zoneCountsAgg,
    timelineAgg,
    topSellingAgg,
    recentOrdersList,
  ] = await Promise.all([
    Order.countDocuments({}),
    Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: null,
          periodOrders: { $sum: 1 },
          deliveredOrders: {
            $sum: {
              $cond: [
                { $eq: ["$status", ORDER_STATUS.DELIVERED] },
                1,
                0,
              ],
            },
          },
          cancelledOrders: {
            $sum: {
              $cond: [
                { $eq: ["$status", ORDER_STATUS.CANCELLED] },
                1,
                0,
              ],
            },
          },
        },
      },
    ]),
    Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]),
    Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: "$deliveryZone",
          count: { $sum: 1 },
          totalAmount: {
            $sum: {
              $cond: [
                { $ne: ["$status", ORDER_STATUS.CANCELLED] },
                "$totalAmount",
                0,
              ],
            },
          },
        },
      },
    ]),
    Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format,
              date: "$createdAt",
              timezone: "UTC",
            },
          },
          ordersCount: { $sum: 1 },
          orderValue: {
            $sum: {
              $cond: [
                { $ne: ["$status", ORDER_STATUS.CANCELLED] },
                "$totalAmount",
                0,
              ],
            },
          },
        },
      },
    ]),
    Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          status: { $ne: ORDER_STATUS.CANCELLED },
        },
      },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.productId",
          name: { $first: "$items.name" },
          sku: { $first: "$items.sku" },
          quantitySold: { $sum: "$items.quantity" },
          totalRevenue: { $sum: "$items.lineTotal" },
          ordersCount: { $sum: 1 },
        },
      },
      { $sort: { quantitySold: -1 } },
      { $limit: 8 },
    ]),
    Order.find(
      {},
      {
        orderNumber: 1,
        customer: 1,
        totalAmount: 1,
        deliveryZone: 1,
        paymentStatus: 1,
        status: 1,
        createdAt: 1,
      },
    )
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),
  ]);

  const periodSummary = periodOrdersAgg[0] || {
    periodOrders: 0,
    deliveredOrders: 0,
    cancelledOrders: 0,
  };

  const statusDistribution: Record<string, number> = {
    pending: 0,
    confirmed: 0,
    processing: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
  };
  statusCountsAgg.forEach((item) => {
    if (item._id) {
      statusDistribution[item._id] = item.count;
    }
  });

  const deliveryZoneDistribution: Record<
    string,
    { count: number; totalAmount: number }
  > = {
    dhaka: { count: 0, totalAmount: 0 },
    outside_dhaka: { count: 0, totalAmount: 0 },
  };
  zoneCountsAgg.forEach((item) => {
    if (item._id) {
      deliveryZoneDistribution[item._id] = {
        count: item.count || 0,
        totalAmount: Math.round((item.totalAmount || 0) * 100) / 100,
      };
    }
  });

  const timelineMap = new Map<
    string,
    { ordersCount: number; orderValue: number }
  >();
  timelineAgg.forEach((item) => {
    timelineMap.set(item._id, {
      ordersCount: item.ordersCount || 0,
      orderValue: Math.round((item.orderValue || 0) * 100) / 100,
    });
  });

  const timeline = buckets.map((b) => {
    const data = timelineMap.get(b.date);
    return {
      date: b.date,
      label: b.label,
      ordersCount: data?.ordersCount || 0,
      orderValue: data?.orderValue || 0,
    };
  });

  return {
    period,
    periodRange: {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    },
    summary: {
      totalOrders: totalLifetimeOrders,
      periodOrders: periodSummary.periodOrders || 0,
      deliveredOrders: periodSummary.deliveredOrders || 0,
      cancelledOrders: periodSummary.cancelledOrders || 0,
    },
    statusDistribution,
    deliveryZoneDistribution,
    timeline,
    topSellingProducts: topSellingAgg.map((item) => ({
      productId: item._id ? item._id.toString() : "",
      name: item.name || "Unknown Product",
      sku: item.sku || "",
      quantitySold: item.quantitySold || 0,
      totalRevenue: Math.round((item.totalRevenue || 0) * 100) / 100,
      ordersCount: item.ordersCount || 0,
    })),
    recentOrders: recentOrdersList.map((o: any) => ({
      id: o._id.toString(),
      orderNumber: o.orderNumber,
      customerName: o.customer?.name || "Customer",
      customerEmail: o.customer?.email || "",
      totalAmount: o.totalAmount,
      deliveryZone: o.deliveryZone || "",
      paymentStatus: o.paymentStatus,
      status: o.status,
      createdAt: o.createdAt?.toISOString?.() || new Date(o.createdAt).toISOString(),
    })),
  };
};

const getAdminBookings = async (
  periodInput?: string,
): Promise<TAdminBookingsData> => {
  const period: TAnalyticsPeriod =
    periodInput === ANALYTICS_PERIOD.SEVEN_DAYS ||
    periodInput === ANALYTICS_PERIOD.THIRTY_DAYS ||
    periodInput === ANALYTICS_PERIOD.NINETY_DAYS ||
    periodInput === ANALYTICS_PERIOD.TWELVE_MONTHS
      ? periodInput
      : DEFAULT_ANALYTICS_PERIOD;

  const { startDate, endDate, format, buckets } =
    getPeriodRangeInfo(period);

  const [
    totalLifetimeBookings,
    periodSummaryAgg,
    statusCountsAgg,
    siteVisitCountsAgg,
    timelineAgg,
    popularServicesAgg,
    recentBookingsList,
  ] = await Promise.all([
    Booking.countDocuments({}),
    Booking.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: null,
          periodBookings: { $sum: 1 },
          completedBookings: {
            $sum: {
              $cond: [
                { $eq: ["$status", BOOKING_STATUS.COMPLETED] },
                1,
                0,
              ],
            },
          },
          cancelledBookings: {
            $sum: {
              $cond: [
                {
                  $in: [
                    "$status",
                    [
                      BOOKING_STATUS.CANCELLED,
                      BOOKING_STATUS.REJECTED,
                    ],
                  ],
                },
                1,
                0,
              ],
            },
          },
          siteVisitsCount: {
            $sum: {
              $cond: [{ $eq: ["$isSiteVisit", true] }, 1, 0],
            },
          },
          totalBookingValue: {
            $sum: {
              $cond: [
                {
                  $not: {
                    $in: [
                      "$status",
                      [
                        BOOKING_STATUS.CANCELLED,
                        BOOKING_STATUS.REJECTED,
                      ],
                    ],
                  },
                },
                "$finalPrice",
                0,
              ],
            },
          },
        },
      },
    ]),
    Booking.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]),
    Booking.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: "$isSiteVisit",
          count: { $sum: 1 },
        },
      },
    ]),
    Booking.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format,
              date: "$createdAt",
              timezone: "UTC",
            },
          },
          bookingsCount: { $sum: 1 },
          bookingValue: {
            $sum: {
              $cond: [
                {
                  $not: {
                    $in: [
                      "$status",
                      [
                        BOOKING_STATUS.CANCELLED,
                        BOOKING_STATUS.REJECTED,
                      ],
                    ],
                  },
                },
                "$finalPrice",
                0,
              ],
            },
          },
        },
      },
    ]),
    Booking.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          status: {
            $nin: [BOOKING_STATUS.CANCELLED, BOOKING_STATUS.REJECTED],
          },
        },
      },
      {
        $group: {
          _id: "$serviceId",
          bookingsCount: { $sum: 1 },
          totalRevenue: { $sum: "$finalPrice" },
        },
      },
      {
        $lookup: {
          from: "services",
          localField: "_id",
          foreignField: "_id",
          as: "service",
        },
      },
      {
        $unwind: {
          path: "$service",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          serviceId: { $toString: "$_id" },
          name: { $ifNull: ["$service.name", "Unknown Service"] },
          bookingsCount: 1,
          totalRevenue: 1,
        },
      },
      { $sort: { bookingsCount: -1 } },
      { $limit: 8 },
    ]),
    Booking.find(
      {},
      {
        bookingNumber: 1,
        serviceId: 1,
        project: 1,
        isSiteVisit: 1,
        siteVisitDate: 1,
        finalPrice: 1,
        status: 1,
        createdAt: 1,
      },
    )
      .populate("serviceId", "name")
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),
  ]);

  const periodSummary = periodSummaryAgg[0] || {
    periodBookings: 0,
    completedBookings: 0,
    cancelledBookings: 0,
    siteVisitsCount: 0,
    totalBookingValue: 0,
  };

  const statusDistribution: Record<string, number> = {
    pending: 0,
    confirmed: 0,
    "in-progress": 0,
    completed: 0,
    cancelled: 0,
    rejected: 0,
  };
  statusCountsAgg.forEach((item) => {
    if (item._id) {
      statusDistribution[item._id] = item.count;
    }
  });

  let siteVisits = 0;
  let regularBookings = 0;
  siteVisitCountsAgg.forEach((item) => {
    if (item._id === true) {
      siteVisits = item.count;
    } else {
      regularBookings = item.count;
    }
  });

  const timelineMap = new Map<
    string,
    { bookingsCount: number; bookingValue: number }
  >();
  timelineAgg.forEach((item) => {
    timelineMap.set(item._id, {
      bookingsCount: item.bookingsCount || 0,
      bookingValue: Math.round((item.bookingValue || 0) * 100) / 100,
    });
  });

  const timeline = buckets.map((b) => {
    const data = timelineMap.get(b.date);
    return {
      date: b.date,
      label: b.label,
      bookingsCount: data?.bookingsCount || 0,
      bookingValue: data?.bookingValue || 0,
    };
  });

  return {
    period,
    periodRange: {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    },
    summary: {
      totalBookings: totalLifetimeBookings,
      periodBookings: periodSummary.periodBookings || 0,
      completedBookings: periodSummary.completedBookings || 0,
      cancelledBookings: periodSummary.cancelledBookings || 0,
      siteVisitsCount: periodSummary.siteVisitsCount || 0,
      totalBookingValue:
        Math.round((periodSummary.totalBookingValue || 0) * 100) / 100,
    },
    statusDistribution,
    siteVisitDistribution: {
      siteVisits,
      regularBookings,
    },
    timeline,
    popularServices: popularServicesAgg.map((item) => ({
      serviceId: item.serviceId || "",
      name: item.name || "Unknown Service",
      bookingsCount: item.bookingsCount || 0,
      totalRevenue: Math.round((item.totalRevenue || 0) * 100) / 100,
    })),
    recentBookings: recentBookingsList.map((b: any) => ({
      id: b._id.toString(),
      bookingNumber: b.bookingNumber,
      serviceName: b.serviceId?.name || "Service",
      location: b.project?.location || "",
      isSiteVisit: Boolean(b.isSiteVisit),
      siteVisitDate: b.siteVisitDate
        ? new Date(b.siteVisitDate).toISOString()
        : null,
      finalPrice: b.finalPrice,
      status: b.status,
      createdAt: b.createdAt?.toISOString?.() || new Date(b.createdAt).toISOString(),
    })),
  };
};

const getAdminProducts = async (
  periodInput?: string,
): Promise<TAdminProductsData> => {
  const period: TAnalyticsPeriod =
    periodInput === ANALYTICS_PERIOD.SEVEN_DAYS ||
    periodInput === ANALYTICS_PERIOD.THIRTY_DAYS ||
    periodInput === ANALYTICS_PERIOD.NINETY_DAYS ||
    periodInput === ANALYTICS_PERIOD.TWELVE_MONTHS
      ? periodInput
      : DEFAULT_ANALYTICS_PERIOD;

  const { startDate, endDate } = getPeriodRangeInfo(period);

  const [
    inventoryStats,
    statusCountsAgg,
    topSellingAgg,
    lowStockList,
    recentMovementsList,
  ] = await Promise.all([
    // Inventory statistics from inventory service
    inventoryService.getInventoryStats(),

    // Product status breakdown
    Product.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]),

    // Top selling products in period
    Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          status: { $ne: ORDER_STATUS.CANCELLED },
        },
      },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.productId",
          name: { $first: "$items.name" },
          sku: { $first: "$items.sku" },
          quantitySold: { $sum: "$items.quantity" },
          totalRevenue: { $sum: "$items.lineTotal" },
          ordersCount: { $sum: 1 },
        },
      },
      { $sort: { quantitySold: -1 } },
      { $limit: 10 },
    ]),

    // Low stock products using schema's stockQuantity <= lowStockThreshold
    Product.find(
      {
        $expr: {
          $lte: ["$stockQuantity", "$lowStockThreshold"],
        },
      },
      {
        name: 1,
        sku: 1,
        stockQuantity: 1,
        lowStockThreshold: 1,
        price: 1,
        status: 1,
      },
    )
      .sort({ stockQuantity: 1 })
      .limit(10)
      .lean(),

    // Recent inventory movements (last 10)
    inventoryService.getGlobalMovementHistory({ page: 1, limit: 10 }),
  ]);

  const statusDistribution: Record<string, number> = {
    draft: 0,
    published: 0,
    archived: 0,
  };
  statusCountsAgg.forEach((item) => {
    if (item._id) {
      statusDistribution[item._id] = item.count;
    }
  });

  return {
    period,
    periodRange: {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    },
    inventoryStats,
    statusDistribution,
    topSellingProducts: topSellingAgg.map((item) => ({
      productId: item._id ? item._id.toString() : "",
      name: item.name || "Unknown Product",
      sku: item.sku || "",
      quantitySold: item.quantitySold || 0,
      totalRevenue: Math.round((item.totalRevenue || 0) * 100) / 100,
      ordersCount: item.ordersCount || 0,
    })),
    lowStockProducts: lowStockList.map((p: any) => ({
      id: p._id.toString(),
      name: p.name,
      sku: p.sku,
      stockQuantity: p.stockQuantity,
      lowStockThreshold: p.lowStockThreshold,
      price: p.price,
      status: p.status,
    })),
    recentMovements: (recentMovementsList.movements || []).map((m: any) => ({
      id: m._id ? m._id.toString() : "",
      product: {
        id: m.productId?._id?.toString() || m.productId?.toString() || "",
        name: m.productId?.name || "Product",
        sku: m.productId?.sku || "",
      },
      movementType: m.movementType,
      quantity: m.quantity,
      previousStock: m.previousStock,
      resultingStock: m.resultingStock,
      reason: m.reason,
      createdAt: m.createdAt?.toISOString?.() || new Date(m.createdAt).toISOString(),
    })),
  };
};

const getUserOverview = async (
  userId: string,
  periodInput?: string,
): Promise<TUserOverviewData> => {
  const period: TAnalyticsPeriod =
    periodInput === ANALYTICS_PERIOD.SEVEN_DAYS ||
    periodInput === ANALYTICS_PERIOD.THIRTY_DAYS ||
    periodInput === ANALYTICS_PERIOD.NINETY_DAYS ||
    periodInput === ANALYTICS_PERIOD.TWELVE_MONTHS
      ? periodInput
      : DEFAULT_ANALYTICS_PERIOD;

  const { startDate, endDate, format, buckets } =
    getPeriodRangeInfo(period);

  const [
    lifetimeOrderStats,
    periodOrderStats,
    userOrderStatusCounts,
    lifetimeBookingStats,
    periodBookingStats,
    userBookingStatusCounts,
    upcomingSiteVisitsCount,
    timelineAgg,
    recentOrdersList,
    recentBookingsList,
  ] = await Promise.all([
    // 1. Lifetime order stats for user
    Order.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          deliveredOrders: {
            $sum: {
              $cond: [
                { $eq: ["$status", ORDER_STATUS.DELIVERED] },
                1,
                0,
              ],
            },
          },
          cancelledOrders: {
            $sum: {
              $cond: [
                { $eq: ["$status", ORDER_STATUS.CANCELLED] },
                1,
                0,
              ],
            },
          },
          activeOrders: {
            $sum: {
              $cond: [
                {
                  $in: [
                    "$status",
                    [
                      ORDER_STATUS.PENDING,
                      ORDER_STATUS.CONFIRMED,
                      ORDER_STATUS.PROCESSING,
                      ORDER_STATUS.SHIPPED,
                    ],
                  ],
                },
                1,
                0,
              ],
            },
          },
          totalOrderValue: {
            $sum: {
              $cond: [
                { $ne: ["$status", ORDER_STATUS.CANCELLED] },
                "$totalAmount",
                0,
              ],
            },
          },
          paidOrderValue: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$paymentStatus", PAYMENT_STATUS.PAID] },
                    { $ne: ["$status", ORDER_STATUS.CANCELLED] },
                  ],
                },
                "$totalAmount",
                0,
              ],
            },
          },
        },
      },
    ]),

    // 2. Period orders count for user
    Order.countDocuments({
      userId,
      createdAt: { $gte: startDate, $lte: endDate },
    }),

    // 3. User order status breakdown
    Order.aggregate([
      { $match: { userId } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),

    // 4. Lifetime booking stats for user
    Booking.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: null,
          totalBookings: { $sum: 1 },
          totalBookingValue: {
            $sum: {
              $cond: [
                {
                  $not: {
                    $in: [
                      "$status",
                      [
                        BOOKING_STATUS.CANCELLED,
                        BOOKING_STATUS.REJECTED,
                      ],
                    ],
                  },
                },
                "$finalPrice",
                0,
              ],
            },
          },
        },
      },
    ]),

    // 5. Period bookings count for user
    Booking.countDocuments({
      userId,
      createdAt: { $gte: startDate, $lte: endDate },
    }),

    // 6. User booking status breakdown
    Booking.aggregate([
      { $match: { userId } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),

    // 7. Upcoming site visits
    Booking.countDocuments({
      userId,
      isSiteVisit: true,
      siteVisitDate: { $gte: new Date() },
      status: {
        $nin: [BOOKING_STATUS.CANCELLED, BOOKING_STATUS.REJECTED],
      },
    }),

    // 8. Order spending timeline in period
    Order.aggregate([
      {
        $match: {
          userId,
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format,
              date: "$createdAt",
              timezone: "UTC",
            },
          },
          ordersCount: { $sum: 1 },
          orderValue: {
            $sum: {
              $cond: [
                { $ne: ["$status", ORDER_STATUS.CANCELLED] },
                "$totalAmount",
                0,
              ],
            },
          },
          paidOrderValue: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$paymentStatus", PAYMENT_STATUS.PAID] },
                    { $ne: ["$status", ORDER_STATUS.CANCELLED] },
                  ],
                },
                "$totalAmount",
                0,
              ],
            },
          },
        },
      },
    ]),

    // 9. Recent orders (last 5)
    Order.find(
      { userId },
      {
        orderNumber: 1,
        totalAmount: 1,
        paymentStatus: 1,
        status: 1,
        createdAt: 1,
        items: 1,
      },
    )
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),

    // 10. Recent bookings (last 5)
    Booking.find(
      { userId },
      {
        bookingNumber: 1,
        serviceId: 1,
        isSiteVisit: 1,
        siteVisitDate: 1,
        finalPrice: 1,
        status: 1,
        createdAt: 1,
      },
    )
      .populate("serviceId", "name")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),
  ]);

  const userOrderData = lifetimeOrderStats[0] || {
    totalOrders: 0,
    activeOrders: 0,
    deliveredOrders: 0,
    cancelledOrders: 0,
    totalOrderValue: 0,
    paidOrderValue: 0,
  };

  const bookingStatusMap: Record<string, number> = {
    pending: 0,
    confirmed: 0,
    "in-progress": 0,
    completed: 0,
    cancelled: 0,
    rejected: 0,
  };
  userBookingStatusCounts.forEach((item) => {
    if (item._id) {
      bookingStatusMap[item._id] = item.count;
    }
  });

  const lifetimeBookingData = lifetimeBookingStats[0] || {
    totalBookings: 0,
    totalBookingValue: 0,
  };

  const timelineMap = new Map<
    string,
    { ordersCount: number; orderValue: number; paidOrderValue: number }
  >();
  timelineAgg.forEach((item) => {
    timelineMap.set(item._id, {
      ordersCount: item.ordersCount || 0,
      orderValue: Math.round((item.orderValue || 0) * 100) / 100,
      paidOrderValue: Math.round((item.paidOrderValue || 0) * 100) / 100,
    });
  });

  const timeline = buckets.map((b) => {
    const data = timelineMap.get(b.date);
    return {
      date: b.date,
      label: b.label,
      ordersCount: data?.ordersCount || 0,
      orderValue: data?.orderValue || 0,
      paidOrderValue: data?.paidOrderValue || 0,
    };
  });

  return {
    period,
    periodRange: {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    },
    orders: {
      totalOrders: userOrderData.totalOrders || 0,
      periodOrders: periodOrderStats,
      activeOrders: userOrderData.activeOrders || 0,
      deliveredOrders: userOrderData.deliveredOrders || 0,
      cancelledOrders: userOrderData.cancelledOrders || 0,
    },
    bookings: {
      totalBookings: lifetimeBookingData.totalBookings || 0,
      periodBookings: periodBookingStats,
      pendingBookings: bookingStatusMap.pending || 0,
      confirmedBookings: bookingStatusMap.confirmed || 0,
      completedBookings: bookingStatusMap.completed || 0,
      cancelledBookings: bookingStatusMap.cancelled || 0,
      upcomingSiteVisits: upcomingSiteVisitsCount,
    },
    spending: {
      totalOrderValue:
        Math.round((userOrderData.totalOrderValue || 0) * 100) / 100,
      paidOrderValue:
        Math.round((userOrderData.paidOrderValue || 0) * 100) / 100,
      totalBookingValue:
        Math.round((lifetimeBookingData.totalBookingValue || 0) * 100) / 100,
    },
    timeline,
    recentOrders: recentOrdersList.map((o: any) => ({
      id: o._id.toString(),
      orderNumber: o.orderNumber,
      totalAmount: o.totalAmount,
      paymentStatus: o.paymentStatus,
      status: o.status,
      createdAt: o.createdAt?.toISOString?.() || new Date(o.createdAt).toISOString(),
      itemsCount: Array.isArray(o.items) ? o.items.length : 0,
    })),
    recentBookings: recentBookingsList.map((b: any) => ({
      id: b._id.toString(),
      bookingNumber: b.bookingNumber,
      serviceName: b.serviceId?.name || "Service",
      isSiteVisit: Boolean(b.isSiteVisit),
      siteVisitDate: b.siteVisitDate
        ? new Date(b.siteVisitDate).toISOString()
        : null,
      finalPrice: b.finalPrice,
      status: b.status,
      createdAt: b.createdAt?.toISOString?.() || new Date(b.createdAt).toISOString(),
    })),
  };
};

const getUserActivity = async (
  userId: string,
  periodInput?: string,
): Promise<TUserActivityData> => {
  const period: TAnalyticsPeriod =
    periodInput === ANALYTICS_PERIOD.SEVEN_DAYS ||
    periodInput === ANALYTICS_PERIOD.THIRTY_DAYS ||
    periodInput === ANALYTICS_PERIOD.NINETY_DAYS ||
    periodInput === ANALYTICS_PERIOD.TWELVE_MONTHS
      ? periodInput
      : DEFAULT_ANALYTICS_PERIOD;

  const { startDate, endDate } = getPeriodRangeInfo(period);

  const [orders, bookings] = await Promise.all([
    Order.find(
      {
        userId,
        createdAt: { $gte: startDate, $lte: endDate },
      },
      {
        orderNumber: 1,
        totalAmount: 1,
        paymentStatus: 1,
        status: 1,
        items: 1,
        createdAt: 1,
      },
    )
      .sort({ createdAt: -1 })
      .limit(20)
      .lean(),

    Booking.find(
      {
        userId,
        createdAt: { $gte: startDate, $lte: endDate },
      },
      {
        bookingNumber: 1,
        serviceId: 1,
        isSiteVisit: 1,
        siteVisitDate: 1,
        finalPrice: 1,
        status: 1,
        createdAt: 1,
      },
    )
      .populate("serviceId", "name")
      .sort({ createdAt: -1 })
      .limit(20)
      .lean(),
  ]);

  const activities: Array<{
    id: string;
    type: "order" | "booking";
    referenceNumber: string;
    title: string;
    status: string;
    amount: number;
    date: string;
    details?: Record<string, any>;
  }> = [];

  orders.forEach((o: any) => {
    activities.push({
      id: `order-${o._id.toString()}`,
      type: "order",
      referenceNumber: o.orderNumber,
      title: `Order #${o.orderNumber}`,
      status: o.status,
      amount: o.totalAmount,
      date: o.createdAt?.toISOString?.() || new Date(o.createdAt).toISOString(),
      details: {
        paymentStatus: o.paymentStatus,
        itemsCount: Array.isArray(o.items) ? o.items.length : 0,
      },
    });
  });

  bookings.forEach((b: any) => {
    activities.push({
      id: `booking-${b._id.toString()}`,
      type: "booking",
      referenceNumber: b.bookingNumber,
      title: `Booking #${b.bookingNumber} (${b.serviceId?.name || "Service"})`,
      status: b.status,
      amount: b.finalPrice,
      date: b.createdAt?.toISOString?.() || new Date(b.createdAt).toISOString(),
      details: {
        serviceName: b.serviceId?.name || "Service",
        isSiteVisit: Boolean(b.isSiteVisit),
        siteVisitDate: b.siteVisitDate
          ? new Date(b.siteVisitDate).toISOString()
          : null,
      },
    });
  });

  // Sort descending by date
  activities.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  return {
    period,
    periodRange: {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    },
    activities,
  };
};

export const analyticsService = {
  getAdminOverview,
  getAdminSales,
  getAdminOrders,
  getAdminBookings,
  getAdminProducts,
  getUserOverview,
  getUserActivity,
};

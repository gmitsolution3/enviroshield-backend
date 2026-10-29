import { TAnalyticsPeriod } from "./analytics.constant";

export interface TTimeSeriesBucket {
  date: string;
  label: string;
  ordersCount: number;
  orderValue: number;
  paidOrderValue: number;
  bookingsCount: number;
  bookingValue: number;
}

export interface TAdminOverviewData {
  period: TAnalyticsPeriod;
  periodRange: {
    startDate: string;
    endDate: string;
  };
  summary: {
    products: {
      totalProducts: number;
      publishedProducts: number;
      lowStockProducts: number;
      outOfStockProducts: number;
      totalUnitsInStock: number;
    };
    orders: {
      totalOrders: number;
      periodOrders: number;
      pendingOrders: number;
      processingOrders: number;
      deliveredOrders: number;
      cancelledOrders: number;
    };
    bookings: {
      totalBookings: number;
      periodBookings: number;
      pendingBookings: number;
      confirmedBookings: number;
      inProgressBookings: number;
      completedBookings: number;
      cancelledBookings: number;
    };
    customers: {
      totalCustomers: number;
      newCustomersInPeriod: number;
    };
    inquiries: {
      totalInquiries: number;
      newInquiries: number;
      periodInquiries: number;
    };
    financials: {
      orderValue: number;
      paidOrderValue: number;
      paidOrdersCount: number;
      averageOrderValue: number;
      bookingValue: number;
      lifetimeOrderValue: number;
      lifetimePaidOrderValue: number;
      lifetimeBookingValue: number;
    };
  };
  timeline: TTimeSeriesBucket[];
  distributions: {
    orderStatus: Record<string, number>;
    bookingStatus: Record<string, number>;
    paymentStatus: Record<string, number>;
  };
  recentActivity: {
    orders: Array<{
      id: string;
      orderNumber: string;
      customerName: string;
      customerEmail: string;
      totalAmount: number;
      paymentStatus: string;
      status: string;
      createdAt: string;
    }>;
    bookings: Array<{
      id: string;
      bookingNumber: string;
      serviceName: string;
      isSiteVisit: boolean;
      siteVisitDate: string | null;
      finalPrice: number;
      status: string;
      createdAt: string;
    }>;
    inquiries: Array<{
      id: string;
      fullName: string;
      email: string;
      phoneNumber: string;
      status: string;
      createdAt: string;
    }>;
    lowStockProducts: Array<{
      id: string;
      name: string;
      sku: string;
      stockQuantity: number;
      lowStockThreshold: number;
      status: string;
    }>;
  };
}

export interface TAdminSalesData {
  period: TAnalyticsPeriod;
  periodRange: {
    startDate: string;
    endDate: string;
  };
  summary: {
    totalOrderValue: number;
    paidOrderValue: number;
    pendingOrderValue: number;
    paidOrdersCount: number;
    totalOrdersCount: number;
    averageOrderValue: number;
  };
  paymentStatusBreakdown: Record<
    string,
    { count: number; totalAmount: number }
  >;
  timeline: Array<{
    date: string;
    label: string;
    ordersCount: number;
    orderValue: number;
    paidOrderValue: number;
    averageOrderValue: number;
  }>;
}

export interface TAdminOrdersData {
  period: TAnalyticsPeriod;
  periodRange: {
    startDate: string;
    endDate: string;
  };
  summary: {
    totalOrders: number;
    periodOrders: number;
    deliveredOrders: number;
    cancelledOrders: number;
  };
  statusDistribution: Record<string, number>;
  deliveryZoneDistribution: Record<
    string,
    { count: number; totalAmount: number }
  >;
  timeline: Array<{
    date: string;
    label: string;
    ordersCount: number;
    orderValue: number;
  }>;
  topSellingProducts: Array<{
    productId: string;
    name: string;
    sku: string;
    quantitySold: number;
    totalRevenue: number;
    ordersCount: number;
  }>;
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    customerName: string;
    customerEmail: string;
    totalAmount: number;
    deliveryZone: string;
    paymentStatus: string;
    status: string;
    createdAt: string;
  }>;
}

export interface TAdminBookingsData {
  period: TAnalyticsPeriod;
  periodRange: {
    startDate: string;
    endDate: string;
  };
  summary: {
    totalBookings: number;
    periodBookings: number;
    completedBookings: number;
    cancelledBookings: number;
    siteVisitsCount: number;
    totalBookingValue: number;
  };
  statusDistribution: Record<string, number>;
  siteVisitDistribution: {
    siteVisits: number;
    regularBookings: number;
  };
  timeline: Array<{
    date: string;
    label: string;
    bookingsCount: number;
    bookingValue: number;
  }>;
  popularServices: Array<{
    serviceId: string;
    name: string;
    bookingsCount: number;
    totalRevenue: number;
  }>;
  recentBookings: Array<{
    id: string;
    bookingNumber: string;
    serviceName: string;
    location: string;
    isSiteVisit: boolean;
    siteVisitDate: string | null;
    finalPrice: number;
    status: string;
    createdAt: string;
  }>;
}

export interface TAdminProductsData {
  period: TAnalyticsPeriod;
  periodRange: {
    startDate: string;
    endDate: string;
  };
  inventoryStats: {
    totalProducts: number;
    lowStockProducts: number;
    outOfStockProducts: number;
    totalUnitsInStock: number;
  };
  statusDistribution: Record<string, number>;
  topSellingProducts: Array<{
    productId: string;
    name: string;
    sku: string;
    quantitySold: number;
    totalRevenue: number;
    ordersCount: number;
  }>;
  lowStockProducts: Array<{
    id: string;
    name: string;
    sku: string;
    stockQuantity: number;
    lowStockThreshold: number;
    price: number;
    status: string;
  }>;
  recentMovements: Array<{
    id: string;
    product: {
      id: string;
      name: string;
      sku: string;
    };
    movementType: string;
    quantity: number;
    previousStock: number;
    resultingStock: number;
    reason: string;
    createdAt: string;
  }>;
}

export interface TUserOverviewData {
  period: TAnalyticsPeriod;
  periodRange: {
    startDate: string;
    endDate: string;
  };
  orders: {
    totalOrders: number;
    periodOrders: number;
    activeOrders: number;
    deliveredOrders: number;
    cancelledOrders: number;
  };
  bookings: {
    totalBookings: number;
    periodBookings: number;
    pendingBookings: number;
    confirmedBookings: number;
    completedBookings: number;
    cancelledBookings: number;
    upcomingSiteVisits: number;
  };
  spending: {
    totalOrderValue: number;
    paidOrderValue: number;
    totalBookingValue: number;
  };
  timeline: Array<{
    date: string;
    label: string;
    ordersCount: number;
    orderValue: number;
    paidOrderValue: number;
  }>;
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    totalAmount: number;
    paymentStatus: string;
    status: string;
    createdAt: string;
    itemsCount: number;
  }>;
  recentBookings: Array<{
    id: string;
    bookingNumber: string;
    serviceName: string;
    isSiteVisit: boolean;
    siteVisitDate: string | null;
    finalPrice: number;
    status: string;
    createdAt: string;
  }>;
}

export interface TActivityItem {
  id: string;
  type: "order" | "booking";
  referenceNumber: string;
  title: string;
  status: string;
  amount: number;
  date: string;
  details?: Record<string, any>;
}

export interface TUserActivityData {
  period: TAnalyticsPeriod;
  periodRange: {
    startDate: string;
    endDate: string;
  };
  activities: TActivityItem[];
}

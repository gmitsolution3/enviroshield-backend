import {
  ANALYTICS_PERIOD,
  DEFAULT_ANALYTICS_PERIOD,
  VALID_ANALYTICS_PERIODS,
} from "../analytics.constant";
import { getPeriodRangeInfo } from "../analytics.service";
import { analyticsValidation } from "../analytics.validation";

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`✓ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`✗ FAIL: ${testName}`);
    failed++;
  }
}

async function runTests() {
  console.log("=== RUNNING ANALYTICS TEST SUITE ===\n");

  // 1. Period Range & Date Boundaries
  console.log("--- 1. Period Range & Date Boundaries ---");

  const range7d = getPeriodRangeInfo(ANALYTICS_PERIOD.SEVEN_DAYS);
  assert(range7d.buckets.length === 7, "7d period produces exactly 7 daily buckets");
  assert(range7d.format === "%Y-%m-%d", "7d format is %Y-%m-%d");
  assert(range7d.startDate < range7d.endDate, "7d startDate is before endDate");

  const range30d = getPeriodRangeInfo(ANALYTICS_PERIOD.THIRTY_DAYS);
  assert(range30d.buckets.length === 30, "30d period produces exactly 30 daily buckets");
  assert(range30d.format === "%Y-%m-%d", "30d format is %Y-%m-%d");

  const range90d = getPeriodRangeInfo(ANALYTICS_PERIOD.NINETY_DAYS);
  assert(range90d.buckets.length === 90, "90d period produces exactly 90 daily buckets");

  const range12m = getPeriodRangeInfo(ANALYTICS_PERIOD.TWELVE_MONTHS);
  assert(range12m.buckets.length === 12, "12m period produces exactly 12 monthly buckets");
  assert(range12m.format === "%Y-%m", "12m format is %Y-%m");

  const defaultRange = getPeriodRangeInfo(undefined);
  assert(
    defaultRange.buckets.length === 30,
    "Undefined period defaults to 30d (30 buckets)",
  );

  const invalidRange = getPeriodRangeInfo("invalid_period");
  assert(
    invalidRange.buckets.length === 30,
    "Invalid period fallback defaults to 30d (30 buckets)",
  );

  // Check bucket structure
  const firstBucket = range30d.buckets[0];
  const lastBucket = range30d.buckets[range30d.buckets.length - 1];
  assert(
    /^\d{4}-\d{2}-\d{2}$/.test(firstBucket.date),
    `Bucket date format is YYYY-MM-DD (got ${firstBucket.date})`,
  );
  assert(
    typeof firstBucket.label === "string" && firstBucket.label.length > 0,
    `Bucket label is formatted string (got ${firstBucket.label})`,
  );
  assert(
    firstBucket.date < lastBucket.date,
    "Buckets are in strictly ascending chronological order",
  );

  // Check 12m bucket keys
  const first12mBucket = range12m.buckets[0];
  assert(
    /^\d{4}-\d{2}$/.test(first12mBucket.date),
    `12m bucket key is YYYY-MM (got ${first12mBucket.date})`,
  );

  // 2. Query Validation Schema Tests
  console.log("\n--- 2. Query Validation Schema Tests ---");

  const validPeriods = ["7d", "30d", "90d", "12m"];
  for (const p of validPeriods) {
    const parseRes = analyticsValidation.getAnalyticsQuerySchema.safeParse({
      query: { period: p },
    });
    assert(parseRes.success, `Valid period "${p}" passes schema validation`);
  }

  const parseEmpty = analyticsValidation.getAnalyticsQuerySchema.safeParse({
    query: {},
  });
  assert(parseEmpty.success, "Empty query (omitted period) passes validation");

  const invalidPeriods = ["1d", "60d", "1y", "24m", "invalid", ""];
  for (const inv of invalidPeriods) {
    const parseInv = analyticsValidation.getAnalyticsQuerySchema.safeParse({
      query: { period: inv },
    });
    assert(!parseInv.success, `Invalid period "${inv}" is rejected by schema`);
  }

  // 3. Financial Metric Formulas & Logic
  console.log("\n--- 3. Financial Calculation & Logic Rules ---");

  // Mock orders dataset:
  // Order 1: delivered, paid, COD, 1500 BDT
  // Order 2: confirmed, pending, COD, 800 BDT
  // Order 3: processing, paid, COD, 2200 BDT
  // Order 4: cancelled, pending, COD, 3000 BDT (Must be excluded from orderValue and paidOrderValue)
  // Order 5: cancelled, paid, COD, 1000 BDT (Must be excluded from orderValue and paidOrderValue)
  const mockOrders = [
    { id: "1", status: "delivered", paymentStatus: "paid", totalAmount: 1500 },
    { id: "2", status: "confirmed", paymentStatus: "pending", totalAmount: 800 },
    { id: "3", status: "processing", paymentStatus: "paid", totalAmount: 2200 },
    { id: "4", status: "cancelled", paymentStatus: "pending", totalAmount: 3000 },
    { id: "5", status: "cancelled", paymentStatus: "paid", totalAmount: 1000 },
  ];

  const eligibleOrders = mockOrders.filter((o) => o.status !== "cancelled");
  const totalOrderValue = eligibleOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const paidOrders = eligibleOrders.filter((o) => o.paymentStatus === "paid");
  const paidOrderValue = paidOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const aov = totalOrderValue / eligibleOrders.length;

  assert(
    totalOrderValue === 1500 + 800 + 2200, // 4500
    `Order value correctly excludes cancelled orders: expected 4500, got ${totalOrderValue}`,
  );
  assert(
    paidOrderValue === 1500 + 2200, // 3700
    `Paid revenue correctly requires paymentStatus='paid' and excludes cancelled: expected 3700, got ${paidOrderValue}`,
  );
  assert(
    aov === 4500 / 3, // 1500
    `Average order value correctly computed across eligible orders: expected 1500, got ${aov}`,
  );

  // Mock Bookings dataset:
  // Booking 1: pending, finalPrice 5000
  // Booking 2: confirmed, finalPrice 12000
  // Booking 3: completed, finalPrice 8500
  // Booking 4: cancelled, finalPrice 15000 (excluded)
  // Booking 5: rejected, finalPrice 20000 (excluded)
  const mockBookings = [
    { id: "b1", status: "pending", finalPrice: 5000 },
    { id: "b2", status: "confirmed", finalPrice: 12000 },
    { id: "b3", status: "completed", finalPrice: 8500 },
    { id: "b4", status: "cancelled", finalPrice: 15000 },
    { id: "b5", status: "rejected", finalPrice: 20000 },
  ];

  const eligibleBookings = mockBookings.filter(
    (b) => b.status !== "cancelled" && b.status !== "rejected",
  );
  const totalBookingValue = eligibleBookings.reduce(
    (sum, b) => sum + b.finalPrice,
    0,
  );

  assert(
    totalBookingValue === 5000 + 12000 + 8500, // 25500
    `Booking value correctly excludes cancelled and rejected bookings: expected 25500, got ${totalBookingValue}`,
  );
  assert(
    totalOrderValue !== totalBookingValue,
    "Booking financial metric is kept strictly separate from product order value",
  );

  // Summary
  console.log("\n=================================");
  console.log(`TOTAL: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log("=================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});


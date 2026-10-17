# Enviroshield Backend Development Roadmap

> Purpose: Keep the agreed backend implementation phases, e-commerce scope, and key decisions in one source-of-truth document. Add this file to the backend repository so future work can resume from the same plan.

## Phase 1 — Existing Website Backend

**Status: Existing modules**

Modules:
- Health checks
- Blog
- Service
- Project
- Testimonial
- Contact
- Category

These establish the existing API structure and conventions that new modules should follow.

## Phase 2 — E-commerce Foundation

**Status: Completed**

Modules and work:
- Category
- Product
- Postman API testing for Product

Product creation, publishing, listing, filtering, updating, deletion, and public product retrieval have all passed the tests reported by the developer.

## Phase 3 — Cart Module

**Status: Next**

Planned work:
- Add products to a user's cart.
- Update product quantities.
- Remove cart items and clear the cart.
- Retrieve the authenticated user's cart.
- Validate product availability and stock.
- Calculate cart totals using trusted server-side prices.

## Phase 4 — Inventory Management

**Status: Core work completed**

Planned scope:
- Track stock changes.
- Record inventory movements.
- Maintain stock consistency during order processing.
- Support low-stock monitoring.

Completed inventory work reported:
- Stock adjustments with transaction-based updates and validation.
- Per-product and global inventory movement history.
- Low-stock product listing and inventory statistics.
- CSV exports for stock and movement history.
- Branded low-stock email alerts for inventory adjustments and direct product updates.
- Replenishment-and-alert-again scenario verified.
- Duplicate-alert regression check verified.

**Deferred dependency:** Purchase-triggered low-stock alerts must be connected to the successful stock deduction/order flow when checkout and order processing exist. Do not implement this before that flow exists.

## Phase 5 — Order Management

Planned work:
- Create orders from validated cart contents.
- Save product names, prices, and quantities as order snapshots.
- Capture customer and delivery details.
- Support Bangladesh delivery zones and delivery fees.
- Manage order statuses and cancellation rules.

## Phase 6 — Payments

Planned work:
- Cash on delivery (COD).
- Payment records and payment statuses.
- Online payment integration in a later step.
- Payment verification and idempotent processing.

## Phase 7 — Integration and Hardening

Planned work:
- Test complete cart-to-order workflows.
- Verify stock and payment consistency.
- Validate authorization and error handling.
- Prepare APIs for frontend integration.

## Established E-commerce Decisions

- Physical products only, for B2C customers.
- Customers must log in using the existing Better Auth setup to check out.
- Strict stock tracking.
- Bangladesh-only delivery for the initial release.
- Simple products without variants.
- Prices stored as numeric BDT amounts.
- Delivery fees based on delivery zone.
- Manual delivery arrangement initially; courier integration later.
- Public product APIs must return only published products.
- Public product APIs must never expose `costPrice`.

## Working Conventions

- Follow the existing API structure and conventions established by the current backend modules.
- Define the API contract before implementing a module.
- Implement incrementally, one step at a time.
- Run `pnpm build` after changes and test endpoints with Postman.
- Treat a feature as complete only after the developer confirms the build and relevant tests pass.
- Do not claim to have run local builds or tests unless they were actually run in the developer's environment.
- Keep the roadmap updated when a phase is completed or a dependency is deferred.

## Current Position

**Phase 2: completed. Phase 3: next — Cart module. Phase 4: core inventory work completed.**

The next implementation work should begin with Phase 3 — Cart module, following the established step-by-step workflow.

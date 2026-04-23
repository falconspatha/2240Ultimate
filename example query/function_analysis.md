# Project Function Analysis (Food Donation DB)

This document summarizes the key functions the project should support, based on the ERD and operation flow.

## 1) Master Data Management

- Manage donor profiles (`tblDonor`)
- Manage product catalog and handling rules (`tblProduct`)
- Manage beneficiary profiles and delivery attributes (`tblBeneficiary`)
- Manage storage zone setup and capacity (`tblStorageZone`)

## 2) Donation Receiving and Lot Tracking

- Register each inbound donation as a lot (`tblDonationLot`)
- Capture lot-level details: received date, expiry date, product, donor, and temperature requirement
- Track lot status (e.g., available, quarantined, expired, completed)

## 3) Inventory Control

- Record and update stock by lot and zone (`tblInventory`)
- Support unit-based and weight-based tracking (`On_Hand_Units`, `On_Hand_kg`)
- Maintain stock freshness by FEFO logic (first-expire-first-out)

## 4) Capacity Monitoring

- Track storage utilization against configured capacity (`tblStorageZone`)
- Keep historical usage logs (`tblZoneCapacityLog`)
- Trigger operational warnings for over-capacity or high utilization

## 5) Beneficiary Order Management

- Create order headers (`tblOrders`) with status and priority
- Maintain order lines (`tblOrderLine`) by product and requested quantity
- Monitor open/backordered lines for fulfillment planning

## 6) Allocation and Picking

- Allocate inventory to order lines (`tblPickAllocation`)
- Track allocated units/weight and picking completion (`Picked`)
- Compute fulfillment progress (requested vs allocated vs picked)

## 7) Operational Reporting and Decision Support

The system should support reports and dashboards for:

- Near-expiry and expired stock
- Zone utilization and capacity trend
- Order workload and service level
- Donor contribution and beneficiary demand
- Cold-chain compatibility risks

## 8) Suggested Application Features (Supabase + UI)

- Role-based access:
  - Admin (full access)
  - Warehouse staff (receiving, inventory, picking)
  - Coordinator (order and allocation management)
- Input forms:
  - Donation receiving form
  - Inventory adjustment form
  - Order creation and allocation form
- Business validation:
  - No negative stock
  - No allocation above available inventory
  - Alert when order requests cold-chain item for beneficiary without cold storage
- Automation ideas:
  - SQL views for dashboard KPIs
  - Triggers/functions for auto-updating `Last_Updated`
  - Scheduled checks for near-expiry alerts

## 9) Minimum Compliance Mapping (Spec-Oriented)

- Table requirement: project has 10 tables (passes minimum 4)
- Query requirement: `20_useful_queries.sql` provides 20 queries (passes minimum 4)
- Interface/forms/reports: covered by recommended feature design above
- Installation guide: already included in root `README.md`

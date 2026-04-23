# Food Donation Management Database (Supabase)

## Project Overview

This project implements a **Food Donation Management System** using **Database + Supabase (PostgreSQL)**.  
The system manages donor records, donation lots, storage zones, inventory, beneficiary orders, and picking allocation.

The database design is based on the provided ERD and contains **10 core tables**.

---

## Implementation (Final Code) Analysis from Project Spec

According to `SEHH2240 Project Specification`, the **Implementation (Final code)** section requires:

- Implement the proposed system with **tables, queries, interface, etc.**
- DBMS can be Microsoft Access / Oracle / other DBMS (Supabase PostgreSQL is valid as "other DBMS")
- If using software other than Access, provide an **installation guide**
- Minimum database requirements:
  - at least **4 tables**
  - each table has at least **10 records**
  - at least **4 queries**
- Implementation grading aspects:
  - **Structure: 30%**
  - **Interface: 10%**
  - **Queries: 30%**
  - **Forms: 15%**
  - **Reports: 15%**

### How This Project Fits the Requirement

- Uses **10 tables** (exceeds minimum 4 tables)
- Designed for SQL queries and dashboard/forms integration (can exceed 4 queries)
- Can be deployed with Supabase SQL editor and exposed via API/UI
- Installation steps are included in this README for non-Access implementation

---

## Database Platform

- **DBMS:** PostgreSQL (via Supabase)
- **Environment:** Supabase Project (Cloud)
- **Data Access:** SQL Editor / REST API / Supabase client SDK
- **Recommended Add-ons:** Row Level Security (RLS), database functions, and views

---

## ERD Tables (10 Tables)

The following tables are identified from the ERD image:

1. `tblDonor`
2. `tblDonationLot`
3. `tblProduct`
4. `tblOrders`
5. `tblOrderLine`
6. `tblBeneficiary`
7. `tblStorageZone`
8. `tblInventory`
9. `tblPickAllocation`
10. `tblZoneCapacityLog`

---

## Table Design Summary

### 1) `tblDonor`
- **PK:** `DonorID`
- **Columns:** `Name`, `Type`, `Phone`, `Address`, `District`, `Created_At`
- **Purpose:** Stores donor master data (individual/company/organization)

### 2) `tblProduct`
- **PK:** `ProductID`
- **Columns:** `name`, `Category`, `Unit_Weight_kg`, `Temp_Requirement`
- **Purpose:** Product catalog and handling requirements

### 3) `tblDonationLot`
- **PK:** `LotID`
- **FK:** `DonorID` -> `tblDonor.DonorID`, `ProductID` -> `tblProduct.ProductID`
- **Columns:** `Quantity_Units`, `Unit_Weight_kg`, `Expiry_Date`, `Received_Date`, `Temp_Requirement`, `StoredZoneID`, `Status`, `Notes`
- **Purpose:** Tracks each inbound donation batch

### 4) `tblStorageZone`
- **PK:** `ZoneID`
- **Columns:** `Zone_Name`, `Temp_Band`, `Capacity_kg`, `Notes`
- **Purpose:** Defines storage areas and capacity limits

### 5) `tblInventory`
- **PK:** `InventoryID`
- **FK:** `LotID` -> `tblDonationLot.LotID`, `ZoneID` -> `tblStorageZone.ZoneID`
- **Columns:** `On_Hand_Units`, `On_Hand_kg`, `Last_Updated`
- **Purpose:** Current stock balance by lot and zone

### 6) `tblBeneficiary`
- **PK:** `BeneficiaryID`
- **Columns:** `Beneficiary_Name`, `Contact_Name`, `Phone`, `Address`, `District`, `Latitude`, `Longitude`, `Has_Cold_Storage`, `Created_At`
- **Purpose:** Beneficiary organization and delivery location

### 7) `tblOrders`
- **PK:** `OrderID`
- **FK:** `BeneficiaryID` -> `tblBeneficiary.BeneficiaryID`
- **Columns:** `Order_Date`, `Status`, `Priority`, `Notes`
- **Purpose:** Outbound request/order header

### 8) `tblOrderLine`
- **PK:** `OrderLineID`
- **FK:** `OrderID` -> `tblOrders.OrderID`, `ProductID` -> `tblProduct.ProductID`
- **Columns:** `Qty_Units`, `Notes`
- **Purpose:** Requested products and quantities for each order

### 9) `tblPickAllocation`
- **PK:** `AllocationID`
- **FK:** `OrderLineID` -> `tblOrderLine.OrderLineID`, `InventoryID` -> `tblInventory.InventoryID`
- **Columns:** `Alloc_Units`, `Alloc_kg`, `Picked`
- **Purpose:** Allocates inventory to order lines and supports picking process

### 10) `tblZoneCapacityLog`
- **PK:** `LogID`
- **FK:** `ZoneID` -> `tblStorageZone.ZoneID`
- **Columns:** `Log_Date`, `Used_kg`
- **Purpose:** Time-series tracking of zone usage for capacity monitoring

---

## Core Business Flow

1. Create donor and product data (`tblDonor`, `tblProduct`)
2. Receive donations into lots (`tblDonationLot`)
3. Put stock into zones and update inventory (`tblInventory`, `tblStorageZone`)
4. Record beneficiary orders (`tblOrders`, `tblOrderLine`)
5. Allocate stock to orders (`tblPickAllocation`)
6. Monitor storage utilization (`tblZoneCapacityLog`)

---

## Suggested Constraints (Supabase/PostgreSQL)

- Primary keys on all `...ID` fields
- Foreign keys for all relationship links
- `CHECK` constraints:
  - quantities and weights `>= 0`
  - `Expiry_Date >= Received_Date` for donation lots
  - boolean field validation for `Picked`, `Has_Cold_Storage`
- Indexes:
  - `tblDonationLot(ProductID, Expiry_Date, Status)`
  - `tblInventory(ZoneID, LotID)`
  - `tblOrders(BeneficiaryID, Order_Date, Status)`
  - `tblPickAllocation(OrderLineID, InventoryID)`

---

## Minimum Query Set (meet spec requirement >= 4 queries)

Recommended SQL query topics:

1. **Near-expiry lots** (e.g., next 7 days)
2. **Zone utilization** (`Used_kg / Capacity_kg`)
3. **Open order fulfillment status** (requested vs allocated)
4. **Donor contribution summary** (units/kg by donor and date range)

Optional additional queries:

- FEFO candidate list (First-Expire-First-Out)
- Beneficiary district demand summary
- Product-level wastage/expired statistics

---

## Supabase Setup (Installation Guide)

1. Create a new Supabase project.
2. Open SQL Editor and execute schema SQL for the 10 tables.
3. Insert seed data (at least 10 records per table for submission requirement).
4. Enable API access and (optional) RLS policies.
5. Build forms/reports with:
   - Supabase + frontend (web/app), or
   - BI/reporting layer connected to PostgreSQL.

For course submission, include:

- Final code export (SQL schema + sample data)
- Query scripts
- UI/forms screenshots or demo link
- Any credentials/instructions if login is required

---

## Notes for SEHH2240 Submission

- This README focuses on **Implementation (Final code)** only.
- Report and presentation requirements are intentionally excluded here.
- Ensure your final submission package still follows naming and file-format rules in the course spec.


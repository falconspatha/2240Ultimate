export type Donor = {
  DonorID: number;
  Name: string;
  Type: string | null;
  Phone: string | null;
  Address: string | null;
  District: string | null;
  Created_At: string;
};

export type Product = {
  ProductID: number;
  name: string;
  Category: string | null;
  Unit_Weight_kg: number | null;
  Temp_Requirement: string | null;
};

export type DonationLot = {
  LotID: number;
  DonorID: number | null;
  ProductID: number;
  Quantity_Units: number;
  Unit_Weight_kg: number | null;
  Expiry_Date: string | null;
  Received_Date: string | null;
  Temp_Requirement: string | null;
  StoredZoneID: number | null;
  Status: string | null;
  Notes: string | null;
};

export type Inventory = {
  InventoryID: number;
  LotID: number;
  ZoneID: number;
  On_Hand_Units: number;
  On_Hand_kg: number;
  Last_Updated: string;
};

export type Order = {
  OrderID: number;
  BeneficiaryID: number;
  Order_Date: string;
  Status: string | null;
  Priority: string | null;
  Notes: string | null;
};

export type OrderLine = {
  OrderLineID: number;
  OrderID: number;
  ProductID: number;
  Qty_Units: number;
  Notes: string | null;
};

export type PickAllocation = {
  AllocationID: number;
  OrderLineID: number;
  InventoryID: number;
  Alloc_Units: number;
  Alloc_kg: number | null;
  Picked: boolean;
};

export type Zone = {
  ZoneID: number;
  Zone_Name: string;
  Temp_Band: string | null;
  Capacity_kg: number | null;
  Notes: string | null;
};

export type Beneficiary = {
  BeneficiaryID: number;
  Beneficiary_Name: string;
  Contact_Name: string | null;
  Phone: string | null;
  Address: string | null;
  District: string | null;
  Latitude: number | null;
  Longitude: number | null;
  Has_Cold_Storage: boolean;
  Created_At: string;
};

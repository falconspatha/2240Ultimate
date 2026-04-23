# Role Access Plan (UI + Navigation)

This plan defines which pages each of the 4 requested stakeholder types can see and use.

## 1) Administration staff

- Home route: `#/dashboard`
- Visible pages:
  - `dashboard`
  - `donors`
  - `products`
  - `lots`
  - `zones`
  - `inventory`
  - `beneficiaries`
  - `orders`
  - `picking`
  - `reports`
- Quick actions:
  - New Donor
  - New Order
  - Receive Lot

## 2) Inventory staff

- Home route: `#/inventory`
- Visible pages:
  - `dashboard`
  - `lots`
  - `zones`
  - `inventory`
  - `picking`
  - `reports`
- Quick actions:
  - Receive Lot

## 3) Beneficiaries

- Home route: `#/orders`
- Visible pages:
  - `dashboard`
  - `orders`
  - `reports`
- Hidden pages:
  - `picking`
  - `zones`
  - `inventory`
  - `lots`
  - `donors`
  - `products`
  - `beneficiaries`
- Quick actions:
  - New Order

## 4) Donors

- Home route: `#/lots`
- Visible pages:
  - `dashboard`
  - `products`
  - `lots`
  - `reports`
- Hidden pages:
  - `picking`
  - `zones`
  - `inventory`
  - `donors`
  - `beneficiaries`
  - `orders`
- Quick actions:
  - Receive Lot

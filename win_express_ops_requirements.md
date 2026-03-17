# Win Express Ops - Requirements Document

## App Overview

Win Express Ops is a Progressive Web App (PWA) designed to track,
monitor, and analyze delivery operations, expenses, and profitability
for Win Express logistics.

------------------------------------------------------------------------

## Theme & Branding

-   Primary Colors:
    -   Orange (#F97316)
    -   Blue (#1E3A8A)
    -   White (#FFFFFF)
-   Style:
    -   Clean, bold, logistics-focused UI
    -   Rounded cards and modern dashboard layout
-   Branding:
    -   Logo integration on header/dashboard
    -   Consistent color usage across buttons, charts, and tabs

------------------------------------------------------------------------

## Tech Stack

-   Frontend: React (Vite) + Tailwind CSS
-   Backend: Firebase Firestore
-   Auth: Basic Admin Login (Phase 1), Firebase Auth (Phase 2)
-   Charts: Chart.js
-   PWA Support: Vite PWA Plugin

------------------------------------------------------------------------

## Navigation

### Mobile:

Bottom Tab Navigation: - Dashboard - Expenses - Delivery - Reports -
Settings

### Web:

Sidebar Navigation

------------------------------------------------------------------------

## Modules

### 1. Dashboard

-   Greeting Section
-   Overview:
    -   Today Received
    -   Delivered
    -   Pending
-   Rider Performance:
    -   Assigned, Delivered, Pending per rider
-   Recent Expenses

------------------------------------------------------------------------

### 2. Expenses

-   Add Expense (FAB Button)
-   Fields:
    -   Date
    -   Type (Fuel, Salary, Maintenance, Utilities, Misc)
    -   Amount
    -   Notes
-   Expense List
-   Charts:
    -   Weekly/Monthly Pie Chart

------------------------------------------------------------------------

### 3. Delivery

#### Hub Entry

-   Date
-   Total Received
-   Delivered
-   Pending

#### Rider Entry

-   Rider Name
-   Date
-   Area (East/West/North/South)
-   Parcels Assigned
-   Delivered
-   Pending (Auto)
-   Notes

------------------------------------------------------------------------

### 4. Reports

#### Weekly Report

-   Total Parcels
-   Total Income
-   Total Expenses
-   Profit

#### Monthly Report

-   Same metrics
-   Trend Charts

------------------------------------------------------------------------

### 5. Analytics

-   Deliveries per day (Line Chart)
-   Profit Trend (Line Chart)
-   Expense Breakdown (Pie Chart)

------------------------------------------------------------------------

### 6. Settings

-   Profile (Fixed)
-   Rider Management
-   Rate per Parcel
-   Theme Toggle (Light/Dark)

------------------------------------------------------------------------

## Calculations

-   Income = Delivered × Rate per parcel
-   Profit = Income - Expenses
-   Pending = Assigned - Delivered

------------------------------------------------------------------------

## Firestore Collections

-   hub_entries
-   rider_entries
-   expenses
-   settings

------------------------------------------------------------------------

## Future Enhancements

-   Notifications
-   Export Reports (CSV/Excel)
-   Rider Performance Ranking
-   Loss Alerts

------------------------------------------------------------------------

## Tagline

Track. Optimize. Grow.

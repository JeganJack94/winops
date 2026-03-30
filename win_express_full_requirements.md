# Win Express Delivery App - Requirements Document

## Overview
This document defines the requirements for enhancing the Delivery App.  
Includes Delivery Tracking, KPI Dashboard, History, and **Earnings Page (Attendance + Salary)**.

---

# 1. KPI CARDS (Top Dashboard)

Display:

- Carry Forward  
- Received Today  
- Total Parcels  
- Average Received (last 7 days)  
- Average Success Rate (last 7 days)

---

# 2. Delivery Summary

Total = Carry Forward + Received Today

---

# 3. Rider Entry (Modal)

Fields:
- Rider Name (Dropdown)
- Date (Default: Today)

Assigned:
- Delivery
- Pickup

Completed:
- Delivery
- Pickup

- Amount Collected

Auto Calculation:
Failed = Assigned - Completed

---

# 4. Success Ratio

Success % = (Completed / Assigned) × 100

Color Logic:
- > 90% → Green  
- 80% – 90% → Amber  
- < 80% → Red  

---

# 5. Daily Summary

- Assigned  
- Completed  
- Pending  
- Amount Collected  
- Success %

Pending = Assigned - Completed

---

# 6. History Tracking

Each day stored as:

Date | Assigned | Completed | Pending | Amount | Success %

Features:
- View → Detailed rider data  
- Edit → Update values  
- Mark record as Edited

---

# 7. WhatsApp Share

Format:

Win Express – Daily Report

Date:

Rider | Assigned | Completed

Total:
Assigned:
Completed:
Pending:
Amount:
Success:

---

# 8. NEW MODULE: Earnings Page

## Security
- Password Protected Page  
- Password: Win9900

---

## Attendance & Earnings

Fields:
- Rider Name  
- Date  
- Present / Absent  
- Completed Deliveries  
- Salary  

Auto Logic:
If deliveries > 0 → Present

---

## Salary Calculation

Rate: ₹12 per parcel

Salary = Completed Deliveries × 12

---

## Rider Earnings View

Rider | Deliveries | Salary

---

## Monthly Summary

- Total Days Present  
- Total Deliveries  
- Total Earnings  

---

## Earnings Share

Win Express – Earnings Report

Date:

Rider | Deliveries | Salary

Total Payout:

---

## Data Sync

- Auto fetch from Delivery Page  
- Manual override allowed  

---

# 9. Workflow

Morning:
- Carry forward auto  
- Enter received  

During Day:
- Add rider entries  

Evening:
- Review summary  
- Save record  
- Share report  

---

# Future Enhancements

- Rider ranking  
- Weekly earnings  
- Advance tracking (Paid / Pending)  
- Graph analytics  
- Alerts for low performance  

---

# Conclusion

System enables:
- Delivery tracking  
- Performance monitoring  
- Earnings management  
- Full operational control  

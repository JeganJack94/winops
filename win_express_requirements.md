# Win Express Delivery App - Requirements Document

## Overview
This document defines the requirements for enhancing the Delivery Page of the Win Express App. 
The goal is to enable efficient daily operations tracking, rider performance monitoring, analytics, and reporting.

---

# 1. KPI CARDS (Top Dashboard)

Display summary cards at top:

- Total Parcels = Carry Forward + Received Today
- Carry Forward (Yesterday Pending)
- Received Today
- Average Received (last 7 days)
- Average Success Rate (last 7 days)

---

# 2. Daily Summary Section

### Fields:
- Carry Forward
- Received Today
- Total Parcels

### Formula:
Total = Carry Forward + Received Today

---

# 3. Rider Entry (Modal)

### Fields:
- Rider Name (Dropdown)
- Date (Default: Today)

Assigned:
- Delivery Count
- Pickup Count

Completed:
- Delivery Count
- Pickup Count

- Amount Collected (COD)

### Auto Calculation:
Failed = Assigned - Completed

---

# 4. Rider Performance Metrics

### Success Ratio:
Success % = (Completed / Assigned) * 100

### Color Coding:
- > 90% → Green
- 80% - 90% → Amber
- < 80% → Red

### Display per Rider:
- Rider Name
- Assigned
- Completed
- Failed
- Success % (with color indicator)

---

# 5. Overall Summary

Fields:
- Total Assigned
- Total Completed
- Total Pending
- Total Amount Collected
- Overall Success %

### Formula:
Pending = Assigned - Completed

---

# 6. Daily Record Storage (History)

Each day saved as single record:

### List View:
- Date
- Assigned
- Completed
- Pending
- Amount Collected
- Success %
- View Button

### Detail View:
- Rider-wise breakdown
- Assigned / Completed / Failed
- Amount collected

### Edit Option:
- Allow update of values
- Mark record as "Edited"

---

# 7. WhatsApp Share Feature

### Share Format:

Win Express – Daily Report

Date: DD-MM-YYYY

Riders:
<Name> | Assigned | Completed

Total:
Assigned: X
Completed: X
Pending: X
Amount Collected: ₹X
Success Rate: X%

---

# 8. Additional Features (Optional - Future)

- Rider Ranking (Top Performer)
- Warning Indicator for <80%
- Auto Carry Forward from previous day
- Daily Trend Tracking
- Graphs (Weekly performance)

---

# 9. Data Model (Suggested)

### Daily Record:
{
  date,
  carryForward,
  received,
  total,
  totalAssigned,
  totalCompleted,
  totalPending,
  totalAmount,
  successRate,
  riders: []
}

### Rider Record:
{
  riderName,
  assignedDelivery,
  assignedPickup,
  completedDelivery,
  completedPickup,
  failed,
  amountCollected,
  successRate
}

---

# 10. Workflow

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

## Conclusion
This system will act as a mini logistics control dashboard enabling:
- Better delivery tracking
- Reduced CNR
- Improved rider performance
- Clear reporting

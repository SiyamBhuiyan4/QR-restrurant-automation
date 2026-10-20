# Admin Panel Actions & Placement Audit

## Executive Summary
- **Total Buttons Audited**: 216 across 11 files (AdminDashboard: 0, AdminHeader: 15, AdminSidebar: 1, OverviewModule: 15, LiveTablesModule: 41, LiveOrdersModule: 9, AdminWaiterConsole: 33, EmployeesModule: 69, CustomerReportsModule: 23, CustomerSimulatorModule: 6, TableSecurityModal: 4).
- **Top 5 Misplaced Actions**:
  1. `client/src/components/admin/LiveTablesModule.jsx` (Line 1314): Destructive table removal button (`Trash2`) embedded directly inside the status pill in the top header badge of live table cards.
  2. `client/src/components/admin/AdminHeader.jsx` (Line 742): Destructive instant lock/logout button placed directly on the global top navigation bar without confirmation.
  3. `client/src/components/admin/AdminWaiterConsole.jsx` (Line 1067): Destructive "Delete Waiter" button (`Trash2`) placed in the primary station header bar alongside navigation controls.
  4. `client/src/components/admin/EmployeesModule.jsx` (Line 3117): Destructive "Clear Entire History" action placed directly in the activity history toolbar header.
  5. `client/src/components/admin/CustomerReportsModule.jsx` (Line 1379): Destructive "Reset Demo Data" button (`RotateCcw`) placed directly in the module top-level executive header.
- **Audit Findings**: 68 DUPLICATE actions identified across modules; 0 UNCLEAR entries (all button intents and handlers are unambiguous in code).

---

## 1. AdminDashboard.jsx
*Total Buttons: 0*
*(Note: Line 467 contains an overlay `<div>` with `onClick` to dismiss the mobile sidebar).*

| Line | Button label or icon | What it does (one line) | Where it sits now (header, page top, row, card, dialog, menu) | Type (primary, secondary, destructive) |
| :--- | :--- | :--- | :--- | :--- |
| - | None | No button elements in file (layout shell) | page top | secondary |

---

## 2. AdminHeader.jsx
*Total Buttons: 15*

| Line | Button label or icon | What it does (one line) | Where it sits now (header, page top, row, card, dialog, menu) | Type (primary, secondary, destructive) |
| :--- | :--- | :--- | :--- | :--- |
| 250 | Menu | Toggle mobile navigation sidebar | header | secondary |
| 303 | X | Clear global header search query | header | secondary |
| 318 | UtensilsCrossed (Tables count) | Navigate to Live Tables management view | header | secondary |
| 336 | Sun / Moon | Toggle dark and light theme mode | header | secondary |
| 351 | Bell | Toggle executive notification dropdown | header | secondary |
| 432 | CheckCheck (Mark all read) | Mark all visible notifications as read | menu | secondary |
| 456 | tab.label (Filter tab) | Filter notifications by category | menu | secondary |
| 505 | Restore dismissed alerts | Restore all dismissed notifications to list | menu | secondary |
| 601 | X | Dismiss single notification alert | row | secondary |
| 637 | theme.primaryActionText | Navigate to actionable tab for selected notification | card | primary |
| 648 | Jump to Table → | Navigate to live tables tab for alert table | card | secondary |
| 678 | Customer Reports → | Navigate to customer reports module | menu | secondary |
| 696 | AD (Profile pill) | Toggle admin profile menu dropdown | header | secondary |
| 726 | Lock (Lock / Logout) | Lock admin session and log out [DUPLICATE] | menu | destructive |
| 742 | Lock (Lock / Logout) | Lock admin session and log out immediately [DUPLICATE] | header | destructive |

---

## 3. AdminSidebar.jsx
*Total Buttons: 1*

| Line | Button label or icon | What it does (one line) | Where it sits now (header, page top, row, card, dialog, menu) | Type (primary, secondary, destructive) |
| :--- | :--- | :--- | :--- | :--- |
| 149 | item.icon / item.label | Switch active admin navigation tab | row | secondary |

---

## 4. OverviewModule.jsx
*Total Buttons: 15*

| Line | Button label or icon | What it does (one line) | Where it sits now (header, page top, row, card, dialog, menu) | Type (primary, secondary, destructive) |
| :--- | :--- | :--- | :--- | :--- |
| 763 | CalendarIcon (Show/Hide Calendar) | Toggle visibility of date range calendar picker | header | secondary |
| 800 | Cancel | Cancel pending custom end date selection [DUPLICATE] | page top | secondary |
| 827 | preset.label (Presets) | Apply quick date range preset filter | page top | secondary |
| 866 | Apply Range | Apply custom start/end date range filter | page top | primary |
| 1057 | Revenue ($) | Switch revenue chart metric view to revenue | card | secondary |
| 1068 | Order Count | Switch revenue chart metric view to order count | card | secondary |
| 1287 | Download (Export CSV Report) | Export filtered revenue and order report to CSV | card | primary |
| 1298 | FileText (Daily Z-Report / Print) | Open browser print dialog for daily register Z-report | card | secondary |
| 1350 | ChevronLeft | Navigate mini calendar to previous month | card | secondary |
| 1358 | ChevronRight | Navigate mini calendar to next month | card | secondary |
| 1420 | cell.date | Select start or end date in interactive calendar | card | secondary |
| 1446 | Cancel | Cancel pending custom end date selection in calendar widget [DUPLICATE] | card | secondary |
| 1457 | Reset to Today | Reset active date filter preset to today | card | secondary |
| 1473 | Show Calendar | Expand calendar widget when collapsed | card | secondary |
| 1531 | Table #{ord.tableNumber} → | Navigate to live tables view for selected running order | card | secondary |

---

## 5. LiveTablesModule.jsx
*Total Buttons: 41*

| Line | Button label or icon | What it does (one line) | Where it sits now (header, page top, row, card, dialog, menu) | Type (primary, secondary, destructive) |
| :--- | :--- | :--- | :--- | :--- |
| 805 | Lock (Apply) | Set venue table count (requires PIN 808080) | header | destructive |
| 847 | Grid View | Switch floor layout to grid card view | page top | secondary |
| 859 | Compact View | Switch floor layout to compact list view | page top | secondary |
| 875 | Sparkles (Auto-Balance) | Auto-redistribute tables evenly across active staff (requires PIN) | page top | secondary |
| 898 | Plus (Add Table) | Open dialog to add new custom table | page top | primary |
| 915 | Available metric card | Filter tables by Available status [DUPLICATE] | page top | secondary |
| 949 | Running Orders metric card | Filter tables by Running Orders status [DUPLICATE] | page top | secondary |
| 983 | Kitchen Ready metric card | Filter tables by Ready in Kitchen status [DUPLICATE] | page top | secondary |
| 1017 | Need Assistance metric card | Filter tables by Need Assistance status [DUPLICATE] | page top | secondary |
| 1056 | All tab | Filter tables to show all tables | page top | secondary |
| 1075 | Available tab | Filter tables by Available status [DUPLICATE] | page top | secondary |
| 1096 | Running Orders tab | Filter tables by Running Orders status [DUPLICATE] | page top | secondary |
| 1117 | Kitchen Ready tab | Filter tables by Ready in Kitchen status [DUPLICATE] | page top | secondary |
| 1138 | Needs Attention tab | Filter tables by Need Assistance status [DUPLICATE] | page top | secondary |
| 1164 | RotateCcw (Reset Filter) | Reset active table filter to show all tables [DUPLICATE] | page top | secondary |
| 1186 | X | Dismiss toast notification alert | page top | secondary |
| 1207 | Show All {n} Tables | Reset active filter to show all tables from empty state [DUPLICATE] | card | secondary |
| 1314 | Trash2 | Remove table from floor (requires PIN 808080) [DUPLICATE] | card | destructive |
| 1537 | Flame / Check (Advance Stage) | Advance table order to next kitchen workflow stage | card | primary |
| 1566 | RotateCcw (Clear & Reset Table) | Reset served table back to available status | card | primary |
| 1578 | AlertTriangle (Handle Issue) | Open issue resolution modal for table | card | primary |
| 1591 | Send / Check (Dispatch Employee) | Send dispatch alert notification to assigned employee handset | card | secondary |
| 1616 | Eye (Receipt) | Open full order receipt dialog | card | secondary |
| 1629 | Users (Seat Table) | Mark available table as seated and show QR confirmation | card | secondary |
| 1640 | Trash2 (Remove) | Remove table from floor (requires PIN 808080) [DUPLICATE] | card | destructive |
| 1682 | X | Close add table dialog [DUPLICATE] | dialog | secondary |
| 1701 | Users ({seats} Seats) | Select seating capacity (2, 4, 6, 8) in add table dialog | dialog | secondary |
| 1727 | MapPin ({zone.label}) | Select venue dining zone in add table dialog | dialog | secondary |
| 1769 | Quick Add 4-Seat Table | Quick populate add table form with 4 seats Main Hall | dialog | secondary |
| 1780 | Cancel | Close add table dialog without saving [DUPLICATE] | dialog | secondary |
| 1787 | Create Table | Submit new table creation | dialog | primary |
| 1825 | X | Close order receipt dialog [DUPLICATE] | dialog | secondary |
| 1981 | Printer (Print Bill Receipt) | Print customer bill receipt | dialog | secondary |
| 1993 | Send (Alert Employee) | Dispatch alert notification to assigned employee from receipt dialog | dialog | secondary |
| 2005 | Flame (Advance Stage) | Advance order kitchen stage from receipt dialog | dialog | primary |
| 2017 | Check (Clear Table / Reset) | Reset table to available status from receipt dialog | dialog | primary |
| 2058 | X | Close issue resolution dialog | dialog | secondary |
| 2087 | Send (Dispatch Employee) | Dispatch assigned employee to table from issue dialog | dialog | secondary |
| 2099 | ExternalLink (View in Reports) | Navigate to customer reports tab from issue dialog | dialog | secondary |
| 2111 | CheckCircle2 (Quick Resolve) | Mark table issue as resolved with standard message | dialog | primary |
| 2124 | CheckCircle2 (Resolve Complaint) | Mark table issue as resolved with custom notes | dialog | primary |

---

## 6. LiveOrdersModule.jsx
*Total Buttons: 9*

| Line | Button label or icon | What it does (one line) | Where it sits now (header, page top, row, card, dialog, menu) | Type (primary, secondary, destructive) |
| :--- | :--- | :--- | :--- | :--- |
| 391 | tab.label (Filter tab) | Filter orders by pipeline status tab | page top | secondary |
| 430 | X | Clear order search input text | page top | secondary |
| 466 | Reset Filters | Reset status filter and search query [DUPLICATE] | page top | secondary |
| 496 | Show All Active Orders | Reset status filter and search query from empty state [DUPLICATE] | card | secondary |
| 672 | Receipt | Open order kitchen ticket and print preview dialog | card | secondary |
| 683 | stageConfig.nextLabel | Advance order to next kitchen flow stage | card | primary |
| 721 | X | Close kitchen ticket dialog [DUPLICATE] | dialog | secondary |
| 784 | Printer (Print Kitchen Ticket) | Print kitchen order ticket | dialog | secondary |
| 794 | Close | Close kitchen ticket dialog [DUPLICATE] | dialog | secondary |

---

## 7. AdminWaiterConsole.jsx
*Total Buttons: 33*

| Line | Button label or icon | What it does (one line) | Where it sits now (header, page top, row, card, dialog, menu) | Type (primary, secondary, destructive) |
| :--- | :--- | :--- | :--- | :--- |
| 586 | All Fleet ({count}) | Switch view to all waiters overview | page top | secondary |
| 615 | waiter.name | Switch view to individual waiter station [DUPLICATE] | page top | secondary |
| 648 | Plus (New Waiter) | Open dialog to add new waiter [DUPLICATE] | page top | primary |
| 696 | Plus (Add Waiter Account) | Open dialog to add new waiter from empty state [DUPLICATE] | card | primary |
| 744 | Edit2 | Open edit modal for waiter [DUPLICATE] | card | secondary |
| 752 | Trash2 | Delete waiter account [DUPLICATE] | card | destructive |
| 780 | Copy / Check | Copy waiter login username to clipboard | card | secondary |
| 890 | Resolve Call (T{tbl}) | Mark customer assistance call as resolved [DUPLICATE] | card | primary |
| 909 | MessageSquare (Nudge) | Open direct messaging dialog for waiter | card | secondary |
| 918 | View Full Station → | Switch view to individual waiter station [DUPLICATE] | card | primary |
| 990 | Check (Resolve Call) | Mark customer assistance call as resolved [DUPLICATE] | header | primary |
| 1017 | ArrowRight (Back to Fleet) | Return to all-waiters fleet overview | header | secondary |
| 1057 | Edit2 (Edit Waiter) | Open edit modal for active waiter [DUPLICATE] | header | secondary |
| 1067 | Trash2 (Delete Waiter) | Delete active waiter account [DUPLICATE] | header | destructive |
| 1203 | Check (Mark as Resolved) | Mark customer assistance call as resolved [DUPLICATE] | card | primary |
| 1307 | MessageSquare (Normal Text) | Set quick inline message mode to normal text | card | secondary |
| 1319 | AlertTriangle (Urgent Call Alert) | Set quick inline message mode to urgent audio alert | card | secondary |
| 1347 | Table Forgotten Call template | Insert forgotten call template into message input | card | secondary |
| 1357 | Assistance Call Pending template | Insert assistance call template into message input | card | secondary |
| 1364 | Customer Waiting template | Insert customer waiting template into message input | card | secondary |
| 1392 | Send (Dispatch Direct Message) | Send quick inline dispatch message to active waiter | card | primary |
| 1438 | X | Close add/edit waiter modal dialog [DUPLICATE] | dialog | secondary |
| 1493 | Sparkles (Auto-Fill) | Auto-generate username and random PIN | dialog | secondary |
| 1528 | Roll Random | Generate random 4-digit PIN for waiter | dialog | secondary |
| 1545 | Eye / EyeOff | Toggle visibility of PIN input text in waiter form | dialog | secondary |
| 1569 | T{tbl} | Toggle table assignment for waiter | dialog | secondary |
| 1594 | Cancel | Close add/edit waiter modal dialog [DUPLICATE] | dialog | secondary |
| 1601 | Plus / Save (Save Waiter) | Submit add/edit waiter account form | dialog | primary |
| 1627 | X | Close message modal dialog [DUPLICATE] | dialog | secondary |
| 1639 | Normal Message | Set modal message category to normal text | dialog | secondary |
| 1651 | Urgent Audio Alert | Set modal message category to urgent audio alert | dialog | secondary |
| 1688 | Cancel | Close message modal dialog [DUPLICATE] | dialog | secondary |
| 1695 | Send (Dispatch) | Send direct message to waiter | dialog | primary |

---

## 8. EmployeesModule.jsx
*Total Buttons: 69*

| Line | Button label or icon | What it does (one line) | Where it sits now (header, page top, row, card, dialog, menu) | Type (primary, secondary, destructive) |
| :--- | :--- | :--- | :--- | :--- |
| 1747 | Toast Action ({label}) | Execute callback action associated with active toast notification | page top | secondary |
| 1759 | X | Dismiss toast notification banner | page top | secondary |
| 1797 | Undo2 (Undo) | Undo last employee roster modification | header | secondary |
| 1809 | RotateCcw (Shift Reset) | Reset all floor table assignments to baseline shift roster [DUPLICATE] | header | secondary |
| 1820 | Sparkles (Auto-Balance) | Auto-distribute tables evenly among active on-shift staff [DUPLICATE] | header | secondary |
| 1831 | Flame (Simulate Alert) | Trigger simulated guest service assistance alert [DUPLICATE] | header | secondary |
| 1842 | Plus (Add Employee) | Open modal dialog to add new employee [DUPLICATE] | header | primary |
| 1940 | Users (Staff Roster) | Switch to Staff Roster sub-tab | page top | secondary |
| 1966 | Clock (Waiters & Access) | Switch to Waiters & Mobile Access sub-tab | page top | secondary |
| 1992 | MapPin (Table Coverage) | Switch to Live Table Coverage sub-tab | page top | secondary |
| 2018 | Bell (Live Dispatch) | Switch to Active Floor Dispatch Alerts sub-tab | page top | secondary |
| 2044 | ShieldAlert (Audit & History) | Switch to Audit Log & Activity History sub-tab | page top | secondary |
| 2079 | All tab | Filter roster to all employee statuses | page top | secondary |
| 2092 | Active tab | Filter roster to Active employees only | page top | secondary |
| 2106 | Busy tab | Filter roster to Busy employees only | page top | secondary |
| 2120 | On Break tab | Filter roster to On Break employees only | page top | secondary |
| 2134 | Absent tab | Filter roster to Absent employees only | page top | secondary |
| 2159 | X | Clear employee search input text | page top | secondary |
| 2254 | ArrowRightLeft (Transfer Tables) | Open modal to transfer employee tables to backup staff | card | secondary |
| 2269 | RotateCcw (Shift Reset) | Reset individual employee table assignments to shift default | card | secondary |
| 2282 | Bell (Nudge Handset) | Send push notification nudge to employee handset | card | secondary |
| 2291 | Edit3 (Edit Employee) | Open modal dialog to edit employee [DUPLICATE] | card | secondary |
| 2300 | Trash2 (Delete Employee) | Delete employee record from system | card | destructive |
| 2330 | Eye / EyeOff | Toggle visibility of employee PIN on card [DUPLICATE] | card | secondary |
| 2342 | Copy (Copy Login Card) | Copy employee login credentials card to clipboard [DUPLICATE] | card | secondary |
| 2351 | QrCode (Keycard Print) | Open printable digital keycard modal dialog [DUPLICATE] | card | secondary |
| 2401 | T{tblNum} (Table badge) | Toggle individual table assignment for employee | card | secondary |
| 2481 | Copy (Copy All Credentials) | Copy all staff login credentials to clipboard | page top | secondary |
| 2491 | Plus (Add Waiter Account) | Open modal dialog to add new employee account [DUPLICATE] | page top | primary |
| 2598 | Copy (Copy Username) | Copy employee username to clipboard in access table | row | secondary |
| 2625 | Eye / EyeOff | Toggle visibility of employee PIN in access table [DUPLICATE] | row | secondary |
| 2633 | RotateCcw (Quick Reset PIN) | Generate and assign new random PIN for employee [DUPLICATE] | row | secondary |
| 2680 | Copy (Copy Card) | Copy employee login card to clipboard in access table [DUPLICATE] | row | secondary |
| 2690 | QrCode (Keycard) | Open printable keycard modal for employee [DUPLICATE] | row | secondary |
| 2702 | RotateCcw (Reset PIN) | Generate and assign new random PIN for employee [DUPLICATE] | row | secondary |
| 2712 | Edit3 (Edit) | Open modal dialog to edit employee [DUPLICATE] | row | secondary |
| 2750 | RotateCcw (Shift Reset) | Reset all floor table assignments to baseline shift roster [DUPLICATE] | page top | secondary |
| 2760 | Sparkles (Auto-Balance) | Auto-distribute tables evenly among active on-shift staff [DUPLICATE] | page top | secondary |
| 2912 | All tab | Filter dispatch alerts to all alerts | page top | secondary |
| 2921 | Active tab | Filter dispatch alerts to active alerts only | page top | secondary |
| 2930 | Resolved tab | Filter dispatch alerts to resolved alerts only | page top | secondary |
| 2941 | Plus (Simulate Alert) | Trigger simulated guest service assistance alert [DUPLICATE] | page top | secondary |
| 3046 | Bell (Nudge Handset) | Send urgent push notification nudge for dispatch alert | card | secondary |
| 3058 | ArrowRightLeft (Reassign Alert) | Open modal dialog to reassign alert to another employee | card | secondary |
| 3070 | CheckCircle2 (Acknowledge Alert) | Mark dispatch alert as resolved | card | primary |
| 3117 | Trash2 (Clear Entire History) | Clear all logged employee activity history entries | header | destructive |
| 3164 | All Actors tab | Filter activity audit log to all actors | page top | secondary |
| 3175 | Admin Only tab | Filter activity audit log to admin actions | page top | secondary |
| 3186 | Staff Only tab | Filter activity audit log to employee actions | page top | secondary |
| 3224 | X | Clear activity history search input text | page top | secondary |
| 3357 | Sparkles (Quick Dock) | Toggle floating role assignment dock at bottom of screen | card | secondary |
| 3391 | X | Close add/edit employee modal dialog [DUPLICATE] | dialog | secondary |
| 3454 | statusOption | Select employee work status | dialog | secondary |
| 3518 | Sparkles (Auto-Gen Username) | Auto-generate username from employee name | dialog | secondary |
| 3572 | Sparkles (Random PIN) | Generate random 4-digit security PIN | dialog | secondary |
| 3596 | Eye / EyeOff | Toggle visibility of PIN input text in employee form | dialog | secondary |
| 3622 | T{tblNum} (Table badge) | Toggle table assignment in add/edit employee form | dialog | secondary |
| 3646 | Cancel | Close add/edit employee modal dialog [DUPLICATE] | dialog | secondary |
| 3653 | Plus / Save (Save Employee) | Submit add/edit employee account form | dialog | primary |
| 3679 | X | Close reassign alert modal dialog [DUPLICATE] | dialog | secondary |
| 3698 | Select Employee for Reassignment | Reassign active alert to selected employee | dialog | secondary |
| 3732 | Cancel | Close reassign alert modal dialog [DUPLICATE] | dialog | secondary |
| 3762 | X | Close table transfer modal dialog [DUPLICATE] | dialog | secondary |
| 3842 | Cancel | Close table transfer modal dialog [DUPLICATE] | dialog | secondary |
| 3849 | Confirm & Transfer Tables | Transfer table assignments from departing employee to backup staff | dialog | primary |
| 3882 | X | Close keycard modal dialog [DUPLICATE] | dialog | secondary |
| 3976 | Copy (Copy Credentials Card) | Copy keycard login info to clipboard | dialog | secondary |
| 3985 | RotateCcw (Re-Roll PIN) | Generate and assign new random PIN from keycard dialog | dialog | secondary |
| 4002 | Done | Close keycard modal dialog [DUPLICATE] | dialog | secondary |

---

## 9. CustomerReportsModule.jsx
*Total Buttons: 23*

| Line | Button label or icon | What it does (one line) | Where it sits now (header, page top, row, card, dialog, menu) | Type (primary, secondary, destructive) |
| :--- | :--- | :--- | :--- | :--- |
| 481 | Customer Message tab | Switch communication drawer target to customer | dialog | secondary |
| 500 | Staff Dispatch tab | Switch communication drawer target to floor staff | dialog | secondary |
| 520 | X | Close communication drawer dialog | dialog | secondary |
| 584 | Preset message pill | Fill message input with predefined response template | dialog | secondary |
| 621 | Send (Send Message / Dispatch) | Send message to customer or dispatch staff to table | dialog | primary |
| 652 | X (Cancel) | Cancel resolution note entry dialog | dialog | secondary |
| 663 | Preset resolution note pill | Fill resolution note input with predefined template | dialog | secondary |
| 682 | CheckCircle2 (Confirm Resolution) | Mark report resolved with entered explanation note | dialog | primary |
| 1306 | X | Dismiss toast alert banner | page top | secondary |
| 1361 | Volume2 / VolumeX | Toggle audio chime alerts mute state | header | secondary |
| 1379 | RotateCcw (Reset Demo) | Reset demo data to seed initial customer reports | header | destructive |
| 1390 | Sparkles (Simulate Issue) | Toggle customer report simulation menu dropdown [DUPLICATE] | header | secondary |
| 1404 | Quick issue chip | Simulate specific customer issue directly [DUPLICATE] | header | secondary |
| 1422 | X | Close simulation menu dropdown | menu | secondary |
| 1433 | Scenario option | Simulate specific customer issue scenario [DUPLICATE] | menu | secondary |
| 1466 | Sparkles (Roll Random Scenario) | Simulate random customer report scenario [DUPLICATE] | menu | secondary |
| 1585 | tab.label (Filter tab) | Filter reports by status tab | page top | secondary |
| 1636 | X | Clear customer reports search input text | page top | secondary |
| 1785 | MessageSquare (Message Customer) | Open communication drawer to message customer | card | secondary |
| 1804 | UserCheck (Dispatch Waiter) | Open communication drawer to dispatch staff to table | card | secondary |
| 1828 | CheckCircle2 (Mark as Resolved) | Mark report ticket as resolved immediately without note | card | primary |
| 1838 | ChevronDown (Resolution Note) | Expand resolution note drawer for report ticket | card | secondary |
| 1849 | RotateCcw (Reopen Ticket) | Reopen resolved report ticket back to active status | card | secondary |

---

## 10. CustomerSimulatorModule.jsx
*Total Buttons: 6*

| Line | Button label or icon | What it does (one line) | Where it sits now (header, page top, row, card, dialog, menu) | Type (primary, secondary, destructive) |
| :--- | :--- | :--- | :--- | :--- |
| 212 | Smartphone | Switch simulator preview viewport to mobile width (390px) | header | secondary |
| 224 | Tablet | Switch simulator preview viewport to tablet width (768px) | header | secondary |
| 236 | Monitor | Switch simulator preview viewport to full desktop width | header | secondary |
| 250 | RotateCcw | Reload guest ordering iframe preview | header | secondary |
| 280 | issue.shortLabel (Simulate Issue) | Trigger simulated customer issue for selected table | card | secondary |
| 303 | Send (Text Diner) | Send staff message to customer table session | card | primary |

---

## 11. TableSecurityModal.jsx
*Total Buttons: 4*

| Line | Button label or icon | What it does (one line) | Where it sits now (header, page top, row, card, dialog, menu) | Type (primary, secondary, destructive) |
| :--- | :--- | :--- | :--- | :--- |
| 139 | X | Close admin PIN authorization dialog without executing action [DUPLICATE] | dialog | secondary |
| 196 | Eye / EyeOff | Toggle visibility of entered PIN characters | dialog | secondary |
| 230 | Cancel | Close admin PIN authorization dialog without executing action [DUPLICATE] | dialog | secondary |
| 239 | ShieldCheck (Confirm & Apply) | Verify admin PIN (808080) and execute pending protected action | dialog | primary |

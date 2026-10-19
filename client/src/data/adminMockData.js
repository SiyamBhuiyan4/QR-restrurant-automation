/**
 * @file adminMockData.js
 * @description Comprehensive mock data and state architecture for the SmartDine Admin Dashboard.
 * Includes Tables, Employees (Strictly Employee nomenclature), Live Orders,
 * 90-Day Historical Analytics & Dynamic Range Telemetry, Customer Issue Reports, and Analytical Helpers.
 */

// ============================================================================
// CONSTANTS & ENUMS
// ============================================================================

export const TABLE_STATUS = {
  AVAILABLE: 'available',
  ORDER_RUNNING: 'order_running',
  READY_IN_KITCHEN: 'ready_in_kitchen',
  NEED_ASSISTANCE: 'need_assistance',
};

export const TABLE_LOCATION = {
  MAIN_HALL: 'Main Hall',
  PATIO: 'Patio',
  WINDOW: 'Window',
};

export const EMPLOYEE_ROLE = {
  SENIOR_HOST: 'Senior Host',
  FLOOR_SPECIALIST: 'Floor Specialist',
  OPERATIONS_LEAD: 'Operations Lead',
};

export const EMPLOYEE_STATUS = {
  ACTIVE: 'active',
  BUSY: 'busy',
  BREAK: 'break',
};

export const EMPLOYEE_SHIFT = {
  MORNING: 'Morning',
  EVENING: 'Evening',
};

export const KITCHEN_STAGE = {
  PLACED: 'placed',
  PREPARING: 'preparing',
  READY_PICKUP: 'ready_pickup',
  SERVED: 'served',
};

export const ISSUE_SEVERITY = {
  CRITICAL: 'critical',
  MODERATE: 'moderate',
  LOW: 'low',
};

export const ISSUE_STATUS = {
  NEW: 'new',
  IN_PROGRESS: 'in_progress',
  RESOLVED: 'resolved',
};

// ============================================================================
// JSDOC TYPE DEFINITIONS
// ============================================================================

/**
 * @typedef {'available' | 'order_running' | 'ready_in_kitchen' | 'need_assistance'} TableStatus
 * @typedef {'Main Hall' | 'Patio' | 'Window'} TableLocation
 * @typedef {'Senior Host' | 'Floor Specialist' | 'Operations Lead'} EmployeeRole
 * @typedef {'active' | 'busy' | 'break'} EmployeeStatus
 * @typedef {'Morning' | 'Evening'} EmployeeShift
 * @typedef {'placed' | 'preparing' | 'ready_pickup' | 'served'} KitchenFlowStage
 * @typedef {'critical' | 'moderate' | 'low'} IssueSeverity
 * @typedef {'new' | 'in_progress' | 'resolved'} IssueStatus
 */

/**
 * @typedef {Object} AvatarInfo
 * @property {string} initials
 * @property {string} color
 * @property {string} bg
 */

/**
 * @typedef {Object} Table
 * @property {number} id - Table unique identifier (1-12)
 * @property {number} tableNumber - Table display number (1-12)
 * @property {string} name - Table formatted label (e.g. 'Table 1')
 * @property {TableStatus} status - Current operational status
 * @property {number|null} assignedEmployeeId - ID of assigned employee or null
 * @property {string|null} currentOrderId - ID of active order or null
 * @property {number} capacity - Seating capacity (2, 4, 6, 8)
 * @property {TableLocation} location - Zone in restaurant
 */

/**
 * @typedef {Object} Employee
 * @property {number} id - Unique employee ID
 * @property {string} name - Full employee name
 * @property {EmployeeRole} role - Role title (Senior Host, Floor Specialist, Operations Lead)
 * @property {AvatarInfo} avatar - Visual avatar properties
 * @property {string} initials - Convenience 2-letter initials
 * @property {string} avatarColor - Primary accent color hex
 * @property {EmployeeStatus} status - Active, busy, or on break
 * @property {number[]} assignedTableIds - Table IDs currently handled
 * @property {number} activePickupsCount - Orders ready for pickup by this employee
 * @property {number} avgResponseTimeSec - Average assistance response time in seconds
 * @property {string} phone - Direct phone / contact number
 * @property {EmployeeShift} shift - Current scheduled shift
 */

/**
 * @typedef {Object} OrderItem
 * @property {string} id - Item unique identifier
 * @property {string} name - Dish or beverage name
 * @property {number} quantity - Quantity ordered
 * @property {number} price - Unit price in USD
 * @property {string} [notes] - Special kitchen instruction
 */

/**
 * @typedef {Object} LiveOrder
 * @property {string} id - Order ID (e.g. 'ord-101')
 * @property {string} orderNumber - Visual display order code (e.g. '#1042')
 * @property {number} tableNumber - Table number (1-12)
 * @property {string} customerName - Guest name
 * @property {number} timeElapsedMinutes - Elapsed time since placement
 * @property {string} timestamp - ISO timestamp of order placement
 * @property {OrderItem[]} items - Array of purchased items
 * @property {number} subtotal - Sum of items before tax
 * @property {number} tax - Computed tax (10%)
 * @property {number} total - Final invoice total (subtotal + tax)
 * @property {KitchenFlowStage} kitchenFlowStage - Live kitchen workflow status
 * @property {number} assignedEmployeeId - Employee ID handling table service
 */

/**
 * @typedef {Object} HourlyData
 * @property {string} hour - Time slot (e.g. '11am', '12pm')
 * @property {number} revenue - Sales in this hour slot
 * @property {number} orders - Order count in this hour slot
 */

/**
 * @typedef {Object} DailyRevenueRecord
 * @property {string} date - Date string in YYYY-MM-DD
 * @property {number} revenue - Total sales revenue ($1,200 - $3,800)
 * @property {number} ordersCount - Total orders placed (45 - 130)
 * @property {number} profit - Gross profit (38% - 45% margin)
 * @property {number} avgOrderValue - Average order ticket size
 * @property {HourlyData[]} hourlyDistribution - 12-hour hourly breakdown
 */

/**
 * @typedef {Object} CustomerIssueNote
 * @property {string} id - Issue record identifier (e.g. 'note-001')
 * @property {number} tableNumber - Table number where issue arose
 * @property {string} customerName - Guest who filed the note
 * @property {string} complaintText - Direct message / feedback text
 * @property {string} timestamp - ISO timestamp of filing
 * @property {IssueSeverity} severity - 'critical' | 'moderate' | 'low'
 * @property {IssueStatus} status - 'new' | 'in_progress' | 'resolved'
 * @property {number|null} assignedEmployeeId - Staff member addressing the issue
 * @property {string|null} resolutionNote - Admin / Staff resolution memo
 */

// ============================================================================
// 1. 12 TABLES MOCK DATA
// ============================================================================

/** @type {Table[]} */
export const mockTables = [
  {
    id: 1,
    tableNumber: 1,
    name: 'Table 1',
    status: TABLE_STATUS.ORDER_RUNNING,
    assignedEmployeeId: 1,
    currentOrderId: 'ord-101',
    capacity: 4,
    location: TABLE_LOCATION.MAIN_HALL,
  },
  {
    id: 2,
    tableNumber: 2,
    name: 'Table 2',
    status: TABLE_STATUS.READY_IN_KITCHEN,
    assignedEmployeeId: 2,
    currentOrderId: 'ord-102',
    capacity: 2,
    location: TABLE_LOCATION.WINDOW,
  },
  {
    id: 3,
    tableNumber: 3,
    name: 'Table 3',
    status: TABLE_STATUS.AVAILABLE,
    assignedEmployeeId: null,
    currentOrderId: null,
    capacity: 4,
    location: TABLE_LOCATION.MAIN_HALL,
  },
  {
    id: 4,
    tableNumber: 4,
    name: 'Table 4',
    status: TABLE_STATUS.NEED_ASSISTANCE,
    assignedEmployeeId: 3,
    currentOrderId: null,
    capacity: 6,
    location: TABLE_LOCATION.PATIO,
  },
  {
    id: 5,
    tableNumber: 5,
    name: 'Table 5',
    status: TABLE_STATUS.ORDER_RUNNING,
    assignedEmployeeId: 1,
    currentOrderId: 'ord-103',
    capacity: 2,
    location: TABLE_LOCATION.WINDOW,
  },
  {
    id: 6,
    tableNumber: 6,
    name: 'Table 6',
    status: TABLE_STATUS.AVAILABLE,
    assignedEmployeeId: null,
    currentOrderId: null,
    capacity: 8,
    location: TABLE_LOCATION.MAIN_HALL,
  },
  {
    id: 7,
    tableNumber: 7,
    name: 'Table 7',
    status: TABLE_STATUS.READY_IN_KITCHEN,
    assignedEmployeeId: 4,
    currentOrderId: 'ord-104',
    capacity: 4,
    location: TABLE_LOCATION.PATIO,
  },
  {
    id: 8,
    tableNumber: 8,
    name: 'Table 8',
    status: TABLE_STATUS.AVAILABLE,
    assignedEmployeeId: null,
    currentOrderId: null,
    capacity: 2,
    location: TABLE_LOCATION.WINDOW,
  },
  {
    id: 9,
    tableNumber: 9,
    name: 'Table 9',
    status: TABLE_STATUS.NEED_ASSISTANCE,
    assignedEmployeeId: 3,
    currentOrderId: null,
    capacity: 6,
    location: TABLE_LOCATION.MAIN_HALL,
  },
  {
    id: 10,
    tableNumber: 10,
    name: 'Table 10',
    status: TABLE_STATUS.ORDER_RUNNING,
    assignedEmployeeId: 2,
    currentOrderId: 'ord-105',
    capacity: 4,
    location: TABLE_LOCATION.MAIN_HALL,
  },
  {
    id: 11,
    tableNumber: 11,
    name: 'Table 11',
    status: TABLE_STATUS.AVAILABLE,
    assignedEmployeeId: null,
    currentOrderId: null,
    capacity: 2,
    location: TABLE_LOCATION.PATIO,
  },
  {
    id: 12,
    tableNumber: 12,
    name: 'Table 12',
    status: TABLE_STATUS.ORDER_RUNNING,
    assignedEmployeeId: 5,
    currentOrderId: 'ord-106',
    capacity: 8,
    location: TABLE_LOCATION.WINDOW,
  },
];

// ============================================================================
// 2. 5 EMPLOYEES MOCK DATA (Strictly Employee nomenclature)
// ============================================================================

/** @type {Employee[]} */
export const mockEmployees = [
  {
    id: 1,
    name: 'Rakib Ahmed',
    role: EMPLOYEE_ROLE.FLOOR_SPECIALIST,
    avatar: {
      initials: 'RA',
      color: '#3B82F6',
      bg: '#EFF6FF',
    },
    initials: 'RA',
    avatarColor: '#3B82F6',
    status: EMPLOYEE_STATUS.BUSY,
    assignedTableIds: [1, 5],
    activePickupsCount: 0,
    avgResponseTimeSec: 85,
    phone: '+880 1712-345001',
    shift: EMPLOYEE_SHIFT.MORNING,
  },
  {
    id: 2,
    name: 'Hasan Mahmud',
    role: EMPLOYEE_ROLE.SENIOR_HOST,
    avatar: {
      initials: 'HM',
      color: '#10B981',
      bg: '#ECFDF5',
    },
    initials: 'HM',
    avatarColor: '#10B981',
    status: EMPLOYEE_STATUS.ACTIVE,
    assignedTableIds: [2, 10],
    activePickupsCount: 1,
    avgResponseTimeSec: 64,
    phone: '+880 1819-456002',
    shift: EMPLOYEE_SHIFT.MORNING,
  },
  {
    id: 3,
    name: 'Priya Sen',
    role: EMPLOYEE_ROLE.OPERATIONS_LEAD,
    avatar: {
      initials: 'PS',
      color: '#8B5CF6',
      bg: '#F5F3FF',
    },
    initials: 'PS',
    avatarColor: '#8B5CF6',
    status: EMPLOYEE_STATUS.BUSY,
    assignedTableIds: [4, 9],
    activePickupsCount: 0,
    avgResponseTimeSec: 52,
    phone: '+880 1913-789003',
    shift: EMPLOYEE_SHIFT.MORNING,
  },
  {
    id: 4,
    name: 'Tanvir Rahman',
    role: EMPLOYEE_ROLE.FLOOR_SPECIALIST,
    avatar: {
      initials: 'TR',
      color: '#F59E0B',
      bg: '#FFFBEB',
    },
    initials: 'TR',
    avatarColor: '#F59E0B',
    status: EMPLOYEE_STATUS.ACTIVE,
    assignedTableIds: [7],
    activePickupsCount: 1,
    avgResponseTimeSec: 94,
    phone: '+880 1614-234004',
    shift: EMPLOYEE_SHIFT.EVENING,
  },
  {
    id: 5,
    name: 'Saima Islam',
    role: EMPLOYEE_ROLE.SENIOR_HOST,
    avatar: {
      initials: 'SI',
      color: '#EC4899',
      bg: '#FDF2F8',
    },
    initials: 'SI',
    avatarColor: '#EC4899',
    status: EMPLOYEE_STATUS.BREAK,
    assignedTableIds: [12],
    activePickupsCount: 0,
    avgResponseTimeSec: 78,
    phone: '+880 1515-678005',
    shift: EMPLOYEE_SHIFT.EVENING,
  },
];

// ============================================================================
// 3. 6 LIVE ORDERS MOCK DATA
// ============================================================================

/** @type {LiveOrder[]} */
export const mockLiveOrders = [
  {
    id: 'ord-101',
    orderNumber: '#1042',
    tableNumber: 1,
    customerName: 'Arif Chowdhury',
    timeElapsedMinutes: 12,
    timestamp: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    items: [
      { id: 'itm-01', name: 'Balado Sauce Wings', quantity: 2, price: 14.50 },
      { id: 'itm-02', name: 'Truffle Parmesan Fries', quantity: 1, price: 8.00 },
      { id: 'itm-03', name: 'Mojito', quantity: 2, price: 7.50 },
    ],
    subtotal: 52.00,
    tax: 5.20,
    total: 57.20,
    kitchenFlowStage: KITCHEN_STAGE.PREPARING,
    assignedEmployeeId: 1,
  },
  {
    id: 'ord-102',
    orderNumber: '#1043',
    tableNumber: 2,
    customerName: 'Nadia Karim',
    timeElapsedMinutes: 24,
    timestamp: new Date(Date.now() - 24 * 60 * 1000).toISOString(),
    items: [
      { id: 'itm-04', name: 'Grilled Ribeye Steak (10oz)', quantity: 1, price: 34.00, notes: 'Medium rare, extra herb butter' },
      { id: 'itm-05', name: 'Old Fashioned', quantity: 1, price: 12.00 },
    ],
    subtotal: 46.00,
    tax: 4.60,
    total: 50.60,
    kitchenFlowStage: KITCHEN_STAGE.READY_PICKUP,
    assignedEmployeeId: 2,
  },
  {
    id: 'ord-103',
    orderNumber: '#1044',
    tableNumber: 5,
    customerName: 'Farhan Kabir',
    timeElapsedMinutes: 6,
    timestamp: new Date(Date.now() - 6 * 60 * 1000).toISOString(),
    items: [
      { id: 'itm-06', name: 'Artisanal Margherita Pizza', quantity: 1, price: 18.00 },
      { id: 'itm-07', name: 'Garlic Butter Cheesy Bread', quantity: 1, price: 9.50 },
    ],
    subtotal: 27.50,
    tax: 2.75,
    total: 30.25,
    kitchenFlowStage: KITCHEN_STAGE.PLACED,
    assignedEmployeeId: 1,
  },
  {
    id: 'ord-104',
    orderNumber: '#1045',
    tableNumber: 7,
    customerName: 'Tahmid Hasan',
    timeElapsedMinutes: 31,
    timestamp: new Date(Date.now() - 31 * 60 * 1000).toISOString(),
    items: [
      { id: 'itm-08', name: 'Pan-Seared Atlantic Salmon', quantity: 2, price: 28.00 },
      { id: 'itm-09', name: 'Crispy Salt & Pepper Calamari', quantity: 1, price: 13.50 },
      { id: 'itm-10', name: 'Espresso Martini', quantity: 2, price: 11.00 },
    ],
    subtotal: 91.50,
    tax: 9.15,
    total: 100.65,
    kitchenFlowStage: KITCHEN_STAGE.READY_PICKUP,
    assignedEmployeeId: 4,
  },
  {
    id: 'ord-105',
    orderNumber: '#1046',
    tableNumber: 10,
    customerName: 'Sadia Afrin',
    timeElapsedMinutes: 18,
    timestamp: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
    items: [
      { id: 'itm-11', name: 'SmartDine Classic Smash Burger', quantity: 2, price: 15.00 },
      { id: 'itm-12', name: 'Truffle Parmesan Fries', quantity: 2, price: 8.00 },
      { id: 'itm-13', name: 'Lemonade Sauce Wings', quantity: 1, price: 14.50 },
    ],
    subtotal: 60.50,
    tax: 6.05,
    total: 66.55,
    kitchenFlowStage: KITCHEN_STAGE.PREPARING,
    assignedEmployeeId: 2,
  },
  {
    id: 'ord-106',
    orderNumber: '#1047',
    tableNumber: 12,
    customerName: 'Zubair Hossain',
    timeElapsedMinutes: 42,
    timestamp: new Date(Date.now() - 42 * 60 * 1000).toISOString(),
    items: [
      { id: 'itm-14', name: 'Black Truffle & Wild Mushroom Pizza', quantity: 2, price: 22.00 },
      { id: 'itm-15', name: 'Fiery Peri-Peri Grilled Chicken', quantity: 1, price: 21.00 },
      { id: 'itm-16', name: 'Spicy Buffalo Wings', quantity: 2, price: 14.00 },
      { id: 'itm-17', name: 'Mojito', quantity: 3, price: 7.50 },
    ],
    subtotal: 115.50,
    tax: 11.55,
    total: 127.05,
    kitchenFlowStage: KITCHEN_STAGE.SERVED,
    assignedEmployeeId: 5,
  },
];

// ============================================================================
// 4. 4 CUSTOMER DIRECT-TO-ADMIN NOTES & ISSUE REPORTS
// ============================================================================

/** @type {CustomerIssueNote[]} */
export const mockCustomerNotes = [
  {
    id: 'note-001',
    tableNumber: 4,
    customerName: 'Rafiqul Islam',
    complaintText: 'Water spilled near chair leg; requesting floor wipe down and fresh cloth napkins promptly.',
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    severity: ISSUE_SEVERITY.CRITICAL,
    status: ISSUE_STATUS.IN_PROGRESS,
    assignedEmployeeId: 3,
    resolutionNote: 'Priya Sen dispatched with caution sign and cleaning kit.',
  },
  {
    id: 'note-002',
    tableNumber: 9,
    customerName: 'Mehnaz Haque',
    complaintText: 'Order #1040 dessert took more than 20 minutes to arrive; table requested status update.',
    timestamp: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    severity: ISSUE_SEVERITY.MODERATE,
    status: ISSUE_STATUS.NEW,
    assignedEmployeeId: 3,
    resolutionNote: null,
  },
  {
    id: 'note-003',
    tableNumber: 2,
    customerName: 'Nadia Karim',
    complaintText: 'AC vent airflow is blowing cold air directly onto Table 2 seating.',
    timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    severity: ISSUE_SEVERITY.LOW,
    status: ISSUE_STATUS.RESOLVED,
    assignedEmployeeId: 2,
    resolutionNote: 'Adjusted vent angle upward and offered table relocation if needed.',
  },
  {
    id: 'note-004',
    tableNumber: 7,
    customerName: 'Tahmid Hasan',
    complaintText: 'Requested extra house steak sauce and fresh cutlery set for new arrival at table.',
    timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    severity: ISSUE_SEVERITY.LOW,
    status: ISSUE_STATUS.RESOLVED,
    assignedEmployeeId: 4,
    resolutionNote: 'Delivered extra house steak sauce and silverware within 2 minutes.',
  },
];

// Alias export for flexibility
export const mockDirectNotes = mockCustomerNotes;

// ============================================================================
// 5. 90-DAY HISTORICAL DAILY REVENUE DATA & DYNAMIC RANGE GENERATOR
// ============================================================================

/**
 * Standard operating hours distribution weights for a restaurant (11am to 10pm).
 */
const HOURLY_WEIGHTS = [
  { hour: '11am', weight: 0.05 },
  { hour: '12pm', weight: 0.11 },
  { hour: '1pm',  weight: 0.14 },
  { hour: '2pm',  weight: 0.09 },
  { hour: '3pm',  weight: 0.04 },
  { hour: '4pm',  weight: 0.04 },
  { hour: '5pm',  weight: 0.07 },
  { hour: '6pm',  weight: 0.12 },
  { hour: '7pm',  weight: 0.16 },
  { hour: '8pm',  weight: 0.11 },
  { hour: '9pm',  weight: 0.05 },
  { hour: '10pm', weight: 0.02 },
];

/**
 * Safely parses any date input (Date, string YYYY-MM-DD or ISO, timestamp number)
 * into a Date object positioned at start-of-day (00:00:00.000) or end-of-day (23:59:59.999).
 * Preserves local calendar components without UTC displacement.
 * 
 * @param {Date|string|number|null|undefined} val - Input date
 * @param {boolean} [isEndOfDay=false] - If true, set to 23:59:59.999; else 00:00:00.000
 * @returns {Date|null}
 */
export function normalizeDateBoundary(val, isEndOfDay = false) {
  if (val === null || val === undefined || val === '') return null;

  if (val instanceof Date) {
    if (isNaN(val.getTime())) return null;
    const d = new Date(val.getTime());
    if (isEndOfDay) {
      d.setHours(23, 59, 59, 999);
    } else {
      d.setHours(0, 0, 0, 0);
    }
    return d;
  }

  if (typeof val === 'number') {
    const d = new Date(val);
    if (isNaN(d.getTime())) return null;
    if (isEndOfDay) {
      d.setHours(23, 59, 59, 999);
    } else {
      d.setHours(0, 0, 0, 0);
    }
    return d;
  }

  if (typeof val === 'string') {
    const trimmed = val.trim();
    // Parse YYYY-MM-DD or YYYY/MM/DD calendar date directly to prevent timezone shift
    const ymdMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (ymdMatch) {
      const year = parseInt(ymdMatch[1], 10);
      const month = parseInt(ymdMatch[2], 10) - 1;
      const day = parseInt(ymdMatch[3], 10);
      return isEndOfDay
        ? new Date(year, month, day, 23, 59, 59, 999)
        : new Date(year, month, day, 0, 0, 0, 0);
    }

    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      const d = new Date(parsed.getTime());
      if (isEndOfDay) {
        d.setHours(23, 59, 59, 999);
      } else {
        d.setHours(0, 0, 0, 0);
      }
      return d;
    }
  }

  return null;
}

/**
 * Formats a Date object into 'YYYY-MM-DD' calendar string.
 * @param {Date} date
 * @returns {string}
 */
export function formatDateToYYYYMMDD(date) {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Generates realistic, mathematically sound daily revenue analytics for the last N days or a date range.
 * Fully supports arbitrary date ranges with at least 60-90+ days of structured metrics.
 * 
 * @param {number|string|Date} [daysOrStartDate=90] - Days count (default 90) or range start date
 * @param {Date|string} [referenceOrEndDate=new Date()] - Reference end date
 * @returns {DailyRevenueRecord[]}
 */
export function generateHistoricalDailyData(daysOrStartDate = 90, referenceOrEndDate = new Date()) {
  let startDate;
  let endDate;

  if (typeof daysOrStartDate === 'number') {
    const days = Math.max(1, Math.round(daysOrStartDate));
    const refEnd = normalizeDateBoundary(referenceOrEndDate, true) || new Date();
    endDate = new Date(refEnd.getFullYear(), refEnd.getMonth(), refEnd.getDate(), 23, 59, 59, 999);
    startDate = new Date(refEnd.getFullYear(), refEnd.getMonth(), refEnd.getDate() - (days - 1), 0, 0, 0, 0);
  } else {
    let s = normalizeDateBoundary(daysOrStartDate, false);
    let e = normalizeDateBoundary(referenceOrEndDate, true);
    if (!s && !e) {
      const now = new Date();
      e = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      s = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 89, 0, 0, 0, 0);
    } else if (!s) {
      s = new Date(e.getFullYear(), e.getMonth(), e.getDate() - 89, 0, 0, 0, 0);
    } else if (!e) {
      e = new Date(s.getFullYear(), s.getMonth(), s.getDate() + 89, 23, 59, 59, 999);
    }

    if (s.getTime() > e.getTime()) {
      const temp = s;
      s = new Date(e.getFullYear(), e.getMonth(), e.getDate(), 0, 0, 0, 0);
      e = new Date(temp.getFullYear(), temp.getMonth(), temp.getDate(), 23, 59, 59, 999);
    }
    startDate = s;
    endDate = e;
  }

  const records = [];
  const cur = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 12, 0, 0, 0);
  const endLimit = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 12, 0, 0, 0);

  while (cur.getTime() <= endLimit.getTime()) {
    const year = cur.getFullYear();
    const month = String(cur.getMonth() + 1).padStart(2, '0');
    const day = String(cur.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    const dayOfWeek = cur.getDay(); // 0 = Sun, 5 = Fri, 6 = Sat
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6;

    // Pseudorandom consistent variation based on day index
    const seed = ((cur.getDate() * 17) + (cur.getMonth() * 31) + cur.getFullYear()) % 100;
    const variationFactor = 0.88 + (seed / 400); // 0.88 - 1.13

    // Weekends generate $2,500 - $3,750; Weekdays generate $1,350 - $2,350
    const baseRevenue = isWeekend ? 3100 : 1850;
    const rawRevenue = Math.round(baseRevenue * variationFactor);
    const revenue = Math.min(3800, Math.max(1200, rawRevenue));

    // Order counts between 45 and 130, proportional to revenue
    const approxTicketSize = 27.5 + ((seed % 10) * 0.4); // ~$27.5 - $31.5 per order
    const ordersCount = Math.min(130, Math.max(45, Math.round(revenue / approxTicketSize)));

    // Profit margin between 38% and 45%
    const profitMargin = 0.38 + ((seed % 8) * 0.01);
    const profit = Number((revenue * profitMargin).toFixed(2));

    // Average Order Value
    const avgOrderValue = Number((revenue / ordersCount).toFixed(2));

    // Calculate hourly breakdown conforming strictly to the daily revenue and orders count
    let remainingRev = revenue;
    let remainingOrders = ordersCount;

    const hourlyDistribution = HOURLY_WEIGHTS.map((slot, idx) => {
      const isLast = idx === HOURLY_WEIGHTS.length - 1;
      if (isLast) {
        return {
          hour: slot.hour,
          revenue: Math.max(0, Math.round(remainingRev)),
          orders: Math.max(0, remainingOrders),
        };
      }

      const slotRev = Math.round(revenue * slot.weight);
      const slotOrders = Math.round(ordersCount * slot.weight);

      remainingRev -= slotRev;
      remainingOrders -= slotOrders;

      return {
        hour: slot.hour,
        revenue: Math.max(0, slotRev),
        orders: Math.max(0, slotOrders),
      };
    });

    records.push({
      date: dateStr,
      revenue,
      ordersCount,
      profit,
      avgOrderValue,
      hourlyDistribution,
      timestamp: new Date(cur.getFullYear(), cur.getMonth(), cur.getDate(), 12, 0, 0).toISOString(),
    });

    cur.setDate(cur.getDate() + 1);
  }

  return records;
}

/**
 * Pre-computed 90-Day Historical Revenue Data ending on current system date.
 * Provides comprehensive historical coverage for analytics and date-range queries.
 * @type {DailyRevenueRecord[]}
 */
export const mockHistoricalRevenueData = generateHistoricalDailyData(90);

// Alias exports for analytics components
export const mockDailyRevenue = mockHistoricalRevenueData;
export const historicalRevenueData = mockHistoricalRevenueData;

// ============================================================================
// 6. ANALYTICS & STATE HELPER FUNCTIONS
// ============================================================================

/**
 * @typedef {Object} PeakLowestDay
 * @property {string} date
 * @property {number} revenue
 * @property {number} ordersCount
 */

/**
 * @typedef {Object} AggregatedHourlySlot
 * @property {string} hour
 * @property {number} revenue
 * @property {number} orders
 */

/**
 * @typedef {Object} ComparativePeriodMetrics
 * @property {string} startDate - Inclusive start date string (YYYY-MM-DD)
 * @property {string} endDate - Inclusive end date string (YYYY-MM-DD)
 * @property {number} daysCount - Total days in previous period
 * @property {number} totalRevenue - Aggregate sales in previous period
 * @property {number} totalOrders - Total orders in previous period
 * @property {number} totalProfit - Net profit in previous period
 * @property {number} profitMarginPct - Profit margin % in previous period
 * @property {number} avgOrderValue - Average order value in previous period
 * @property {number} avgDailyRevenue - Average daily sales in previous period
 * @property {number} avgDailyOrders - Average daily orders in previous period
 * @property {DailyRevenueRecord[]} dailyBreakdown - Records in previous period
 */

/**
 * @typedef {Object} MetricGrowthPercentages
 * @property {number} revenue - Growth % of revenue vs previous period
 * @property {number} orders - Growth % of orders count vs previous period
 * @property {number} profit - Growth % of profit vs previous period
 * @property {number} avgOrderValue - Growth % of average order value vs previous period
 */

/**
 * @typedef {Object} DateRangeMetrics
 * @property {string} startDate - Inclusive start date string (YYYY-MM-DD)
 * @property {string} endDate - Inclusive end date string (YYYY-MM-DD)
 * @property {number} daysCount - Total days in range
 * @property {number} totalRevenue - Aggregate gross sales in USD
 * @property {number} totalOrders - Aggregate count of orders
 * @property {number} totalProfit - Aggregate gross profit in USD
 * @property {number} profitMarginPct - Margin percentage (e.g. 41.2%)
 * @property {number} avgOrderValue - Average dollar value per order
 * @property {number} avgDailyRevenue - Average dollar revenue per day
 * @property {number} avgDailyOrders - Average orders per day
 * @property {PeakLowestDay|null} peakDay - Day with highest revenue
 * @property {PeakLowestDay|null} lowestDay - Day with lowest revenue
 * @property {DailyRevenueRecord[]} dailyBreakdown - Filtered daily records in range
 * @property {AggregatedHourlySlot[]} hourlyAggregate - Cumulative revenue & orders per hour slot
 * @property {ComparativePeriodMetrics} previousPeriod - Symmetrical prior period metrics
 * @property {{ totalRevenue: number, totalOrders: number, totalProfit: number, avgOrderValue: number }} previousMetrics - Prior period summary
 * @property {MetricGrowthPercentages} growth - Growth percentages vs prior period
 * @property {number} revenueGrowth - Revenue growth %
 * @property {number} ordersGrowth - Orders growth %
 * @property {number} profitGrowth - Profit growth %
 * @property {number} avgOrderValueGrowth - Average order value growth %
 * @property {number} aovGrowth - Alias for avgOrderValueGrowth
 */

/**
 * Calculates aggregated financial and volume metrics for an arbitrary custom date range.
 * 
 * Accurately:
 * 1. Filters records between startDate (00:00:00.000) and endDate (23:59:59.999).
 * 2. Accurately sums revenue, total orders count, net profit, and average order value.
 * 3. Dynamically generates coverage for arbitrary historical dates when querying default mock data.
 * 4. Computes comparative previous period metrics of equal duration for growth % telemetry.
 * 
 * @param {string|Date|number} [startDate] - Start of date range (YYYY-MM-DD, Date, or timestamp)
 * @param {string|Date|number} [endDate] - End of date range (YYYY-MM-DD, Date, or timestamp)
 * @param {DailyRevenueRecord[]} [data=mockHistoricalRevenueData] - Historical records list
 * @returns {DateRangeMetrics} Computed analytical summary
 */
export function calculateMetricsForDateRange(startDate, endDate, data = mockHistoricalRevenueData) {
  // Normalize date inputs to start of day (00:00:00.000) and end of day (23:59:59.999)
  let startBoundary = normalizeDateBoundary(startDate, false);
  let endBoundary = normalizeDateBoundary(endDate, true);

  // If no dates provided, use full span from dataset or fallback to last 30 days
  if (!startBoundary && !endBoundary) {
    if (Array.isArray(data) && data.length > 0) {
      startBoundary = normalizeDateBoundary(data[0].date || data[0].timestamp, false);
      endBoundary = normalizeDateBoundary(data[data.length - 1].date || data[data.length - 1].timestamp, true);
    } else {
      const now = new Date();
      endBoundary = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      startBoundary = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29, 0, 0, 0, 0);
    }
  } else if (!startBoundary && endBoundary) {
    startBoundary = new Date(endBoundary.getFullYear(), endBoundary.getMonth(), endBoundary.getDate() - 29, 0, 0, 0, 0);
  } else if (startBoundary && !endBoundary) {
    endBoundary = new Date(startBoundary.getFullYear(), startBoundary.getMonth(), startBoundary.getDate() + 29, 23, 59, 59, 999);
  }

  // Ensure startBoundary <= endBoundary (auto-swap if reversed)
  if (startBoundary.getTime() > endBoundary.getTime()) {
    const temp = startBoundary;
    startBoundary = new Date(endBoundary.getFullYear(), endBoundary.getMonth(), endBoundary.getDate(), 0, 0, 0, 0);
    endBoundary = new Date(temp.getFullYear(), temp.getMonth(), temp.getDate(), 23, 59, 59, 999);
  }

  const startStr = formatDateToYYYYMMDD(startBoundary);
  const endStr = formatDateToYYYYMMDD(endBoundary);

  const startMs = startBoundary.getTime();
  const endMs = endBoundary.getTime();

  // Range checker supporting both timestamp and calendar date strings
  const isRecordInRange = (record, minMs, maxMs, minStr, maxStr) => {
    if (record.timestamp) {
      const t = new Date(record.timestamp).getTime();
      return t >= minMs && t <= maxMs;
    }
    if (record.date) {
      return record.date >= minStr && record.date <= maxStr;
    }
    return false;
  };

  // 1. Filter records within inclusive date bounds
  let filtered = Array.isArray(data)
    ? data.filter((record) => isRecordInRange(record, startMs, endMs, startStr, endStr))
    : [];

  // If using default mock data dataset and range is outside pre-computed array, generate on-the-fly
  const isDefaultMockData = data === mockHistoricalRevenueData;
  if (filtered.length === 0 && isDefaultMockData) {
    filtered = generateHistoricalDailyData(startBoundary, endBoundary);
  }

  // Calculate day count
  const durationMs = endMs - startMs + 1;
  const calendarDaysCount = Math.max(1, Math.round(durationMs / 86400000));
  const daysCount = filtered.length > 0 ? filtered.length : calendarDaysCount;

  // 2. Compute comparative previous period boundaries
  // Previous period spans the same number of days immediately prior to startBoundary
  const prevEndBoundary = new Date(startBoundary.getTime() - 1);
  const prevStartBoundary = new Date(prevEndBoundary.getTime() - durationMs + 1);
  prevStartBoundary.setHours(0, 0, 0, 0);
  prevEndBoundary.setHours(23, 59, 59, 999);

  const prevStartStr = formatDateToYYYYMMDD(prevStartBoundary);
  const prevEndStr = formatDateToYYYYMMDD(prevEndBoundary);
  const prevStartMs = prevStartBoundary.getTime();
  const prevEndMs = prevEndBoundary.getTime();

  let prevFiltered = Array.isArray(data)
    ? data.filter((record) => isRecordInRange(record, prevStartMs, prevEndMs, prevStartStr, prevEndStr))
    : [];

  // If previous period has no records and we are using mock data, generate on-the-fly for accurate comparative telemetry
  if (prevFiltered.length === 0 && isDefaultMockData) {
    prevFiltered = generateHistoricalDailyData(prevStartBoundary, prevEndBoundary);
  }

  const prevDaysCount = prevFiltered.length > 0 ? prevFiltered.length : calendarDaysCount;

  // 3. Aggregate Current Period
  let totalRevenue = 0;
  let totalOrders = 0;
  let totalProfit = 0;
  let peakRecord = filtered[0] || null;
  let lowestRecord = filtered[0] || null;

  const hourlyMap = new Map();
  HOURLY_WEIGHTS.forEach(w => hourlyMap.set(w.hour, { hour: w.hour, revenue: 0, orders: 0 }));

  filtered.forEach((rec) => {
    const rev = Number(rec.revenue || 0);
    const orders = Number(rec.ordersCount || rec.orders || 0);
    const profit = Number(rec.profit || 0);

    totalRevenue += rev;
    totalOrders += orders;
    totalProfit += profit;

    if (!peakRecord || rev > peakRecord.revenue) peakRecord = rec;
    if (!lowestRecord || rev < lowestRecord.revenue) lowestRecord = rec;

    if (Array.isArray(rec.hourlyDistribution)) {
      rec.hourlyDistribution.forEach((h) => {
        const slot = hourlyMap.get(h.hour);
        if (slot) {
          slot.revenue += (h.revenue || 0);
          slot.orders += (h.orders || 0);
        }
      });
    }
  });

  totalRevenue = Number(totalRevenue.toFixed(2));
  totalProfit = Number(totalProfit.toFixed(2));
  const avgOrderValue = totalOrders > 0 ? Number((totalRevenue / totalOrders).toFixed(2)) : 0;
  const avgDailyRevenue = daysCount > 0 ? Number((totalRevenue / daysCount).toFixed(2)) : 0;
  const avgDailyOrders = daysCount > 0 ? Math.round(totalOrders / daysCount) : 0;
  const profitMarginPct = totalRevenue > 0 ? Number(((totalProfit / totalRevenue) * 100).toFixed(1)) : 0;

  // 4. Aggregate Previous Period
  let prevTotalRevenue = 0;
  let prevTotalOrders = 0;
  let prevTotalProfit = 0;

  prevFiltered.forEach((rec) => {
    prevTotalRevenue += Number(rec.revenue || 0);
    prevTotalOrders += Number(rec.ordersCount || rec.orders || 0);
    prevTotalProfit += Number(rec.profit || 0);
  });

  prevTotalRevenue = Number(prevTotalRevenue.toFixed(2));
  prevTotalProfit = Number(prevTotalProfit.toFixed(2));
  const prevAvgOrderValue = prevTotalOrders > 0 ? Number((prevTotalRevenue / prevTotalOrders).toFixed(2)) : 0;
  const prevAvgDailyRevenue = prevDaysCount > 0 ? Number((prevTotalRevenue / prevDaysCount).toFixed(2)) : 0;
  const prevAvgDailyOrders = prevDaysCount > 0 ? Math.round(prevTotalOrders / prevDaysCount) : 0;
  const prevProfitMarginPct = prevTotalRevenue > 0 ? Number(((prevTotalProfit / prevTotalRevenue) * 100).toFixed(1)) : 0;

  // 5. Growth % Calculations (safe against division by zero)
  const calculateGrowthPct = (curr, prev) => {
    if (prev === 0) {
      return curr > 0 ? 100 : 0;
    }
    return Number((((curr - prev) / prev) * 100).toFixed(1));
  };

  const revenueGrowth = calculateGrowthPct(totalRevenue, prevTotalRevenue);
  const ordersGrowth = calculateGrowthPct(totalOrders, prevTotalOrders);
  const profitGrowth = calculateGrowthPct(totalProfit, prevTotalProfit);
  const avgOrderValueGrowth = calculateGrowthPct(avgOrderValue, prevAvgOrderValue);

  return {
    startDate: startStr,
    endDate: endStr,
    daysCount,
    totalRevenue,
    totalOrders,
    totalProfit,
    profitMarginPct,
    avgOrderValue,
    avgDailyRevenue,
    avgDailyOrders,
    peakDay: peakRecord ? {
      date: peakRecord.date,
      revenue: peakRecord.revenue,
      ordersCount: peakRecord.ordersCount,
    } : null,
    lowestDay: lowestRecord ? {
      date: lowestRecord.date,
      revenue: lowestRecord.revenue,
      ordersCount: lowestRecord.ordersCount,
    } : null,
    dailyBreakdown: filtered,
    hourlyAggregate: Array.from(hourlyMap.values()),

    // Comparative Previous Period Metrics & Telemetry
    previousPeriod: {
      startDate: prevStartStr,
      endDate: prevEndStr,
      daysCount: prevDaysCount,
      totalRevenue: prevTotalRevenue,
      totalOrders: prevTotalOrders,
      totalProfit: prevTotalProfit,
      profitMarginPct: prevProfitMarginPct,
      avgOrderValue: prevAvgOrderValue,
      avgDailyRevenue: prevAvgDailyRevenue,
      avgDailyOrders: prevAvgDailyOrders,
      dailyBreakdown: prevFiltered,
    },
    previousMetrics: {
      totalRevenue: prevTotalRevenue,
      totalOrders: prevTotalOrders,
      totalProfit: prevTotalProfit,
      avgOrderValue: prevAvgOrderValue,
    },
    growth: {
      revenue: revenueGrowth,
      orders: ordersGrowth,
      profit: profitGrowth,
      avgOrderValue: avgOrderValueGrowth,
    },
    revenueGrowth,
    ordersGrowth,
    profitGrowth,
    avgOrderValueGrowth,
    aovGrowth: avgOrderValueGrowth,
  };
}

/**
 * @typedef {Object} AdminFilterState
 * @property {TableStatus|'all'} tableStatus
 * @property {TableLocation|'all'} tableLocation
 * @property {EmployeeRole|'all'} employeeRole
 * @property {KitchenFlowStage|'all'} orderStage
 * @property {IssueSeverity|'all'} issueSeverity
 * @property {IssueStatus|'all'} issueStatus
 */

/**
 * @typedef {Object} AdminDashboardState
 * @property {Table[]} tables - All restaurant dining tables
 * @property {Employee[]} employees - Dedicated restaurant staff
 * @property {LiveOrder[]} liveOrders - Real-time active orders
 * @property {CustomerIssueNote[]} directNotes - Customer issue tickets
 * @property {DailyRevenueRecord[]} historicalRevenueData - 90-day analytics records
 * @property {number|null} selectedTableId - Selected table in view
 * @property {number|null} selectedEmployeeId - Selected employee in view
 * @property {string|null} selectedOrderId - Selected live order
 * @property {string|null} selectedNoteId - Selected issue note
 * @property {{ startDate: string, endDate: string }} dateRange - Active analytics window
 * @property {'overview' | 'tables' | 'employees' | 'orders' | 'issues' | 'analytics'} activeTab
 * @property {AdminFilterState} filters - Current applied filters across views
 * @property {DateRangeMetrics} metricsSummary - Pre-calculated metrics for active date range
 */

/**
 * Constructs a fully initialized, clean Admin state architecture object.
 * Ready for React useState, useReducer, or Zustand / Context store.
 * 
 * @returns {AdminDashboardState}
 */
export function getInitialAdminState() {
  const defaultStartDate = mockHistoricalRevenueData[0]?.date || '';
  const defaultEndDate = mockHistoricalRevenueData[mockHistoricalRevenueData.length - 1]?.date || '';

  return {
    tables: [...mockTables],
    employees: [...mockEmployees],
    liveOrders: [...mockLiveOrders],
    directNotes: [...mockCustomerNotes],
    historicalRevenueData: [...mockHistoricalRevenueData],
    selectedTableId: null,
    selectedEmployeeId: null,
    selectedOrderId: null,
    selectedNoteId: null,
    dateRange: {
      startDate: defaultStartDate,
      endDate: defaultEndDate,
    },
    activeTab: 'overview',
    filters: {
      tableStatus: 'all',
      tableLocation: 'all',
      employeeRole: 'all',
      orderStage: 'all',
      issueSeverity: 'all',
      issueStatus: 'all',
    },
    metricsSummary: calculateMetricsForDateRange(defaultStartDate, defaultEndDate),
  };
}

// ============================================================================
// 7. LOOKUP & CONVENIENCE UTILITIES
// ============================================================================

/**
 * Lookup Table by ID
 * @param {number|string} tableId
 * @param {Table[]} [tables=mockTables]
 * @returns {Table|undefined}
 */
export function getTableById(tableId, tables = mockTables) {
  return tables.find(t => Number(t.id) === Number(tableId));
}

/**
 * Lookup Employee by ID
 * @param {number|string} employeeId
 * @param {Employee[]} [employees=mockEmployees]
 * @returns {Employee|undefined}
 */
export function getEmployeeById(employeeId, employees = mockEmployees) {
  return employees.find(e => Number(e.id) === Number(employeeId));
}

/**
 * Lookup Live Order by ID or Order Number
 * @param {string} orderIdOrNumber
 * @param {LiveOrder[]} [orders=mockLiveOrders]
 * @returns {LiveOrder|undefined}
 */
export function getOrderById(orderIdOrNumber, orders = mockLiveOrders) {
  if (!orderIdOrNumber) return undefined;
  return orders.find(o => o.id === orderIdOrNumber || o.orderNumber === orderIdOrNumber);
}

/**
 * Lookup Customer Note by ID
 * @param {string} noteId
 * @param {CustomerIssueNote[]} [notes=mockCustomerNotes]
 * @returns {CustomerIssueNote|undefined}
 */
export function getNoteById(noteId, notes = mockCustomerNotes) {
  return notes.find(n => n.id === noteId);
}

/**
 * Get all tables assigned to a given employee ID
 * @param {number|string} employeeId
 * @param {Table[]} [tables=mockTables]
 * @returns {Table[]}
 */
export function getTablesForEmployee(employeeId, tables = mockTables) {
  return tables.filter(t => Number(t.assignedEmployeeId) === Number(employeeId));
}

/**
 * Get all active orders assigned to a given employee ID
 * @param {number|string} employeeId
 * @param {LiveOrder[]} [orders=mockLiveOrders]
 * @returns {LiveOrder[]}
 */
export function getOrdersForEmployee(employeeId, orders = mockLiveOrders) {
  return orders.filter(o => Number(o.assignedEmployeeId) === Number(employeeId));
}

/**
 * Get all customer issue notes assigned to a given employee ID
 * @param {number|string} employeeId
 * @param {CustomerIssueNote[]} [notes=mockCustomerNotes]
 * @returns {CustomerIssueNote[]}
 */
export function getNotesForEmployee(employeeId, notes = mockCustomerNotes) {
  return notes.filter(n => Number(n.assignedEmployeeId) === Number(employeeId));
}

/**
 * Get aggregated real-time operational summary for an employee
 * @param {number|string} employeeId
 * @param {Object} [state]
 * @returns {{ employee: Employee|undefined, tables: Table[], activeOrders: LiveOrder[], openNotes: CustomerIssueNote[] }}
 */
export function getEmployeeOperationalSummary(employeeId, state = {}) {
  const employees = state.employees || mockEmployees;
  const tables = state.tables || mockTables;
  const orders = state.liveOrders || mockLiveOrders;
  const notes = state.directNotes || mockCustomerNotes;

  const employee = getEmployeeById(employeeId, employees);
  const assignedTables = getTablesForEmployee(employeeId, tables);
  const activeOrders = getOrdersForEmployee(employeeId, orders);
  const openNotes = notes.filter(
    n => Number(n.assignedEmployeeId) === Number(employeeId) && n.status !== ISSUE_STATUS.RESOLVED
  );

  return {
    employee,
    tables: assignedTables,
    activeOrders,
    openNotes,
  };
}

/**
 * Formats a numeric currency value into standard USD format (e.g. $1,420.50)
 * @param {number} amount
 * @returns {string}
 */
export function formatCurrency(amount) {
  if (typeof amount !== 'number' || isNaN(amount)) return '$0.00';
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default {
  // Constants
  TABLE_STATUS,
  TABLE_LOCATION,
  EMPLOYEE_ROLE,
  EMPLOYEE_STATUS,
  EMPLOYEE_SHIFT,
  KITCHEN_STAGE,
  ISSUE_SEVERITY,
  ISSUE_STATUS,

  // Datasets
  tables: mockTables,
  employees: mockEmployees,
  liveOrders: mockLiveOrders,
  customerNotes: mockCustomerNotes,
  directNotes: mockCustomerNotes,
  historicalRevenueData: mockHistoricalRevenueData,
  mockDailyRevenue: mockHistoricalRevenueData,
  dailyRevenue: mockHistoricalRevenueData,

  // Functions
  normalizeDateBoundary,
  formatDateToYYYYMMDD,
  generateHistoricalDailyData,
  calculateMetricsForDateRange,
  getInitialAdminState,
  getTableById,
  getEmployeeById,
  getOrderById,
  getNoteById,
  getTablesForEmployee,
  getOrdersForEmployee,
  getNotesForEmployee,
  getEmployeeOperationalSummary,
  formatCurrency,
};

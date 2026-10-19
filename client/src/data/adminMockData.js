/**
 * @file adminMockData.js
 * @description Comprehensive mock data and state architecture for the SmartDine Admin Dashboard.
 * Includes Tables, Employees (Strictly Employee nomenclature, NOT Waiters), Live Orders,
 * 30-Day Historical Analytics, Customer Issue Reports, and Analytical Helpers.
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
// 2. 5 EMPLOYEES MOCK DATA (Strictly named Employees, NOT Waiters)
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
// 5. 30 DAYS HISTORICAL DAILY REVENUE DATA (Deterministic & Dynamic Generator)
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
 * Generates realistic, mathematically sound daily revenue analytics for the last N days.
 * @param {number} [daysCount=30] - Number of days to generate
 * @param {Date|string} [referenceDate=new Date()] - End date of the historical range
 * @returns {DailyRevenueRecord[]}
 */
export function generateHistoricalDailyData(daysCount = 30, referenceDate = new Date()) {
  const endDate = referenceDate instanceof Date ? referenceDate : new Date(referenceDate);
  const records = [];

  // Seed base curves to generate believable restaurant cyclical variations (weekends vs weekdays)
  for (let i = daysCount - 1; i >= 0; i--) {
    const curDate = new Date(endDate);
    curDate.setDate(curDate.getDate() - i);

    const year = curDate.getFullYear();
    const month = String(curDate.getMonth() + 1).padStart(2, '0');
    const day = String(curDate.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    const dayOfWeek = curDate.getDay(); // 0 = Sun, 5 = Fri, 6 = Sat
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6;

    // Pseudorandom consistent variation based on day index
    const seed = ((curDate.getDate() * 17) + (curDate.getMonth() * 31) + curDate.getFullYear()) % 100;
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
    });
  }

  return records;
}

/**
 * Pre-computed 30-Day Historical Revenue Data ending on current system date.
 * @type {DailyRevenueRecord[]}
 */
export const mockHistoricalRevenueData = generateHistoricalDailyData(30);

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
 */

/**
 * Calculates aggregated financial and volume metrics for an arbitrary date range.
 * 
 * @param {string|Date} startDate - Start of date range (YYYY-MM-DD or Date)
 * @param {string|Date} endDate - End of date range (YYYY-MM-DD or Date)
 * @param {DailyRevenueRecord[]} [data=mockHistoricalRevenueData] - Historical records list
 * @returns {DateRangeMetrics} Computed analytical summary
 */
export function calculateMetricsForDateRange(startDate, endDate, data = mockHistoricalRevenueData) {
  // Normalize date inputs to YYYY-MM-DD
  const formatStr = (val) => {
    if (!val) return '';
    if (val instanceof Date) {
      const y = val.getFullYear();
      const m = String(val.getMonth() + 1).padStart(2, '0');
      const d = String(val.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    return String(val).slice(0, 10);
  };

  const start = formatStr(startDate);
  const end = formatStr(endDate);

  // Filter records within inclusive date bounds
  const filtered = data.filter((record) => {
    if (start && record.date < start) return false;
    if (end && record.date > end) return false;
    return true;
  });

  if (filtered.length === 0) {
    return {
      startDate: start,
      endDate: end,
      daysCount: 0,
      totalRevenue: 0,
      totalOrders: 0,
      totalProfit: 0,
      profitMarginPct: 0,
      avgOrderValue: 0,
      avgDailyRevenue: 0,
      avgDailyOrders: 0,
      peakDay: null,
      lowestDay: null,
      dailyBreakdown: [],
      hourlyAggregate: HOURLY_WEIGHTS.map(w => ({ hour: w.hour, revenue: 0, orders: 0 })),
    };
  }

  let totalRevenue = 0;
  let totalOrders = 0;
  let totalProfit = 0;

  /** @type {DailyRevenueRecord} */
  let peakRecord = filtered[0];
  /** @type {DailyRevenueRecord} */
  let lowestRecord = filtered[0];

  // Map to accumulate hourly aggregate
  const hourlyMap = new Map();
  HOURLY_WEIGHTS.forEach(w => hourlyMap.set(w.hour, { hour: w.hour, revenue: 0, orders: 0 }));

  filtered.forEach((rec) => {
    totalRevenue += rec.revenue;
    totalOrders += rec.ordersCount;
    totalProfit += rec.profit;

    if (rec.revenue > peakRecord.revenue) peakRecord = rec;
    if (rec.revenue < lowestRecord.revenue) lowestRecord = rec;

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

  const daysCount = filtered.length;
  totalRevenue = Number(totalRevenue.toFixed(2));
  totalProfit = Number(totalProfit.toFixed(2));

  const avgOrderValue = totalOrders > 0 ? Number((totalRevenue / totalOrders).toFixed(2)) : 0;
  const avgDailyRevenue = daysCount > 0 ? Number((totalRevenue / daysCount).toFixed(2)) : 0;
  const avgDailyOrders = daysCount > 0 ? Math.round(totalOrders / daysCount) : 0;
  const profitMarginPct = totalRevenue > 0 ? Number(((totalProfit / totalRevenue) * 100).toFixed(1)) : 0;

  return {
    startDate: start || filtered[0].date,
    endDate: end || filtered[filtered.length - 1].date,
    daysCount,
    totalRevenue,
    totalOrders,
    totalProfit,
    profitMarginPct,
    avgOrderValue,
    avgDailyRevenue,
    avgDailyOrders,
    peakDay: {
      date: peakRecord.date,
      revenue: peakRecord.revenue,
      ordersCount: peakRecord.ordersCount,
    },
    lowestDay: {
      date: lowestRecord.date,
      revenue: lowestRecord.revenue,
      ordersCount: lowestRecord.ordersCount,
    },
    dailyBreakdown: filtered,
    hourlyAggregate: Array.from(hourlyMap.values()),
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
 * @property {DailyRevenueRecord[]} historicalRevenueData - 30-day analytics records
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

  // Functions
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

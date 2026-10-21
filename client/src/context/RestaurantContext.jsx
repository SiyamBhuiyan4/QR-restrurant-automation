import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { verifyStaffSecret, stripPlainCredentials } from '../utils/staffCredentials';
import {
  TABLE_STATUS,
  TABLE_LOCATION,
  EMPLOYEE_ROLE,
  EMPLOYEE_STATUS,
  mockTables as defaultMockTables,
  mockEmployees as defaultMockEmployees
} from '../data/adminMockData';
import { useSocket, useSocketListener, resolveServerUrl } from './SocketContext';
import { verifyAdminPin } from '../utils/adminAuth';

const RestaurantContext = createContext(null);

// ---------------------------------------------------------------------------
// Server sync helpers for order corrections (localStorage stays the offline fallback)
// ---------------------------------------------------------------------------
const sendCorrectionRequest = (method, path, body) => {
  try {
    fetch(`${resolveServerUrl()}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).catch(() => {});
  } catch (_) { /* offline or fetch unavailable: localStorage copy remains */ }
};

/** Converts server correction rows (newest first) into the local snapshot shape. */
const correctionRowsToSnapshot = (rows = []) => {
  const voids = {};
  const discounts = {};
  const requests = [];
  const latestDiscount = {};
  for (const row of rows) {
    if (!row || !row.type) continue;
    const key = String(row.orderId);
    const isAppliedVoid = row.type === 'void' && row.status === 'applied';
    const isApprovedRequest = row.type === 'void_request' && row.status === 'approved';
    if (isAppliedVoid || isApprovedRequest) {
      voids[key] = Array.from(new Set([...(voids[key] || []), ...(row.itemIndexes || [])]));
    }
    if (row.type === 'void_request') {
      const { type: _type, ...request } = row;
      requests.push(request);
    }
    if (row.type === 'discount' && !latestDiscount[key]) {
      latestDiscount[key] = row;
    }
  }
  for (const [key, row] of Object.entries(latestDiscount)) {
    discounts[key] = row.status === 'applied'
      ? { id: row.id, type: row.discountType, value: row.value, reason: row.reason, note: row.note, appliedBy: row.appliedBy, appliedAt: row.appliedAt }
      : null;
  }
  return { voids, discounts, requests: requests.slice(0, 200) };
};

/** Merges server truth over local state: voids and requests union, server wins on conflicts. */
const mergeCorrectionSnapshots = (local, server) => {
  const voids = { ...local.voids };
  for (const [key, items] of Object.entries(server.voids)) {
    voids[key] = Array.from(new Set([...(voids[key] || []), ...items]));
  }
  const byId = new Map();
  for (const request of local.requests) byId.set(request.id, request);
  for (const request of server.requests) byId.set(request.id, request);
  const requests = [...byId.values()]
    .sort((a, b) => (b.requestedAt || 0) - (a.requestedAt || 0))
    .slice(0, 200);
  // Server-known discount keys (including null = cleared) override local values
  const discounts = { ...local.discounts, ...server.discounts };
  return { voids, discounts, requests };
};

export const STORAGE_KEYS = {
  ORDER_CORRECTIONS: 'smartdine_order_corrections',
  TABLES: 'smartdine_restaurant_tables',
  EMPLOYEES: 'smartdine_restaurant_employees',
  TABLE_COUNT: 'smartdine_table_count',
  CALLS: 'smartdine_active_assistance_calls',
  REPORTS: 'smartdine_customer_reports_v4',
  MESSAGES: 'smartdine_staff_messages',
  ACTIVITY: 'smartdine_employee_activity_history'
};

export const DEFAULT_ACTIVITY_LOGS = [
  {
    id: 'act-seed-1',
    timestamp: Date.now() - 3 * 60 * 1000,
    actorType: 'employee',
    actorId: 'emp-6',
    actorName: 'Kabir Hossain',
    actorRole: 'Kitchen Chef',
    actorStaffId: '106',
    actionType: 'TEXT_WAITER',
    description: 'Texted waiter Rakib Ahmed: "Table 2 Garlic Butter Ribeye plated & ready for pickup"',
    target: 'Rakib Ahmed',
    details: 'Table 2 Garlic Butter Ribeye plated & ready for pickup'
  },
  {
    id: 'act-seed-2',
    timestamp: Date.now() - 8 * 60 * 1000,
    actorType: 'admin',
    actorId: 'admin',
    actorName: 'Head Desk / Admin',
    actorRole: 'Admin',
    actorStaffId: 'ADMIN',
    actionType: 'ALERT_WAITER',
    description: 'Sent URGENT ALERT to waiter Hasan Mahmud: "Table 5 customer waiting for bill, please attend!"',
    target: 'Hasan Mahmud',
    details: 'Table 5 customer waiting for bill, please attend!'
  },
  {
    id: 'act-seed-3',
    timestamp: Date.now() - 14 * 60 * 1000,
    actorType: 'employee',
    actorId: 'emp-1',
    actorName: 'Rakib Ahmed',
    actorRole: 'Floor Specialist',
    actorStaffId: '101',
    actionType: 'RESOLVE_CALL',
    description: 'Resolved customer assistance call on Table 1 (Needs fresh water & napkins)',
    target: 'Table 1',
    details: 'Needs fresh water & napkins'
  },
  {
    id: 'act-seed-4',
    timestamp: Date.now() - 25 * 60 * 1000,
    actorType: 'employee',
    actorId: 'emp-6',
    actorName: 'Kabir Hossain',
    actorRole: 'Kitchen Chef',
    actorStaffId: '106',
    actionType: 'STAGE_ADVANCE',
    description: 'Advanced Order #104 from Preparing to Ready for Pickup',
    target: 'Order #104',
    details: 'Stage: ready_pickup'
  }
];

export const DEFAULT_EMPLOYEE_ROSTER = [
  {
    id: 'emp-1',
    numericId: 1,
    name: 'Rakib Ahmed',
    initials: 'RA',
    role: 'Floor Specialist',
    shift: 'Morning Shift (08:00 - 16:00)',
    status: 'Active',
    username: 'rakib',
    password: '1234',
    accountCode: 'WAIT-101',
    waiterCode: 'WAIT-101',
    passcode: '1234',
    pin: '1234',
    waiterPin: '1234',
    assignedTables: [1, 2, 3],
    color: 'from-orange-500 to-amber-600',
    avatarColor: '#f59e0b',
    avatarBg: 'from-orange-500 to-amber-600',
    zone: 'Zone 1 (Main Hall)',
    phone: '+880 1712-345001',
    email: 'rakib.ahmed@restaurant.local',
    hiredAt: '2026-01-15',
    avgResponseTime: '11s',
    onTimeRate: '99%'
  },
  {
    id: 'emp-2',
    numericId: 2,
    name: 'Hasan Mahmud',
    initials: 'HM',
    role: 'Senior Host',
    shift: 'Morning Shift (08:00 - 16:00)',
    status: 'Active',
    username: 'hasan',
    password: '1234',
    accountCode: 'WAIT-102',
    waiterCode: 'WAIT-102',
    passcode: '1234',
    pin: '1234',
    waiterPin: '1234',
    assignedTables: [4, 5, 6],
    color: 'from-blue-500 to-indigo-600',
    avatarColor: '#3b82f6',
    avatarBg: 'from-blue-500 to-indigo-600',
    zone: 'Zone 2 (Window Side)',
    phone: '+880 1819-456002',
    email: 'hasan.mahmud@restaurant.local',
    hiredAt: '2026-02-01',
    avgResponseTime: '11s',
    onTimeRate: '98%'
  },
  {
    id: 'emp-3',
    numericId: 3,
    name: 'Priya Sen',
    initials: 'PS',
    role: 'Operations Lead',
    shift: 'Morning Shift (08:00 - 16:00)',
    status: 'Active',
    username: 'priya',
    password: '1234',
    accountCode: 'WAIT-103',
    waiterCode: 'WAIT-103',
    passcode: '1234',
    pin: '1234',
    waiterPin: '1234',
    assignedTables: [7, 8],
    color: 'from-purple-500 to-violet-600',
    avatarColor: '#8b5cf6',
    avatarBg: 'from-purple-500 to-violet-600',
    zone: 'Zone 3 (Patio & Terrace)',
    phone: '+880 1913-789003',
    email: 'priya.sen@restaurant.local',
    hiredAt: '2026-02-15',
    avgResponseTime: '11s',
    onTimeRate: '100%'
  },
  {
    id: 'emp-4',
    numericId: 4,
    name: 'Tanvir Rahman',
    initials: 'TR',
    role: 'Floor Specialist',
    shift: 'Mid Shift (12:00 - 20:00)',
    status: 'Active',
    username: 'tanvir',
    password: '1234',
    accountCode: 'WAIT-104',
    waiterCode: 'WAIT-104',
    passcode: '1234',
    pin: '1234',
    waiterPin: '1234',
    assignedTables: [9, 10],
    color: 'from-amber-500 to-yellow-600',
    avatarColor: '#f59e0b',
    avatarBg: 'from-amber-500 to-yellow-600',
    zone: 'Zone 4 (Central Hall)',
    phone: '+880 1614-234004',
    email: 'tanvir.rahman@restaurant.local',
    hiredAt: '2026-03-01',
    avgResponseTime: '11s',
    onTimeRate: '97%'
  },
  {
    id: 'emp-5',
    numericId: 5,
    name: 'Sadia Islam',
    initials: 'SI',
    role: 'Senior Host',
    shift: 'Evening Shift (16:00 - 00:00)',
    status: 'Active',
    username: 'sadia',
    password: '1234',
    accountCode: 'WAIT-105',
    waiterCode: 'WAIT-105',
    passcode: '1234',
    pin: '1234',
    waiterPin: '1234',
    assignedTables: [11, 12],
    color: 'from-pink-500 to-rose-600',
    avatarColor: '#ec4899',
    avatarBg: 'from-pink-500 to-rose-600',
    zone: 'Zone 5 (Private Dining)',
    phone: '+880 1515-678005',
    email: 'sadia.islam@restaurant.local',
    hiredAt: '2026-03-10',
    avgResponseTime: '11s',
    onTimeRate: '98%'
  },
  {
    id: 'emp-042',
    numericId: 42,
    name: 'Alex M.',
    staffId: 'Staff #042',
    username: 'alex',
    password: '1234',
    accountCode: 'WAIT-042',
    waiterCode: 'WAIT-042',
    passcode: '1234',
    pin: '1234',
    waiterPin: '1234',
    initials: 'AM',
    role: 'Floor Specialist',
    shift: 'Floor Duty (12:00 - 20:00)',
    shiftTime: '12:00 - 20:00',
    status: 'Active',
    assignedTables: [1, 3, 4],
    color: 'from-amber-500 to-orange-600',
    avatarBg: 'from-amber-500 to-orange-600',
    avatarColor: '#f59e0b',
    avatar: {
      initials: 'AM',
      color: '#f59e0b',
      bg: '#fffbeb'
    },
    zone: 'Zone 1 (Main Hall)',
    phone: '+880 1700-000042',
    email: 'alex.m@restaurant.local',
    hiredAt: '2026-01-01',
    avgResponseTime: '8s',
    onTimeRate: '100%'
  },
  {
    id: 'emp-6',
    numericId: 6,
    staffId: 'Chef #106',
    name: 'Kabir Hossain',
    initials: 'KH',
    role: 'Kitchen Chef',
    shift: 'Morning Shift (08:00 - 16:00)',
    shiftTime: '08:00 - 16:00',
    status: 'Active',
    username: 'kabir',
    password: '1234',
    accountCode: 'CHEF-106',
    waiterCode: 'CHEF-106',
    passcode: '1234',
    pin: '1234',
    waiterPin: '1234',
    assignedTables: [],
    color: 'from-amber-600 to-red-600',
    avatarBg: 'from-amber-600 to-red-600',
    avatarColor: '#ea580c',
    avatar: {
      initials: 'KH',
      color: '#ea580c',
      bg: '#fff7ed'
    },
    zone: 'Kitchen Pass & Station',
    phone: '+880 1711-998877',
    email: 'kabir.chef@restaurant.local',
    hiredAt: '2026-01-01',
    avgResponseTime: '12s',
    onTimeRate: '100%'
  },
  {
    id: 'emp-7',
    numericId: 7,
    staffId: 'Chef #107',
    name: 'Tariqul Islam',
    initials: 'TI',
    role: 'Sous Chef',
    shift: 'Evening Shift (16:00 - 00:00)',
    shiftTime: '16:00 - 00:00',
    status: 'Active',
    username: 'tariq',
    password: '1234',
    accountCode: 'CHEF-107',
    waiterCode: 'CHEF-107',
    passcode: '1234',
    pin: '1234',
    waiterPin: '1234',
    assignedTables: [],
    color: 'from-orange-600 to-amber-700',
    avatarBg: 'from-orange-600 to-amber-700',
    avatarColor: '#d97706',
    avatar: {
      initials: 'TI',
      color: '#d97706',
      bg: '#fef3c7'
    },
    zone: 'Hot Line & Grills',
    phone: '+880 1722-112233',
    email: 'tariq.sous@restaurant.local',
    hiredAt: '2026-02-01',
    avgResponseTime: '10s',
    onTimeRate: '98%'
  },
  {
    id: 'emp-8',
    numericId: 8,
    staffId: 'Cook #108',
    name: 'Rahim Uddin',
    initials: 'RU',
    role: 'Line Cook',
    shift: 'Mid Shift (12:00 - 20:00)',
    shiftTime: '12:00 - 20:00',
    status: 'Active',
    username: 'rahim',
    password: '1234',
    accountCode: 'COOK-108',
    waiterCode: 'COOK-108',
    passcode: '1234',
    pin: '1234',
    waiterPin: '1234',
    assignedTables: [],
    color: 'from-red-600 to-rose-700',
    avatarBg: 'from-red-600 to-rose-700',
    avatarColor: '#e11d48',
    avatar: {
      initials: 'RU',
      color: '#e11d48',
      bg: '#ffe4e6'
    },
    zone: 'Appetizers & Prep',
    phone: '+880 1733-445566',
    email: 'rahim.cook@restaurant.local',
    hiredAt: '2026-02-15',
    avgResponseTime: '14s',
    onTimeRate: '96%'
  }
];

export const DEFAULT_CUSTOMER_REPORTS = [
  {
    id: 'rep-101',
    table: 4,
    note: 'Requested extra napkins and water 10 mins ago — no one came.',
    severity: 'critical',
    status: 'new',
    createdAt: Date.now() - 4 * 60000,
    staffId: 'emp-1',
    dispatch: null,
    resolvedAt: null,
    resolutionTime: null,
    resolutionNote: null,
    messages: []
  },
  {
    id: 'rep-102',
    table: 12,
    note: 'Food arrived warm instead of hot. Wagyu steak needs reheating.',
    severity: 'critical',
    status: 'new',
    createdAt: Date.now() - 9 * 60000,
    staffId: 'emp-2',
    dispatch: null,
    resolvedAt: null,
    resolutionTime: null,
    resolutionNote: null,
    messages: []
  },
  {
    id: 'rep-103',
    table: 7,
    note: 'Need help splitting bill across three cards with corporate dining credit.',
    severity: 'moderate',
    status: 'in_progress',
    createdAt: Date.now() - 18 * 60000,
    staffId: 'emp-3',
    dispatch: { staffId: 'emp-3', note: 'Priya Sen dispatched with wireless handheld POS.' },
    resolvedAt: null,
    resolutionTime: null,
    resolutionNote: null,
    messages: [
      { id: 'm1', to: 'employee', text: 'Please go to Table 7 with the POS terminal.', sentAt: Date.now() - 15 * 60000, from: 'Admin' },
      { id: 'm2', to: 'customer', text: 'We are on our way to your table right now!', sentAt: Date.now() - 14 * 60000, from: 'Admin' }
    ]
  },
  {
    id: 'rep-104',
    table: 8,
    note: 'Anniversary celebration — requesting two complimentary champagne flutes.',
    severity: 'general',
    status: 'resolved',
    createdAt: Date.now() - 42 * 60000,
    staffId: 'emp-4',
    dispatch: { staffId: 'emp-4', note: 'Tanvir Rahman notified for anniversary hospitality package.' },
    resolvedAt: Date.now() - 28 * 60000,
    resolutionTime: '14 mins',
    resolutionNote: 'Delivered complimentary Prosecco flutes & macaron board.',
    messages: []
  }
];

export const DEFAULT_ASSISTANCE_CALLS = [
  {
    id: 'call-demo-1',
    tableNumber: 4,
    table_number: 4,
    table: 4,
    reason: 'Need Extra Napkins & Cutlery',
    custom_message: 'Please bring 2 extra forks and paper napkins.',
    status: 'pending',
    created_at: new Date(Date.now() - 75 * 1000).toISOString(),
    createdAt: Date.now() - 75 * 1000,
  },
  {
    id: 'call-demo-2',
    tableNumber: 2,
    table_number: 2,
    table: 2,
    reason: 'Bill & Payment Request',
    custom_message: 'Ready to settle the bill via Card / bKash.',
    status: 'pending',
    created_at: new Date(Date.now() - 215 * 1000).toISOString(),
    createdAt: Date.now() - 215 * 1000,
  },
  {
    id: 'call-demo-3',
    tableNumber: 7,
    table_number: 7,
    table: 7,
    reason: 'Refill Water & Ice',
    custom_message: 'Sparkling or normal chilled water.',
    status: 'pending',
    created_at: new Date(Date.now() - 130 * 1000).toISOString(),
    createdAt: Date.now() - 130 * 1000,
  },
  {
    id: 'call-demo-4',
    tableNumber: 9,
    table_number: 9,
    table: 9,
    reason: 'Food & Allergy Inquiry',
    custom_message: 'Guest wants to know if the truffle tagliatelle contains peanut traces.',
    status: 'pending',
    created_at: new Date(Date.now() - 40 * 1000).toISOString(),
    createdAt: Date.now() - 40 * 1000,
  }
];

export const DEFAULT_STAFF_MESSAGES = [
  {
    id: 'msg-demo-1',
    from: 'Admin',
    fromName: 'Head Desk / Admin',
    toWaiterId: 'emp-2',
    toWaiterName: 'Hasan Mahmud',
    text: 'Table 7 has been waiting on appetizers for 15 mins. Please check-in with the kitchen.',
    timestamp: Date.now() - 5 * 60 * 1000,
    status: 'pending',
    urgent: true,
    replies: []
  },
  {
    id: 'msg-demo-2',
    from: 'Admin',
    fromName: 'Head Desk / Admin',
    toWaiterId: 'emp-1',
    toWaiterName: 'Rakib Ahmed',
    text: 'Table 1 requested fresh cutlery & napkins. Please deliver promptly.',
    timestamp: Date.now() - 8 * 60 * 1000,
    status: 'pending',
    urgent: false,
    replies: []
  }
];

export function sanitizeEmployeeRecord(e, index = 0) {
  if (!e) return e;
  const numId = e.numericId || (index + 1);
  let emp = {
    ...e,
    accountCode: e.accountCode || `WAIT-10${numId}`,
    passcode: e.passcode || `100${numId}`,
    hiredAt: e.hiredAt || '2026-01-15'
  };
  if (emp.id === 'emp-042' || emp.numericId === 42 || emp.name === 'Alex M.' || String(emp.staffId || '').includes('042') || String(emp.accountCode || '').includes('042')) {
    const alexTemplate = DEFAULT_EMPLOYEE_ROSTER.find(e => e.id === 'emp-042') || {};
    emp = {
      ...alexTemplate,
      ...emp,
      id: 'emp-042',
      numericId: 42,
      name: 'Alex M.',
      staffId: emp.staffId || 'Staff #042',
      username: emp.username || 'Alex.M / 042',
      accountCode: emp.accountCode || 'WAIT-042',
      passcode: emp.passcode || '1001',
      password: emp.password || 'dinesync2026',
      pin: emp.pin || '1001',
      waiterPin: emp.waiterPin || '1001',
      initials: emp.initials || 'AM',
      role: emp.role || 'Floor Specialist',
      shift: emp.shift || 'Floor Duty (12:00 - 20:00)',
      shiftTime: emp.shiftTime || '12:00 - 20:00',
      status: emp.status || 'Active',
      assignedTables: [1, 3, 4],
      color: emp.color || 'from-amber-500 to-orange-600',
      avatarBg: emp.avatarBg || 'from-amber-500 to-orange-600',
      avatarColor: emp.avatarColor || '#f59e0b',
    };
  }
  if (emp.id === 'emp-5' || emp.numericId === 5 || emp.name === 'Saima Islam') {
    emp = {
      ...emp,
      name: 'Sadia Islam',
      email: emp.email ? emp.email.replace('saima', 'sadia') : 'sadia.islam@restaurant.local'
    };
  }
  return emp;
}

/**
 * Helper to match an employee record against user identifiers
 * Supports: username ('Alex.M / 042', 'alex'), accountCode ('WAIT-042', '042', '42'),
 * staffId ('Staff #042'), id ('emp-042'), firstName ('Alex'), name ('Alex M.')
 */
export function matchesEmployeeIdentifier(emp, rawInput) {
  if (!emp || rawInput == null) return false;
  const input = String(rawInput).trim();
  const inputLower = input.toLowerCase();
  const inputCompact = inputLower.replace(/[^a-z0-9]/g, '');

  // 1. Exact string matches (case-insensitive)
  if (emp.username && String(emp.username).toLowerCase() === inputLower) return true;
  if (emp.id && String(emp.id).toLowerCase() === inputLower) return true;
  if (emp.accountCode && String(emp.accountCode).toLowerCase() === inputLower) return true;
  if (emp.staffId && String(emp.staffId).toLowerCase() === inputLower) return true;
  if (emp.name && String(emp.name).toLowerCase() === inputLower) return true;
  if (emp.email && String(emp.email).toLowerCase() === inputLower) return true;

  // 2. Numeric / ID matches (e.g. "042", "42", 42)
  const inputNum = parseInt(input, 10);
  if (!isNaN(inputNum)) {
    if (emp.numericId != null && Number(emp.numericId) === inputNum) return true;
    if (!isNaN(Number(emp.id)) && Number(emp.id) === inputNum) return true;
  }
  if (emp.numericId != null) {
    const numPad = String(emp.numericId).padStart(3, '0');
    const numRaw = String(emp.numericId);
    if (input === numPad || input === numRaw) return true;
  }

  // 3. Compact normalized match (removes spaces, slashes, dashes, dots, hash)
  if (inputCompact) {
    const usernameCompact = String(emp.username || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (usernameCompact && (usernameCompact === inputCompact || (inputCompact.length >= 3 && usernameCompact.includes(inputCompact)))) {
      return true;
    }
    const staffIdCompact = String(emp.staffId || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (staffIdCompact && (staffIdCompact === inputCompact || staffIdCompact.includes(inputCompact))) {
      return true;
    }
    const codeCompact = String(emp.accountCode || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (codeCompact && codeCompact === inputCompact) {
      return true;
    }
    const idCompact = String(emp.id || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (idCompact && idCompact === inputCompact) {
      return true;
    }
  }

  // 4. Prefix-agnostic numeric match (e.g. "WAIT-101" vs "101", "WAIT-042" vs "042" or "42")
  const codeNumeric = String(emp.accountCode || '').replace(/^[a-z]+-?/i, '');
  const idNumeric = String(emp.id || '').replace(/^[a-z]+-?/i, '');
  const inputDigits = input.replace(/^[a-z]+-?/i, '');
  if (inputDigits && (codeNumeric === inputDigits || idNumeric === inputDigits)) return true;
  if (inputDigits && (parseInt(codeNumeric, 10) === parseInt(inputDigits, 10) || parseInt(idNumeric, 10) === parseInt(inputDigits, 10))) return true;

  // 5. First name match (e.g. "alex" matching "Alex M.", "rakib" matching "Rakib Ahmed")
  const nameParts = String(emp.name || '').toLowerCase().split(/\s+/);
  if (nameParts.length > 0 && nameParts[0] === inputLower) return true;

  // 6. Username component match (e.g. "alex" matching "Alex.M / 042")
  if (emp.username) {
    const userParts = String(emp.username).toLowerCase().split(/[\s./]+/);
    if (userParts.some(part => part && part === inputLower)) return true;
  }

  return false;
}

/**
 * Helper to match an employee's passcode / password / pin
 */
export function matchesEmployeePasscode(emp, rawPass) {
  if (!emp || rawPass == null) return false;
  const cleanPass = String(rawPass).trim();
  if (!cleanPass) return false;

  // Hashed (admin-reset) accounts verify against the salted digest; legacy plain accounts fall back.
  return verifyStaffSecret(emp, cleanPass);
}

/**
 * Lookup assigned employee for a given table number
 * Guaranteeing Alex M. is returned for tables 1, 3, 4
 */
export function getAssignedEmployeeForTableHelper(tableNumber, employees = DEFAULT_EMPLOYEE_ROSTER, tables = []) {
  const tblNum = Number(tableNumber);
  if (!tblNum || isNaN(tblNum)) return null;

  // 1. Direct table assignment record check
  if (Array.isArray(tables) && tables.length > 0) {
    const table = tables.find(t => Number(t.tableNumber || t.id) === tblNum);
    if (table && table.assignedEmployeeId != null) {
      const emp = employees.find(e =>
        String(e.id) === String(table.assignedEmployeeId) ||
        String(e.numericId) === String(table.assignedEmployeeId) ||
        (e.staffId && String(e.staffId) === String(table.assignedEmployeeId))
      );
      if (emp) return emp;
    }
  }

  // 2. Check employee assignedTables array
  const empByTables = employees.find(e => {
    const list = e.assignedTables || e.assignedTableIds || e.tables;
    return Array.isArray(list) && list.map(Number).includes(tblNum);
  });
  if (empByTables) return empByTables;

  // 3. Fallback: check DEFAULT_EMPLOYEE_ROSTER
  const defaultEmp = DEFAULT_EMPLOYEE_ROSTER.find(e => {
    const list = e.assignedTables || e.assignedTableIds || e.tables;
    return Array.isArray(list) && list.map(Number).includes(tblNum);
  });
  if (defaultEmp) return defaultEmp;

  return null;
}

export { getAssignedEmployeeForTableHelper as getAssignedEmployeeForTable };

/**
 * Standalone credentials verification & waiter session store
 * Returns { success: true, employee } and persists to localStorage.smartdine_waiter_session
 */
export function verifyWaiterCredentials(identifier, passcode, employeeList = DEFAULT_EMPLOYEE_ROSTER) {
  if (!identifier || passcode == null) {
    return { success: false, error: 'Invalid ID or PIN' };
  }

  const cleanPass = String(passcode).trim();
  if (!cleanPass) {
    return { success: false, error: 'Invalid ID or PIN' };
  }

  const employees = Array.isArray(employeeList) && employeeList.length > 0 ? employeeList : DEFAULT_EMPLOYEE_ROSTER;

  const employee = employees.find(emp => matchesEmployeeIdentifier(emp, identifier));
  if (!employee) {
    return { success: false, error: 'Invalid ID or PIN' };
  }

  if (!matchesEmployeePasscode(employee, cleanPass)) {
    return { success: false, error: 'Invalid ID or PIN' };
  }

  if (typeof localStorage !== 'undefined') {
    try {
      const sessionPayload = {
        ...employee,
        employeeId: employee.id,
        tables: (employee.assignedTables || employee.assignedTableIds || employee.tables || []).map(Number),
        assignedTables: (employee.assignedTables || employee.assignedTableIds || employee.tables || []).map(Number),
        waiterCode: employee.accountCode || employee.waiterCode,
        pin: employee.passcode || employee.pin || '1001',
        waiterPin: employee.passcode || employee.pin || '1001',
        loginTime: Date.now()
      };
      localStorage.setItem('smartdine_waiter_session', JSON.stringify(sessionPayload));
      localStorage.setItem('smartdine_current_waiter', JSON.stringify(sessionPayload));
      localStorage.setItem('smartdine_logged_in_waiter', JSON.stringify(sessionPayload));
      localStorage.setItem('smartdine_active_employee_id', String(employee.id));
    } catch (_) {}
  }

  return {
    success: true,
    employee
  };
}

export function authenticateWaiter(identifier, passcode, employeeList = DEFAULT_EMPLOYEE_ROSTER) {
  return verifyWaiterCredentials(identifier, passcode, employeeList);
}

export function createTableRecord(tableNumber, assignedEmployeeId = null) {
  const locations = [TABLE_LOCATION.MAIN_HALL, TABLE_LOCATION.WINDOW, TABLE_LOCATION.PATIO];
  const capacities = [2, 4, 4, 6, 8];
  const idx = tableNumber - 1;
  return {
    id: tableNumber,
    tableNumber,
    name: `Table ${tableNumber}`,
    status: TABLE_STATUS.AVAILABLE,
    assignedEmployeeId: assignedEmployeeId,
    currentOrderId: null,
    capacity: capacities[idx % capacities.length],
    seats: capacities[idx % capacities.length],
    location: locations[idx % locations.length],
    zone: locations[idx % locations.length],
    activeCall: false
  };
}

export function RestaurantProvider({ children }) {
  const socketContext = useSocket ? useSocket() : null;

  // 1. Total Table Count (Always dynamically aligned with floor tables)
  const [tableCount, setTableCountState] = useState(() => {
    if (typeof localStorage !== 'undefined') {
      try {
        const savedTables = localStorage.getItem(STORAGE_KEYS.TABLES);
        if (savedTables) {
          const parsed = JSON.parse(savedTables);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const maxNum = parsed.reduce((max, t) => Math.max(max, t.tableNumber || 0), 0);
            return Math.max(maxNum, parsed.length);
          }
        }
        const saved = localStorage.getItem(STORAGE_KEYS.TABLE_COUNT);
        if (saved) {
          const num = parseInt(saved, 10);
          if (!isNaN(num) && num >= 1 && num <= 60) return num;
        }
      } catch (_) {}
    }
    return 12;
  });

  // 2. Employees Array (Central Roster)
  const [employees, setEmployeesState] = useState(() => {
    if (typeof localStorage !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEYS.EMPLOYEES);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.map((e, index) => sanitizeEmployeeRecord(e, index));
          }
        }
      } catch (_) {}
    }
    return DEFAULT_EMPLOYEE_ROSTER;
  });

  // 3. Tables Array (Central Floor Grid)
  const [tables, setTablesState] = useState(() => {
    if (typeof localStorage !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEYS.TABLES);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      } catch (_) {}
    }
    // Initialize standard floor based on default roster
    const initialTables = [];
    for (let i = 1; i <= 12; i++) {
      // Find assigned employee
      const assigned = DEFAULT_EMPLOYEE_ROSTER.find(e => e.assignedTables?.includes(i));
      const record = createTableRecord(i, assigned ? assigned.id : null);
      if (i === 1 || i === 5) record.status = TABLE_STATUS.ORDER_RUNNING;
      if (i === 2) record.status = TABLE_STATUS.READY_IN_KITCHEN;
      if (i === 4) record.status = TABLE_STATUS.NEED_ASSISTANCE;
      initialTables.push(record);
    }
    return initialTables;
  });

  // 4. Live Assistance Calls
  const [assistanceCalls, setAssistanceCalls] = useState(() => {
    if (typeof localStorage !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEYS.CALLS);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (_) {}
    }
    return DEFAULT_ASSISTANCE_CALLS;
  });

  // 5. Customer Reports & Notes
  const [customerReports, setCustomerReportsState] = useState(() => {
    if (typeof localStorage !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEYS.REPORTS);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.map(r => ({ messages: [], ...r }));
          }
        }
        // Fallback migration from older v3 key if v4 is not yet populated
        const legacyV3 = localStorage.getItem('smartdine_customer_reports_v3');
        if (legacyV3) {
          const parsedV3 = JSON.parse(legacyV3);
          if (Array.isArray(parsedV3) && parsedV3.length > 0) {
            return parsedV3.map(r => {
              let staffId = r.staffId || 'emp-1';
              if (staffId === 'emp-6') staffId = 'emp-5';
              return { messages: [], ...r, staffId };
            });
          }
        }
      } catch (_) {}
    }
    return DEFAULT_CUSTOMER_REPORTS;
  });

  // 6. Direct Staff Messages / Dispatches (Admin <-> Waiter Texting)
  const [staffMessages, setStaffMessagesState] = useState(() => {
    if (typeof localStorage !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEYS.MESSAGES);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (_) {}
    }
    return DEFAULT_STAFF_MESSAGES;
  });

  // 7. Employee Activity & Live Audit History
  const [activityLogs, setActivityLogsState] = useState(() => {
    if (typeof localStorage !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEYS.ACTIVITY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (_) {}
    }
    return DEFAULT_ACTIVITY_LOGS;
  });

  // Broadcast Channel for ultra-fast same-origin cross-tab synchronization
  const broadcastChannel = useMemo(() => {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      return new BroadcastChannel('smartdine_restaurant_state');
    }
    return null;
  }, []);

  // Sync to localStorage
  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.TABLE_COUNT, String(tableCount));
    }
  }, [tableCount]);

  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      const sanitized = employees.map((e, index) => sanitizeEmployeeRecord(e, index));
      localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(sanitized));
      // Backwards-compatibility for older WaiterPanel localStorage key
      const legacyRoster = sanitized.map(e => ({
        id: e.id,
        numericId: e.numericId,
        name: e.name,
        initials: e.initials,
        role: e.role,
        tables: e.assignedTables,
        color: e.color || 'from-orange-500 to-amber-600',
        zone: e.zone,
        accountCode: e.accountCode,
        passcode: e.passcode,
        hiredAt: e.hiredAt,
        status: e.status
      }));
      localStorage.setItem('smartdine_floor_staff_roster', JSON.stringify(legacyRoster));
    }
  }, [employees]);

  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.TABLES, JSON.stringify(tables));
    }
    // Automatically ensure tableCount stays locked to actual floor tables count / max number
    if (Array.isArray(tables) && tables.length > 0) {
      const maxNum = tables.reduce((max, t) => Math.max(max, t.tableNumber || 0), 0);
      const effectiveCount = Math.max(maxNum, tables.length);
      setTableCountState(prev => {
        if (prev !== effectiveCount) {
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem(STORAGE_KEYS.TABLE_COUNT, String(effectiveCount));
          }
          return effectiveCount;
        }
        return prev;
      });
    }
  }, [tables]);

  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.CALLS, JSON.stringify(assistanceCalls));
    }
  }, [assistanceCalls]);

  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(customerReports));
    }
  }, [customerReports]);

  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(staffMessages));
    }
  }, [staffMessages]);

  // Broadcast state changes across tabs
  const broadcastState = useCallback((type, data) => {
    if (broadcastChannel) {
      try {
        broadcastChannel.postMessage({ type, data, timestamp: Date.now() });
      } catch (_) {}
    }
  }, [broadcastChannel]);

  // Listen to cross-tab BroadcastChannel
  useEffect(() => {
    if (!broadcastChannel) return;
    const handleMessage = (e) => {
      const msg = e.data;
      if (!msg || !msg.type) return;
      if (msg.type === 'SYNC_ALL' && msg.data) {
        if (msg.data.tableCount) setTableCountState(msg.data.tableCount);
        if (msg.data.employees && Array.isArray(msg.data.employees)) {
          setEmployeesState(msg.data.employees.map((e, index) => sanitizeEmployeeRecord(e, index)));
        }
        if (msg.data.tables) setTablesState(msg.data.tables);
        if (msg.data.calls) setAssistanceCalls(msg.data.calls);
        if (msg.data.reports) setCustomerReportsState(msg.data.reports);
      } else if (msg.type === 'TABLE_COUNT_UPDATED') {
        setTableCountState(msg.data);
      } else if (msg.type === 'TABLES_UPDATED') {
        setTablesState(msg.data);
      } else if (msg.type === 'EMPLOYEES_UPDATED') {
        if (Array.isArray(msg.data)) {
          setEmployeesState(msg.data.map((e, index) => sanitizeEmployeeRecord(e, index)));
        } else {
          setEmployeesState(msg.data);
        }
      } else if (msg.type === 'CALLS_UPDATED') {
        setAssistanceCalls(msg.data);
      } else if (msg.type === 'REPORTS_UPDATED') {
        setCustomerReportsState(msg.data);
      } else if (msg.type === 'MESSAGES_UPDATED' && Array.isArray(msg.data)) {
        setStaffMessagesState(msg.data);
      } else if (msg.type === 'ACTIVITY_LOG_UPDATED' && Array.isArray(msg.data)) {
        setActivityLogsState(msg.data);
      } else if (msg.type === 'ORDER_CORRECTIONS_UPDATED' && msg.data) {
        setOrderCorrectionsState(msg.data);
      }
    };
    broadcastChannel.addEventListener('message', handleMessage);
    return () => broadcastChannel.removeEventListener('message', handleMessage);
  }, [broadcastChannel]);

  // Listen to window storage events (fallback for browsers without BroadcastChannel)
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === STORAGE_KEYS.TABLE_COUNT && e.newValue) {
        const val = parseInt(e.newValue, 10);
        if (!isNaN(val)) setTableCountState(val);
      }
      if (e.key === STORAGE_KEYS.TABLES && e.newValue) {
        try { setTablesState(JSON.parse(e.newValue)); } catch (_) {}
      }
      if (e.key === STORAGE_KEYS.EMPLOYEES && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            setEmployeesState(parsed.map((emp, index) => sanitizeEmployeeRecord(emp, index)));
          }
        } catch (_) {}
      }
      if (e.key === STORAGE_KEYS.CALLS && e.newValue) {
        try { setAssistanceCalls(JSON.parse(e.newValue)); } catch (_) {}
      }
      if (e.key === STORAGE_KEYS.REPORTS && e.newValue) {
        try { setCustomerReportsState(JSON.parse(e.newValue)); } catch (_) {}
      }
      if (e.key === STORAGE_KEYS.MESSAGES && e.newValue) {
        try { setStaffMessagesState(JSON.parse(e.newValue)); } catch (_) {}
      }
      if (e.key === STORAGE_KEYS.ACTIVITY && e.newValue) {
        try { setActivityLogsState(JSON.parse(e.newValue)); } catch (_) {}
      }
      if (e.key === STORAGE_KEYS.ORDER_CORRECTIONS && e.newValue) {
        try { setOrderCorrectionsState(JSON.parse(e.newValue)); } catch (_) {}
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // ---------------------------------------------------------------------------
  // HELPER LOOKUPS
  // ---------------------------------------------------------------------------
  const getAssignedEmployeeForTable = useCallback((tableNumber) => {
    return getAssignedEmployeeForTableHelper(tableNumber, employees, tables);
  }, [tables, employees]);

  const getWaiterByTable = useCallback((tableNumber) => {
    return getAssignedEmployeeForTable(tableNumber);
  }, [getAssignedEmployeeForTable]);

  // ---------------------------------------------------------------------------
  // DYNAMIC TABLE COUNT CONTROLS (Rule 1)
  // ---------------------------------------------------------------------------
  const setTableCount = useCallback((newCount) => {
    const target = Math.max(1, Math.min(60, parseInt(newCount, 10) || 1));
    setTableCountState(target);

    setTablesState(prevTables => {
      let nextTables;
      if (target === prevTables.length) {
        nextTables = prevTables;
      } else if (target > prevTables.length) {
        const added = [];
        for (let i = prevTables.length + 1; i <= target; i++) {
          added.push(createTableRecord(i, null));
        }
        nextTables = [...prevTables, ...added];
      } else {
        nextTables = prevTables.slice(0, target);
      }

      broadcastState('TABLES_UPDATED', nextTables);
      return nextTables;
    });

    // Also sanitize assignedTables on employees so they don't hold table numbers > target
    setEmployeesState(prevEmps => {
      const nextEmps = prevEmps.map(emp => ({
        ...emp,
        assignedTables: (emp.assignedTables || []).filter(t => t <= target)
      }));
      broadcastState('EMPLOYEES_UPDATED', nextEmps);
      return nextEmps;
    });

    broadcastState('TABLE_COUNT_UPDATED', target);
  }, [broadcastState]);

  // 1-Click / Custom Add New Table
  const addTable = useCallback((tableConfig = {}) => {
    let created = null;
    setTableCountState(prevCount => {
      const nextNum = Math.min(60, prevCount + 1);
      if (nextNum === prevCount) return prevCount;

      const locations = [TABLE_LOCATION.MAIN_HALL, TABLE_LOCATION.WINDOW, TABLE_LOCATION.PATIO];
      created = {
        ...createTableRecord(nextNum, tableConfig.assignedEmployeeId || null),
        capacity: Number(tableConfig.seats || tableConfig.capacity) || 4,
        seats: Number(tableConfig.seats || tableConfig.capacity) || 4,
        zone: tableConfig.zone || tableConfig.location || locations[(nextNum - 1) % locations.length],
        location: tableConfig.zone || tableConfig.location || locations[(nextNum - 1) % locations.length],
        assignedEmployeeId: tableConfig.assignedEmployeeId || null
      };

      setTablesState(prevTables => {
        const nextTables = [...prevTables, created];
        broadcastState('TABLES_UPDATED', nextTables);
        return nextTables;
      });

      broadcastState('TABLE_COUNT_UPDATED', nextNum);
      return nextNum;
    });

    return created;
  }, [broadcastState]);

  // 1-Click / Target Remove Table
  const removeTable = useCallback((tableNumberToRemove = null) => {
    let success = false;
    setTableCountState(prevCount => {
      if (prevCount <= 1) return prevCount;
      const nextCount = prevCount - 1;
      const targetNum = tableNumberToRemove ? Number(tableNumberToRemove) : prevCount;

      setTablesState(prevTables => {
        const filtered = prevTables.filter(t => t.tableNumber !== targetNum);
        // Re-index remaining tables from 1 to nextCount
        const reindexed = filtered.map((t, idx) => ({
          ...t,
          id: idx + 1,
          tableNumber: idx + 1,
          name: `Table ${idx + 1}`
        }));
        broadcastState('TABLES_UPDATED', reindexed);
        return reindexed;
      });

      setEmployeesState(prevEmps => {
        const nextEmps = prevEmps.map(emp => ({
          ...emp,
          assignedTables: (emp.assignedTables || []).filter(t => t !== targetNum && t <= nextCount)
        }));
        broadcastState('EMPLOYEES_UPDATED', nextEmps);
        return nextEmps;
      });

      broadcastState('TABLE_COUNT_UPDATED', nextCount);
      success = true;
      return nextCount;
    });

    return success;
  }, [broadcastState]);

  // ---------------------------------------------------------------------------
  // DIRECT EMPLOYEE ASSIGNMENT TO TABLE (Rule 2)
  // ---------------------------------------------------------------------------
  const assignTableToEmployee = useCallback((tableNumber, employeeId) => {
    const tblNum = Number(tableNumber);
    const targetEmpId = employeeId ? String(employeeId) : null;

    // 1. Update tables
    setTablesState(prevTables => {
      const nextTables = prevTables.map(t => {
        if (t.tableNumber === tblNum) {
          return { ...t, assignedEmployeeId: targetEmpId };
        }
        return t;
      });
      broadcastState('TABLES_UPDATED', nextTables);
      return nextTables;
    });

    // 2. Update employees: remove table from other employees, add to target employee
    setEmployeesState(prevEmps => {
      const nextEmps = prevEmps.map(emp => {
        const currentTables = emp.assignedTables || [];
        const isTarget = targetEmpId && (emp.id === targetEmpId || String(emp.numericId) === String(targetEmpId));

        if (isTarget) {
          const updated = Array.from(new Set([...currentTables, tblNum])).sort((a, b) => a - b);
          return { ...emp, assignedTables: updated };
        } else {
          const updated = currentTables.filter(t => t !== tblNum);
          return { ...emp, assignedTables: updated };
        }
      });
      broadcastState('EMPLOYEES_UPDATED', nextEmps);
      return nextEmps;
    });

    // Emit Socket.IO event if available
    if (socketContext?.emit) {
      socketContext.emit('waiter:assigned', { table: tblNum, employeeId: targetEmpId });
    }
  }, [broadcastState, socketContext]);

  // ---------------------------------------------------------------------------
  // 1-CLICK BULK TRANSFER / LINK TABLES FOR ABSENT EMPLOYEE (Rule 4)
  // ---------------------------------------------------------------------------
  const reassignAllTables = useCallback((sourceEmployeeId, targetBackupEmployeeId, markAbsent = true) => {
    const srcId = String(sourceEmployeeId);
    const backupId = String(targetBackupEmployeeId);

    const sourceEmp = employees.find(e => e.id === srcId || String(e.numericId) === srcId);
    const backupEmp = employees.find(e => e.id === backupId || String(e.numericId) === backupId);

    if (!sourceEmp || !backupEmp) return { success: false, count: 0 };

    const tablesToTransfer = [...(sourceEmp.assignedTables || [])];

    // 1. Re-link tables state
    setTablesState(prevTables => {
      const nextTables = prevTables.map(t => {
        if (tablesToTransfer.includes(t.tableNumber)) {
          return { ...t, assignedEmployeeId: backupEmp.id };
        }
        return t;
      });
      broadcastState('TABLES_UPDATED', nextTables);
      return nextTables;
    });

    // 2. Update employee records
    setEmployeesState(prevEmps => {
      const nextEmps = prevEmps.map(emp => {
        if (emp.id === sourceEmp.id) {
          return {
            ...emp,
            status: markAbsent ? 'Absent / Off-duty' : emp.status,
            assignedTables: []
          };
        }
        if (emp.id === backupEmp.id) {
          const combined = Array.from(new Set([...(emp.assignedTables || []), ...tablesToTransfer])).sort((a, b) => a - b);
          return {
            ...emp,
            assignedTables: combined
          };
        }
        return emp;
      });
      broadcastState('EMPLOYEES_UPDATED', nextEmps);
      return nextEmps;
    });

    // 3. Reroute active assistance calls for those tables
    setAssistanceCalls(prevCalls => {
      const nextCalls = prevCalls.map(c => {
        if (tablesToTransfer.includes(Number(c.tableNumber || c.table_number || c.table))) {
          return {
            ...c,
            assignedEmployeeId: backupEmp.id,
            assignedEmployeeName: backupEmp.name,
            assignedEmployeeRole: backupEmp.role,
            routedNote: `Re-routed to backup employee: ${backupEmp.name}`
          };
        }
        return c;
      });
      broadcastState('CALLS_UPDATED', nextCalls);
      return nextCalls;
    });

    return {
      success: true,
      transferredTables: tablesToTransfer,
      count: tablesToTransfer.length,
      sourceName: sourceEmp.name,
      backupName: backupEmp.name
    };
  }, [employees, broadcastState]);

  // ---------------------------------------------------------------------------
  // UPDATE EMPLOYEE STATUS
  // ---------------------------------------------------------------------------
  const setEmployeeStatus = useCallback((employeeId, newStatus) => {
    const idStr = String(employeeId);
    setEmployeesState(prevEmps => {
      const nextEmps = prevEmps.map(emp => {
        if (emp.id === idStr || String(emp.numericId) === idStr) {
          return { ...emp, status: newStatus };
        }
        return emp;
      });
      broadcastState('EMPLOYEES_UPDATED', nextEmps);
      return nextEmps;
    });
  }, [broadcastState]);

  // ---------------------------------------------------------------------------
  // AUTO-BALANCE TABLES EVENLY ACROSS ACTIVE EMPLOYEES
  // ---------------------------------------------------------------------------
  const autoBalanceTables = useCallback(() => {
    const activeStaff = employees.filter(e => e.status === 'Active' || e.status === 'Busy');
    if (activeStaff.length === 0) return;

    const allNums = Array.from({ length: tableCount }, (_, i) => i + 1);
    const newAssignments = {};
    activeStaff.forEach(s => { newAssignments[s.id] = []; });

    allNums.forEach((tbl, idx) => {
      const targetStaff = activeStaff[idx % activeStaff.length];
      newAssignments[targetStaff.id].push(tbl);
    });

    // Update employees
    setEmployeesState(prevEmps => {
      const nextEmps = prevEmps.map(emp => ({
        ...emp,
        assignedTables: newAssignments[emp.id] || []
      }));
      broadcastState('EMPLOYEES_UPDATED', nextEmps);
      return nextEmps;
    });

    // Update tables
    setTablesState(prevTables => {
      const nextTables = prevTables.map(t => {
        let assignedId = null;
        for (const [empId, tblList] of Object.entries(newAssignments)) {
          if (tblList.includes(t.tableNumber)) {
            assignedId = empId;
            break;
          }
        }
        return { ...t, assignedEmployeeId: assignedId };
      });
      broadcastState('TABLES_UPDATED', nextTables);
      return nextTables;
    });
  }, [employees, tableCount, broadcastState]);

  // ---------------------------------------------------------------------------
  // WAITER CREDENTIALS, AUTHENTICATION & HIRING
  // ---------------------------------------------------------------------------
  const authenticateWaiter = useCallback((identifier, passcode) => {
    return verifyWaiterCredentials(identifier, passcode, employees);
  }, [employees]);

  const updateEmployeeCredentials = useCallback((employeeId, credentials = {}) => {
    const idStr = String(employeeId);
    let updatedEmployee = null;

    setEmployeesState(prevEmps => {
      const nextEmps = prevEmps.map(emp => {
        if (emp.id === idStr || String(emp.numericId) === idStr || emp.accountCode === idStr) {
          const merged = {
            ...emp,
            ...(credentials.accountCode ? { accountCode: String(credentials.accountCode).trim().toUpperCase() } : {}),
            ...(credentials.passwordHash && credentials.passwordSalt
              ? { passwordHash: credentials.passwordHash, passwordSalt: credentials.passwordSalt, passwordUpdatedAt: credentials.passwordUpdatedAt }
              : {}),
            ...(credentials.hiredAt ? { hiredAt: String(credentials.hiredAt).trim() } : {})
          };
          // Hashed credential: drop any legacy plain-text secret from the record
          const updated = credentials.passwordHash ? stripPlainCredentials(merged) : merged;
          updatedEmployee = updated;
          return updated;
        }
        return emp;
      });

      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(nextEmps));
        } catch (_) {}
      }

      broadcastState('EMPLOYEES_UPDATED', nextEmps);
      return nextEmps;
    });

    return {
      success: !!updatedEmployee,
      employee: updatedEmployee
    };
  }, [broadcastState]);

  const hireEmployee = useCallback((employeeData = {}) => {
    let created = null;

    setEmployeesState(prevEmps => {
      const maxNumericId = prevEmps.reduce((max, e) => Math.max(max, Number(e.numericId) || 0), 0);
      const nextNumId = maxNumericId + 1;
      const nextId = `emp-${nextNumId}`;
      const name = employeeData.name?.trim() || `Waiter ${nextNumId}`;
      const initials = employeeData.initials || name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'W';
      const role = employeeData.role || 'Floor Specialist';
      const shift = employeeData.shift || 'Morning Shift (08:00 - 16:00)';
      const status = employeeData.status || 'Active';
      const assignedTables = Array.isArray(employeeData.assignedTables) ? employeeData.assignedTables : [];
      const accountCode = employeeData.accountCode ? String(employeeData.accountCode).trim().toUpperCase() : `WAIT-10${nextNumId}`;
      const hasHash = !!(employeeData.passwordHash && employeeData.passwordSalt);
      const passcode = hasHash ? undefined : (employeeData.passcode ? String(employeeData.passcode).trim() : `100${nextNumId}`);
      const hiredAt = employeeData.hiredAt || new Date().toISOString().split('T')[0];

      const palette = [
        { color: 'from-orange-500 to-amber-600', avatarColor: '#f59e0b' },
        { color: 'from-blue-500 to-indigo-600', avatarColor: '#3b82f6' },
        { color: 'from-purple-500 to-violet-600', avatarColor: '#8b5cf6' },
        { color: 'from-amber-500 to-yellow-600', avatarColor: '#eab308' },
        { color: 'from-pink-500 to-rose-600', avatarColor: '#ec4899' },
        { color: 'from-emerald-500 to-teal-600', avatarColor: '#10b981' },
        { color: 'from-cyan-500 to-blue-600', avatarColor: '#06b6d4' }
      ];
      const theme = palette[(nextNumId - 1) % palette.length];

      created = {
        id: nextId,
        numericId: nextNumId,
        name,
        initials,
        role,
        shift,
        status,
        assignedTables,
        color: employeeData.color || theme.color,
        avatarColor: employeeData.avatarColor || theme.avatarColor,
        avatarBg: employeeData.avatarBg || theme.color,
        zone: employeeData.zone || `Zone ${((nextNumId - 1) % 5) + 1}`,
        phone: employeeData.phone || `+880 1700-${String(100000 + nextNumId).slice(1)}`,
        email: employeeData.email || `${name.toLowerCase().replace(/\s+/g, '.') || 'waiter'}@restaurant.local`,
        accountCode,
        passcode,
        passwordHash: hasHash ? employeeData.passwordHash : undefined,
        passwordSalt: hasHash ? employeeData.passwordSalt : undefined,
        passwordUpdatedAt: hasHash ? (employeeData.passwordUpdatedAt || new Date().toISOString()) : undefined,
        hiredAt,
        avgResponseTime: '12s',
        onTimeRate: '99%'
      };

      const nextEmps = [...prevEmps, created];
      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(nextEmps));
        } catch (_) {}
      }
      broadcastState('EMPLOYEES_UPDATED', nextEmps);
      return nextEmps;
    });

    return created;
  }, [broadcastState]);

  const removeEmployee = useCallback((employeeId) => {
    const idStr = String(employeeId);
    let removed = false;

    setEmployeesState(prevEmps => {
      const target = prevEmps.find(e => e.id === idStr || String(e.numericId) === idStr);
      if (!target) return prevEmps;

      const nextEmps = prevEmps.filter(e => e.id !== target.id);
      removed = true;

      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(nextEmps));
        } catch (_) {}
      }
      broadcastState('EMPLOYEES_UPDATED', nextEmps);
      return nextEmps;
    });

    return removed;
  }, [broadcastState]);

  const setEmployees = useCallback((updater) => {
    setEmployeesState(prev => {
      const nextRaw = typeof updater === 'function' ? updater(prev) : updater;
      if (!Array.isArray(nextRaw)) return prev;
      const sanitized = nextRaw.map((e, index) => sanitizeEmployeeRecord(e, index));
      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(sanitized));
        } catch (_) {}
      }
      broadcastState('EMPLOYEES_UPDATED', sanitized);
      return sanitized;
    });
  }, [broadcastState]);

  // ---------------------------------------------------------------------------
  // ASSISTANCE CALLS & ROUTING (Rule 3)
  // ---------------------------------------------------------------------------
  const registerAssistanceCall = useCallback((callData) => {
    const tableNum = Number(callData.tableNumber || callData.table_number || callData.table);
    const assignedEmp = getAssignedEmployeeForTable(tableNum);

    const enrichedCall = {
      id: callData.id || `call-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      tableNumber: tableNum,
      table_number: tableNum,
      table: tableNum,
      reason: callData.reason || 'Assistance Requested',
      type: callData.type || 'assistance',
      customMessage: callData.customMessage || callData.custom_message || callData.message || '',
      custom_message: callData.custom_message || callData.customMessage || callData.message || '',
      message: callData.message || callData.custom_message || callData.customMessage || '',
      timestamp: callData.timestamp || Date.now(),
      status: 'pending',
      created_at: callData.created_at || new Date(callData.timestamp || Date.now()).toISOString(),
      createdAt: callData.createdAt || callData.timestamp || Date.now(),
      assignedEmployeeId: assignedEmp ? assignedEmp.id : null,
      assignedEmployeeName: assignedEmp ? assignedEmp.name : 'Unassigned (General Pool)',
      assignedEmployeeRole: assignedEmp ? assignedEmp.role : 'Floor Specialist',
      routingDetail: `Table #${tableNum} requested assistance -> Routed to assigned employee: ${assignedEmp ? assignedEmp.name : 'Unassigned'}`
    };

    setAssistanceCalls(prevCalls => {
      const existing = prevCalls.filter(c => Number(c.tableNumber || c.table_number || c.table) !== tableNum);
      const next = [enrichedCall, ...existing];
      broadcastState('CALLS_UPDATED', next);
      return next;
    });

    // Update table status to NEED_ASSISTANCE
    setTablesState(prevTables => {
      const nextTables = prevTables.map(t => {
        if (t.tableNumber === tableNum) {
          return { ...t, status: TABLE_STATUS.NEED_ASSISTANCE, activeCall: true };
        }
        return t;
      });
      broadcastState('TABLES_UPDATED', nextTables);
      return nextTables;
    });

    return enrichedCall;
  }, [getAssignedEmployeeForTable, broadcastState]);

  const resolveAssistanceCall = useCallback((tableNumberOrCallId) => {
    let resolvedTableNum = null;

    setAssistanceCalls(prevCalls => {
      const target = prevCalls.find(
        c =>
          String(c.id) === String(tableNumberOrCallId) ||
          Number(c.tableNumber || c.table_number || c.table) === Number(tableNumberOrCallId)
      );
      if (target) {
        resolvedTableNum = Number(target.tableNumber || target.table_number || target.table);
        recordActivity({
          actorType: 'employee',
          actorId: 'waiter',
          actorName: 'Floor Waiter',
          actorRole: 'Floor Staff',
          actorStaffId: 'FLOOR',
          actionType: 'RESOLVE_CALL',
          description: `Assistance call at Table ${resolvedTableNum} was resolved`,
          target: `Table ${resolvedTableNum}`,
          details: target.reason || target.message || 'Call marked as resolved'
        });
      }
      const next = prevCalls.filter(
        c =>
          String(c.id) !== String(tableNumberOrCallId) &&
          Number(c.tableNumber || c.table_number || c.table) !== Number(tableNumberOrCallId)
      );
      broadcastState('CALLS_UPDATED', next);
      return next;
    });

    if (resolvedTableNum) {
      setTablesState(prevTables => {
        const nextTables = prevTables.map(t => {
          if (t.tableNumber === resolvedTableNum) {
            const nextStatus = t.currentOrderId ? TABLE_STATUS.ORDER_RUNNING : TABLE_STATUS.AVAILABLE;
            return { ...t, status: nextStatus, activeCall: false };
          }
          return t;
        });
        broadcastState('TABLES_UPDATED', nextTables);
        return nextTables;
      });
    }
  }, [broadcastState]);

  // Listen to incoming Socket.IO events for live calls
  useEffect(() => {
    if (!socketContext?.socket) return;
    const socket = socketContext.socket;

    const handleSocketCall = (data) => {
      if (data) registerAssistanceCall(data);
    };

    const handleSocketResolve = (data) => {
      const id = data?.id || data?.table_number || data?.tableNumber || data?.table;
      if (id) resolveAssistanceCall(id);
    };

    socket.on('waiter:call', handleSocketCall);
    socket.on('waiter:resolve', handleSocketResolve);
    socket.on('waiter:resolved', handleSocketResolve);

    return () => {
      socket.off('waiter:call', handleSocketCall);
      socket.off('waiter:resolve', handleSocketResolve);
      socket.off('waiter:resolved', handleSocketResolve);
    };
  }, [socketContext, registerAssistanceCall, resolveAssistanceCall]);

  // Merge a message received from the server (or its echo of our own send) into state, deduped by id
  const mergeIncomingStaffMessage = useCallback((incoming) => {
    if (!incoming || !incoming.id) return;
    setStaffMessagesState(prev => {
      const idx = prev.findIndex(m => m.id === incoming.id);
      let next;
      if (idx >= 0) {
        next = prev.slice();
        next[idx] = { ...prev[idx], ...incoming };
      } else {
        next = [incoming, ...prev];
      }
      if (typeof localStorage !== 'undefined') {
        try { localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(next)); } catch { /* quota */ }
      }
      return next;
    });
  }, []);

  // Live staff-to-staff messages from other devices
  useEffect(() => {
    if (!socketContext?.socket) return;
    const socket = socketContext.socket;

    const handleStaffMessage = (data) => {
      if (data && data.id) mergeIncomingStaffMessage(data);
    };
    const handleStaffRead = (data) => {
      if (!data?.id) return;
      setStaffMessagesState(prev => {
        const next = prev.map(m => (m.id === data.id ? { ...m, read: true } : m));
        if (typeof localStorage !== 'undefined') {
          try { localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(next)); } catch { /* quota */ }
        }
        return next;
      });
    };

    socket.on('staff:message', handleStaffMessage);
    socket.on('staff:message:read', handleStaffRead);

    return () => {
      socket.off('staff:message', handleStaffMessage);
      socket.off('staff:message:read', handleStaffRead);
    };
  }, [socketContext, mergeIncomingStaffMessage]);

  // On load, pull messages addressed to the logged-in employee so messages sent
  // while this device was closed still appear. Filters elsewhere match on id,
  // numericId or username, so query each identifier and merge deduped by id.
  useEffect(() => {
    if (typeof localStorage === 'undefined' || typeof fetch === 'undefined') return;
    let ids = [];
    try {
      const raw = localStorage.getItem('smartdine_logged_in_employee')
        || localStorage.getItem('smartdine_waiter_session');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const emp = parsed?.employee || parsed;
      ids = [emp?.id, emp?.numericId, emp?.username]
        .filter(v => v !== undefined && v !== null && String(v).trim() !== '')
        .map(v => String(v).trim());
      ids = [...new Set(ids)];
    } catch {
      return;
    }
    if (ids.length === 0) return;

    let cancelled = false;
    Promise.all(ids.map(id =>
      fetch(`${resolveServerUrl()}/api/staff/messages?recipient=${encodeURIComponent(id)}`)
        .then(res => (res.ok ? res.json() : null))
        .then(json => (json?.success && Array.isArray(json.data) ? json.data : []))
        .catch(() => [])
    )).then(results => {
      if (cancelled) return;
      const incoming = results.flat();
      if (incoming.length === 0) return;
      setStaffMessagesState(prev => {
        const byId = new Map(prev.map(m => [m.id, m]));
        for (const msg of incoming) {
          if (!msg?.id) continue;
          byId.set(msg.id, { ...byId.get(msg.id), ...msg });
        }
        const next = [...byId.values()].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        if (typeof localStorage !== 'undefined') {
          try { localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(next)); } catch { /* quota */ }
        }
        return next;
      });
    });

    return () => { cancelled = true; };
  }, []);

  // Central synchronized setTables that keeps tableCount locked in 1:1 parity
  const setTables = useCallback((updater) => {
    setTablesState(prevTables => {
      const nextTables = typeof updater === 'function' ? updater(prevTables) : updater;
      if (Array.isArray(nextTables)) {
        const maxNum = nextTables.reduce((max, t) => Math.max(max, t.tableNumber || 0), 0);
        const calculatedCount = Math.max(maxNum, nextTables.length);
        setTableCountState(prev => (prev !== calculatedCount ? calculatedCount : prev));
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(STORAGE_KEYS.TABLE_COUNT, String(calculatedCount));
          localStorage.setItem(STORAGE_KEYS.TABLES, JSON.stringify(nextTables));
        }
        broadcastState('TABLE_COUNT_UPDATED', calculatedCount);
      }
      broadcastState('TABLES_UPDATED', nextTables);
      return nextTables;
    });
  }, [broadcastState]);

  // ---------------------------------------------------------------------------
  // CUSTOMER REPORTS & NOTES (Rule 5 & Cross-View State Sync)
  // ---------------------------------------------------------------------------
  const setCustomerReports = useCallback((updater) => {
    setCustomerReportsState(prevReports => {
      const nextReports = typeof updater === 'function' ? updater(prevReports) : updater;
      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(nextReports));
        } catch (_) {}
      }
      broadcastState('REPORTS_UPDATED', nextReports);
      return nextReports;
    });
  }, [broadcastState]);

  const addCustomerReport = useCallback((reportData) => {
    const tblNum = Number(reportData.table || reportData.tableNumber || 1);
    const assignedEmp = getAssignedEmployeeForTable(tblNum) || employees[0];
    const newReport = {
      id: reportData.id || `rep-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      table: tblNum,
      note: reportData.note || reportData.complaintText || '',
      severity: reportData.severity || 'general',
      status: reportData.status || 'new',
      createdAt: reportData.createdAt || Date.now(),
      staffId: reportData.staffId || (assignedEmp ? assignedEmp.id : 'emp-1'),
      dispatch: reportData.dispatch || null,
      resolvedAt: null,
      resolutionTime: null,
      resolutionNote: null,
      messages: reportData.messages || []
    };

    setCustomerReportsState(prev => {
      const next = [newReport, ...prev];
      if (typeof localStorage !== 'undefined') {
        try { localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(next)); } catch (_) {}
      }
      broadcastState('REPORTS_UPDATED', next);
      return next;
    });

    return newReport;
  }, [getAssignedEmployeeForTable, employees, broadcastState]);

  const updateCustomerReport = useCallback((reportId, patchOrUpdater) => {
    setCustomerReportsState(prev => {
      const next = prev.map(r => {
        if (r.id === reportId) {
          if (typeof patchOrUpdater === 'function') {
            return patchOrUpdater(r);
          }
          return { ...r, ...patchOrUpdater };
        }
        return r;
      });
      if (typeof localStorage !== 'undefined') {
        try { localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(next)); } catch (_) {}
      }
      broadcastState('REPORTS_UPDATED', next);
      return next;
    });
  }, [broadcastState]);

  const assignReportStaff = useCallback((reportId, staffId, dispatchNote = null) => {
    const targetEmp = employees.find(e => e.id === staffId || String(e.numericId) === String(staffId)) || employees[0];
    setCustomerReportsState(prev => {
      const next = prev.map(r => {
        if (r.id === reportId) {
          const noteText = dispatchNote || `${targetEmp.name} assigned to Table ${r.table}`;
          return {
            ...r,
            staffId: targetEmp.id,
            status: r.status === 'new' ? 'in_progress' : r.status,
            dispatch: { staffId: targetEmp.id, note: noteText }
          };
        }
        return r;
      });
      if (typeof localStorage !== 'undefined') {
        try { localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(next)); } catch (_) {}
      }
      broadcastState('REPORTS_UPDATED', next);
      return next;
    });
  }, [employees, broadcastState]);

  const sendReportMessage = useCallback((reportId, to, text, from = 'Admin') => {
    const cleanText = String(text || '').trim();
    if (!cleanText) return null;

    const msg = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      to,
      text: cleanText,
      sentAt: Date.now(),
      from
    };

    setCustomerReportsState(prev => {
      const next = prev.map(r => {
        if (r.id === reportId) {
          const emp = employees.find(e => e.id === r.staffId) || employees[0];
          const autoProgress = (to === 'employee' && r.status === 'new');
          return {
            ...r,
            messages: [...(r.messages || []), msg],
            status: autoProgress ? 'in_progress' : r.status,
            dispatch: (to === 'employee' && !r.dispatch)
              ? { staffId: r.staffId, note: `Message sent to ${emp.name}` }
              : r.dispatch
          };
        }
        return r;
      });
      if (typeof localStorage !== 'undefined') {
        try { localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(next)); } catch (_) {}
      }
      broadcastState('REPORTS_UPDATED', next);
      return next;
    });

    return msg;
  }, [employees, broadcastState]);

  const resolveCustomerReport = useCallback((reportId, customResolutionNote = null) => {
    const now = Date.now();
    setCustomerReportsState(prev => {
      const next = prev.map(r => {
        if (r.id === reportId) {
          const elapsedMin = Math.max(1, Math.round((now - (r.createdAt || now)) / 60000));
          const note = customResolutionNote?.trim() || 'Resolved — customer confirmed satisfied.';
          return {
            ...r,
            status: 'resolved',
            resolvedAt: now,
            resolutionTime: `${elapsedMin} min${elapsedMin === 1 ? '' : 's'}`,
            resolutionNote: note.startsWith('Resolved') ? note : `Resolved — ${note}`
          };
        }
        return r;
      });
      if (typeof localStorage !== 'undefined') {
        try { localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(next)); } catch (_) {}
      }
      broadcastState('REPORTS_UPDATED', next);
      return next;
    });
  }, [broadcastState]);

  const reopenCustomerReport = useCallback((reportId) => {
    setCustomerReportsState(prev => {
      const next = prev.map(r => {
        if (r.id === reportId) {
          return {
            ...r,
            status: 'in_progress',
            resolvedAt: null,
            resolutionTime: null,
            resolutionNote: null
          };
        }
        return r;
      });
      if (typeof localStorage !== 'undefined') {
        try { localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(next)); } catch (_) {}
      }
      broadcastState('REPORTS_UPDATED', next);
      return next;
    });
  }, [broadcastState]);

  const priorityPingReport = useCallback((reportId) => {
    setCustomerReportsState(prev => {
      const next = prev.map(r => {
        if (r.id === reportId) {
          const emp = employees.find(e => e.id === r.staffId) || employees[0];
          return {
            ...r,
            status: r.status === 'new' ? 'in_progress' : r.status,
            dispatch: { staffId: r.staffId, note: `Priority ping sent to ${emp.name}` }
          };
        }
        return r;
      });
      if (typeof localStorage !== 'undefined') {
        try { localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(next)); } catch (_) {}
      }
      broadcastState('REPORTS_UPDATED', next);
      return next;
    });
  }, [employees, broadcastState]);

  const resetCustomerReports = useCallback((newReports = null) => {
    const target = newReports || DEFAULT_CUSTOMER_REPORTS;
    setCustomerReportsState(target);
    if (typeof localStorage !== 'undefined') {
      try { localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(target)); } catch (_) {}
    }
    broadcastState('REPORTS_UPDATED', target);
  }, [broadcastState]);

  const getReportsForEmployee = useCallback((employeeId) => {
    const empId = String(employeeId);
    return customerReports.filter(r => r.staffId === empId || String(r.staffId) === empId);
  }, [customerReports]);

  const getReportsForTable = useCallback((tableNumber) => {
    const tbl = Number(tableNumber);
    return customerReports.filter(r => Number(r.table) === tbl);
  }, [customerReports]);

  // ---------------------------------------------------------------------------
  // EMPLOYEE ACTIVITY & AUDIT HISTORY
  // ---------------------------------------------------------------------------
  const recordActivity = useCallback((activityPayload) => {
    if (!activityPayload) return null;
    const newLog = {
      id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: Date.now(),
      actorType: activityPayload.actorType || 'employee', // 'admin' | 'employee'
      actorId: activityPayload.actorId ? String(activityPayload.actorId) : 'unknown',
      actorName: activityPayload.actorName || 'Staff Member',
      actorRole: activityPayload.actorRole || 'Floor Specialist',
      actorStaffId: activityPayload.actorStaffId ? String(activityPayload.actorStaffId) : '101',
      actionType: activityPayload.actionType || 'TEXT_WAITER', // 'TEXT_WAITER' | 'ALERT_WAITER' | 'STAGE_ADVANCE' | 'RESOLVE_CALL' | 'RESOLVE_REPORT' | 'TABLE_STATUS' | 'LOGIN'
      description: activityPayload.description || 'Performed an operation',
      target: activityPayload.target || '',
      details: activityPayload.details || ''
    };

    setActivityLogsState(prev => {
      const next = [newLog, ...prev.slice(0, 199)];
      if (typeof localStorage !== 'undefined') {
        try { localStorage.setItem(STORAGE_KEYS.ACTIVITY, JSON.stringify(next)); } catch (_) {}
      }
      broadcastState('ACTIVITY_LOG_UPDATED', next);
      return next;
    });

    if (socketContext?.socket?.connected) {
      socketContext.socket.emit('employee:activity', newLog);
    }

    return newLog;
  }, [broadcastState, socketContext]);

  const clearActivityLogs = useCallback(() => {
    setActivityLogsState([]);
    if (typeof localStorage !== 'undefined') {
      try { localStorage.setItem(STORAGE_KEYS.ACTIVITY, JSON.stringify([])); } catch (_) {}
    }
    broadcastState('ACTIVITY_LOG_UPDATED', []);
  }, [broadcastState]);

  // ---------------------------------------------------------------------------
  // ORDER CORRECTIONS: VOIDS, DISCOUNTS & VOID REQUESTS (audited via recordActivity)
  // ---------------------------------------------------------------------------
  const [orderCorrections, setOrderCorrectionsState] = useState(() => {
    const empty = { voids: {}, discounts: {}, requests: [] };
    if (typeof localStorage !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEYS.ORDER_CORRECTIONS);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === 'object') {
            return {
              voids: parsed.voids || {},
              discounts: parsed.discounts || {},
              requests: Array.isArray(parsed.requests) ? parsed.requests : []
            };
          }
        }
      } catch (_) {}
    }
    return empty;
  });

  const commitOrderCorrections = useCallback((mutator) => {
    setOrderCorrectionsState(prev => {
      const next = mutator(prev);
      if (typeof localStorage !== 'undefined') {
        try { localStorage.setItem(STORAGE_KEYS.ORDER_CORRECTIONS, JSON.stringify(next)); } catch (_) {}
      }
      broadcastState('ORDER_CORRECTIONS_UPDATED', next);
      return next;
    });
  }, [broadcastState]);

  const ADMIN_ACTOR = useMemo(() => ({
    actorType: 'admin',
    actorId: 'admin',
    actorName: 'Head Desk / Admin',
    actorRole: 'Admin',
    actorStaffId: 'ADMIN'
  }), []);

  // Merge server-known corrections into local state (server wins, local kept as offline fallback)
  const applyServerCorrections = useCallback((serverSnapshot) => {
    setOrderCorrectionsState(prev => {
      const next = mergeCorrectionSnapshots(prev, serverSnapshot);
      if (typeof localStorage !== 'undefined') {
        try { localStorage.setItem(STORAGE_KEYS.ORDER_CORRECTIONS, JSON.stringify(next)); } catch (_) {}
      }
      return next;
    });
  }, []);

  const refreshServerCorrections = useCallback(async () => {
    if (typeof fetch === 'undefined') return;
    try {
      const res = await fetch(`${resolveServerUrl()}/api/corrections`);
      if (!res.ok) return;
      const json = await res.json();
      if (json?.success && Array.isArray(json.data)) {
        applyServerCorrections(correctionRowsToSnapshot(json.data));
      }
    } catch (_) { /* server unreachable: keep local copy */ }
  }, [applyServerCorrections]);

  // Load corrections from the server on mount
  useEffect(() => {
    refreshServerCorrections();
  }, [refreshServerCorrections]);

  // Re-sync whenever any device changes a correction
  useEffect(() => {
    if (!socketContext?.socket) return;
    const socket = socketContext.socket;
    const handleCorrectionChanged = () => { refreshServerCorrections(); };
    socket.on('correction:changed', handleCorrectionChanged);
    return () => { socket.off('correction:changed', handleCorrectionChanged); };
  }, [socketContext, refreshServerCorrections]);

  const getOrderCorrection = useCallback((orderId) => {
    const key = String(orderId);
    return {
      voidedItems: orderCorrections.voids[key] || [],
      discount: orderCorrections.discounts[key] || null
    };
  }, [orderCorrections]);

  const getPendingVoidRequests = useCallback(
    () => orderCorrections.requests.filter(r => r.status === 'pending'),
    [orderCorrections]
  );

  const describeVoidTarget = (target) => {
    const itemPart = target.itemNames?.length ? target.itemNames.join(', ') : 'whole order';
    return `${target.orderLabel} (Table ${target.tableNumber ?? '-'}): ${itemPart}`;
  };

  /** Applies item voids to an orderCorrections snapshot (pure). */
  const applyVoidsToSnapshot = (snapshot, orderId, itemIndexes) => {
    const key = String(orderId);
    const merged = Array.from(new Set([...(snapshot.voids[key] || []), ...itemIndexes]));
    return { ...snapshot, voids: { ...snapshot.voids, [key]: merged } };
  };

  /** Admin void with master PIN. itemIndexes: array of item positions, or 'all'. */
  const voidOrderItems = useCallback(async ({ orderId, orderLabel, tableNumber, items = [], itemIndexes, reason, note = '', pin, actor = ADMIN_ACTOR }) => {
    if (!(await verifyAdminPin(pin))) {
      return { success: false, error: 'Invalid admin PIN' };
    }
    if (!reason) return { success: false, error: 'A reason is required' };
    const indexes = itemIndexes === 'all' ? items.map((_, i) => i) : itemIndexes;
    if (!indexes.length) return { success: false, error: 'Select at least one item' };
    const itemNames = indexes.map(i => items[i]?.name).filter(Boolean);
    commitOrderCorrections(prev => applyVoidsToSnapshot(prev, orderId, indexes));
    sendCorrectionRequest('POST', '/api/corrections', {
      type: 'void', orderId, orderLabel, tableNumber, itemIndexes: indexes, itemNames,
      wholeOrder: itemIndexes === 'all', reason, note, appliedBy: actor?.actorName || ADMIN_ACTOR.actorName
    });
    recordActivity({
      ...actor,
      actionType: 'VOID',
      description: `Voided ${itemIndexes === 'all' ? 'whole order' : `${indexes.length} item(s)`} on ${orderLabel}: ${reason}${note ? ` - ${note}` : ''}`,
      target: orderLabel,
      details: describeVoidTarget({ orderLabel, tableNumber, itemNames })
    });
    return { success: true };
  }, [commitOrderCorrections, recordActivity, ADMIN_ACTOR]);

  /** Waiter (or any staff) requests a void; admin approves it later. */
  const requestOrderVoid = useCallback(({ orderId, orderLabel, tableNumber, items = [], itemIndexes, reason, note = '', actor }) => {
    if (!reason) return { success: false, error: 'A reason is required' };
    const indexes = itemIndexes === 'all' ? items.map((_, i) => i) : itemIndexes;
    if (!indexes.length) return { success: false, error: 'Select at least one item' };
    const itemNames = indexes.map(i => items[i]?.name).filter(Boolean);
    const request = {
      id: `vreq-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      status: 'pending',
      orderId: String(orderId),
      orderLabel,
      tableNumber,
      itemIndexes: indexes,
      itemNames,
      wholeOrder: itemIndexes === 'all',
      reason,
      note,
      requestedBy: actor?.actorName || 'Waiter',
      requestedById: actor?.actorStaffId || '',
      requestedAt: Date.now()
    };
    commitOrderCorrections(prev => ({ ...prev, requests: [request, ...prev.requests].slice(0, 200) }));
    sendCorrectionRequest('POST', '/api/corrections', {
      id: request.id, type: 'void_request', orderId: request.orderId, orderLabel, tableNumber,
      itemIndexes: indexes, itemNames, wholeOrder: request.wholeOrder, reason, note,
      requestedBy: request.requestedBy, requestedById: request.requestedById
    });
    recordActivity({
      actorType: 'employee',
      ...(actor || {}),
      actionType: 'VOID_REQUEST',
      description: `Requested void on ${orderLabel}: ${reason}${note ? ` - ${note}` : ''}`,
      target: orderLabel,
      details: describeVoidTarget({ orderLabel, tableNumber, itemNames })
    });
    return { success: true, request };
  }, [commitOrderCorrections, recordActivity]);

  /** Admin approves a pending request; requires master PIN. */
  const approveVoidRequest = useCallback(async (requestId, pin, admin = ADMIN_ACTOR) => {
    if (!(await verifyAdminPin(pin))) {
      return { success: false, error: 'Invalid admin PIN' };
    }
    const request = orderCorrections.requests.find(r => r.id === requestId);
    if (!request || request.status !== 'pending') {
      return { success: false, error: 'Request is no longer pending' };
    }
    commitOrderCorrections(prev => {
      const withVoids = applyVoidsToSnapshot(prev, request.orderId, request.itemIndexes);
      return {
        ...withVoids,
        requests: withVoids.requests.map(r => (r.id === requestId
          ? { ...r, status: 'approved', resolvedBy: admin.actorName, resolvedAt: Date.now() }
          : r))
      };
    });
    sendCorrectionRequest('PATCH', `/api/corrections/${encodeURIComponent(requestId)}`, { status: 'approved', resolvedBy: admin.actorName });
    recordActivity({
      ...admin,
      actionType: 'VOID_APPROVED',
      description: `Approved void request from ${request.requestedBy} on ${request.orderLabel}: ${request.reason}`,
      target: request.orderLabel,
      details: describeVoidTarget(request)
    });
    return { success: true };
  }, [orderCorrections, commitOrderCorrections, recordActivity, ADMIN_ACTOR]);

  /** Admin rejects a pending request (no PIN needed to reject). */
  const rejectVoidRequest = useCallback((requestId, admin = ADMIN_ACTOR) => {
    const request = orderCorrections.requests.find(r => r.id === requestId);
    if (!request || request.status !== 'pending') {
      return { success: false, error: 'Request is no longer pending' };
    }
    commitOrderCorrections(prev => ({
      ...prev,
      requests: prev.requests.map(r => (r.id === requestId
        ? { ...r, status: 'rejected', resolvedBy: admin.actorName, resolvedAt: Date.now() }
        : r))
    }));
    sendCorrectionRequest('PATCH', `/api/corrections/${encodeURIComponent(requestId)}`, { status: 'rejected', resolvedBy: admin.actorName });
    recordActivity({
      ...admin,
      actionType: 'VOID_REJECTED',
      description: `Rejected void request from ${request.requestedBy} on ${request.orderLabel}: ${request.reason}`,
      target: request.orderLabel,
      details: describeVoidTarget(request)
    });
    return { success: true };
  }, [orderCorrections, commitOrderCorrections, recordActivity, ADMIN_ACTOR]);

  /** Discount on an order or table bill: 'percent' (0-100) or 'fixed' amount. Requires master PIN. */
  const applyOrderDiscount = useCallback(async ({ orderId, orderLabel, tableNumber, discountType, value, reason, note = '', pin, actor = ADMIN_ACTOR }) => {
    if (!(await verifyAdminPin(pin))) {
      return { success: false, error: 'Invalid admin PIN' };
    }
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount <= 0) return { success: false, error: 'Enter a discount above zero' };
    if (discountType === 'percent' && amount > 100) return { success: false, error: 'Percent cannot exceed 100' };
    if (!reason) return { success: false, error: 'A reason is required' };
    const key = String(orderId);
    const discount = { id: `disc-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`, type: discountType === 'percent' ? 'percent' : 'fixed', value: amount, reason, note, appliedBy: actor.actorName, appliedAt: Date.now() };
    commitOrderCorrections(prev => ({ ...prev, discounts: { ...prev.discounts, [key]: discount } }));
    sendCorrectionRequest('POST', '/api/corrections', {
      id: discount.id, type: 'discount', orderId: key, orderLabel, tableNumber,
      discountType: discount.type, value: amount, reason, note, appliedBy: actor.actorName
    });
    recordActivity({
      ...actor,
      actionType: 'DISCOUNT',
      description: `Applied ${discount.type === 'percent' ? `${amount}%` : `${amount} fixed`} discount on ${orderLabel}: ${reason}${note ? ` - ${note}` : ''}`,
      target: orderLabel,
      details: `Table ${tableNumber ?? '-'}`
    });
    return { success: true };
  }, [commitOrderCorrections, recordActivity, ADMIN_ACTOR]);

  /** Removes a discount from an order or table bill. Requires master PIN. */
  const clearOrderDiscount = useCallback(async ({ orderId, orderLabel, pin, actor = ADMIN_ACTOR }) => {
    if (!(await verifyAdminPin(pin))) {
      return { success: false, error: 'Invalid admin PIN' };
    }
    const key = String(orderId);
    const activeDiscountId = orderCorrections.discounts[key]?.id;
    commitOrderCorrections(prev => {
      const discounts = { ...prev.discounts };
      delete discounts[key];
      return { ...prev, discounts };
    });
    if (activeDiscountId) {
      sendCorrectionRequest('PATCH', `/api/corrections/${encodeURIComponent(activeDiscountId)}`, { status: 'cleared', resolvedBy: actor.actorName });
    }
    recordActivity({
      ...actor,
      actionType: 'DISCOUNT_REMOVED',
      description: `Removed discount from ${orderLabel}`,
      target: orderLabel,
      details: ''
    });
    return { success: true };
  }, [orderCorrections, commitOrderCorrections, recordActivity, ADMIN_ACTOR]);

  const authenticateEmployee = useCallback((username, password) => {
    if (!username || !password) return null;
    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    const found = employees.find(e => {
      const u = (e.username || e.accountCode || '').toLowerCase();
      return u === cleanUser && verifyStaffSecret(e, cleanPass);
    });

    if (found) {
      recordActivity({
        actorType: 'employee',
        actorId: found.id,
        actorName: found.name,
        actorRole: found.role || 'Staff',
        actorStaffId: found.staffId || found.numericId || '101',
        actionType: 'LOGIN',
        description: `${found.name} logged into Employee & Kitchen Hub`,
        target: 'Employee & Kitchen Hub'
      });
    }

    return found || null;
  }, [employees, recordActivity]);

  // ---------------------------------------------------------------------------
  // DIRECT ADMIN <-> WAITER DISPATCH & MESSAGING
  // ---------------------------------------------------------------------------

  const sendStaffMessage = useCallback((toWaiterId, text, options = {}) => {
    const targetEmp = employees.find(
      e => e.id === toWaiterId || String(e.numericId) === String(toWaiterId) || (e.username && e.username.toLowerCase() === String(toWaiterId).toLowerCase())
    );
    const isAlert = options.isAlert === true || options.category === 'alert' || options.type === 'alert';
    const isEmployee = options.from === 'Employee' || !!options.fromEmployeeId;

    const fromRole = options.fromRole || (isEmployee ? 'Kitchen Staff' : 'Admin');
    const fromName = options.fromName || (isEmployee ? 'Kitchen Staff' : 'Head Desk / Admin');
    const fromEmployeeId = options.fromEmployeeId || (isEmployee ? options.employeeId : 'admin');
    const fromStaffId = options.fromStaffId || options.staffId || (isEmployee ? '101' : 'ADMIN');

    const newMsg = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      from: isEmployee ? 'Employee' : 'Admin',
      fromName: fromName,
      fromRole: fromRole,
      fromEmployeeId: fromEmployeeId,
      fromStaffId: fromStaffId,
      toWaiterId: targetEmp ? targetEmp.id : String(toWaiterId),
      toWaiterName: targetEmp ? targetEmp.name : 'Floor Specialist',
      text: text.trim(),
      timestamp: Date.now(),
      status: 'pending',
      urgent: isAlert ? true : (options.urgent !== false),
      isAlert: isAlert,
      category: isAlert ? 'alert' : 'normal',
      tableNumber: options.tableNumber || null,
      replies: []
    };

    setStaffMessagesState(prev => {
      const next = [newMsg, ...prev];
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(next));
      }
      broadcastState('MESSAGES_UPDATED', next);
      return next;
    });

    // Automatically record this in Activity History
    recordActivity({
      actorType: isEmployee ? 'employee' : 'admin',
      actorId: fromEmployeeId,
      actorName: fromName,
      actorRole: fromRole,
      actorStaffId: fromStaffId,
      actionType: isAlert ? 'ALERT_WAITER' : 'TEXT_WAITER',
      description: isAlert
        ? `${fromName} sent URGENT ALERT to waiter ${targetEmp?.name || toWaiterId}: "${text.trim()}"`
        : `${fromName} texted waiter ${targetEmp?.name || toWaiterId}: "${text.trim()}"`,
      target: targetEmp?.name || `Waiter #${toWaiterId}`,
      details: text.trim()
    });

    if (socketContext?.socket?.connected) {
      socketContext.socket.emit('waiter:admin_nudge', newMsg);
    }

    // Persist on the server so staff on other devices receive it.
    // If the server is unreachable the message stays in local state (offline fallback).
    try {
      fetch(`${resolveServerUrl()}/api/staff/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMsg)
      }).then(res => res.ok ? res.json() : null)
        .then(json => {
          if (json?.success && json.data) {
            mergeIncomingStaffMessage(json.data);
          }
        })
        .catch(() => { /* offline: keep local copy only */ });
    } catch {
      /* fetch unavailable: keep local copy only */
    }

    return newMsg;
  }, [employees, broadcastState, socketContext, recordActivity, mergeIncomingStaffMessage]);

  const acknowledgeStaffMessage = useCallback((messageId, replyText = '') => {
    setStaffMessagesState(prev => {
      const next = prev.map(m => {
        if (m.id === messageId) {
          const updatedReplies = replyText.trim()
            ? [...(m.replies || []), { text: replyText.trim(), timestamp: Date.now(), from: 'Waiter' }]
            : (m.replies || []);
          return {
            ...m,
            status: 'acknowledged',
            acknowledgedAt: Date.now(),
            replies: updatedReplies
          };
        }
        return m;
      });
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(next));
      }
      broadcastState('MESSAGES_UPDATED', next);
      return next;
    });
  }, [broadcastState]);

  const resolveStaffMessage = useCallback((messageId) => {
    setStaffMessagesState(prev => {
      const next = prev.map(m => {
        if (m.id === messageId) {
          return { ...m, status: 'resolved', resolvedAt: Date.now() };
        }
        return m;
      });
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(next));
      }
      broadcastState('MESSAGES_UPDATED', next);
      return next;
    });
  }, [broadcastState]);

  const contextValue = {
    // State
    tableCount,
    tables,
    employees,
    assistanceCalls,
    customerReports,
    staffMessages,
    activityLogs,

    // Lookups
    getAssignedEmployeeForTable,
    getWaiterByTable,
    getReportsForEmployee,
    getReportsForTable,

    // Authentication & Staff Credentials
    authenticateWaiter,
    authenticateEmployee,
    updateEmployeeCredentials,
    hireEmployee,
    addEmployee: hireEmployee,
    removeEmployee,

    // Activity & Audit History
    recordActivity,
    clearActivityLogs,

    // Order corrections (voids, discounts, void requests)
    orderCorrections,
    getOrderCorrection,
    getPendingVoidRequests,
    voidOrderItems,
    requestOrderVoid,
    approveVoidRequest,
    rejectVoidRequest,
    applyOrderDiscount,
    clearOrderDiscount,

    // Direct Staff Messaging / Dispatch
    sendStaffMessage,
    acknowledgeStaffMessage,
    resolveStaffMessage,

    // Actions (Floor & Tables)
    setTableCount,
    addTable,
    removeTable,
    setTables,
    setEmployees,
    assignTableToEmployee,
    reassignAllTables,
    setEmployeeStatus,
    autoBalanceTables,
    registerAssistanceCall,
    resolveAssistanceCall,

    // Actions (Customer Reports & Notes)
    setCustomerReports,
    addCustomerReport,
    updateCustomerReport,
    assignReportStaff,
    sendReportMessage,
    resolveCustomerReport,
    reopenCustomerReport,
    priorityPingReport,
    resetCustomerReports
  };

  return (
    <RestaurantContext.Provider value={contextValue}>
      {children}
    </RestaurantContext.Provider>
  );
}

export function useRestaurant() {
  const context = useContext(RestaurantContext);
  if (!context) {
    throw new Error('useRestaurant must be used within a RestaurantProvider');
  }
  return context;
}

export function useCustomerReports() {
  const {
    customerReports,
    setCustomerReports,
    addCustomerReport,
    updateCustomerReport,
    assignReportStaff,
    sendReportMessage,
    resolveCustomerReport,
    reopenCustomerReport,
    priorityPingReport,
    resetCustomerReports,
    getReportsForEmployee,
    getReportsForTable,
    employees
  } = useRestaurant();

  return {
    reports: customerReports,
    customerReports,
    setCustomerReports,
    addCustomerReport,
    updateCustomerReport,
    assignReportStaff,
    sendReportMessage,
    resolveCustomerReport,
    reopenCustomerReport,
    priorityPingReport,
    resetCustomerReports,
    getReportsForEmployee,
    getReportsForTable,
    employees
  };
}

export default RestaurantContext;

/**
 * Each role is its own deployment (VITE_APP_ROLE). Links from one panel to another
 * must go to that panel's site; a relative path would reopen the current app.
 * When everything runs in one app (role "all", local dev), relative paths still work.
 */
const ROLE = import.meta.env?.VITE_APP_ROLE || 'all';
const SPLIT = ROLE !== 'all';

const SITES = {
  employee: import.meta.env?.VITE_EMPLOYEE_URL || 'https://smartdine-employee.vercel.app',
  waiter: import.meta.env?.VITE_WAITER_URL || 'https://smartdine-waiter.vercel.app'
};

/** URL for a page on the employee or waiter app, e.g. appUrl('employee', '?tab=reports') */
export function appUrl(app, suffix = '') {
  if (!SPLIT) return `/${app}${suffix}`;
  return `${SITES[app]}/${suffix}`;
}

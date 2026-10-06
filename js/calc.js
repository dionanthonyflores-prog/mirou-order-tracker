// The order tracker's rules and arithmetic. No screens and no saving here, only plain functions,
// so every rule can be tested on its own (see tests/unit/calc.test.mjs).
import { DRINKS, SIZES, OAT_EXTRA, PAYMENT } from './menu.js';

export const peso = n => '₱' + n.toLocaleString('en-PH');
export const sizeOf = id => SIZES.find(s => s.id === id) ?? SIZES[0];
export const drinkOf = name => DRINKS.find(d => d.name === name);

/** Price of one cup: the drink, plus the upsize and oatmilk if chosen */
export function unitPrice(drinkName, sizeId, oat) {
  const drink = drinkOf(drinkName);
  if (!drink) throw new Error(`Not on the menu: ${drinkName}`);
  return drink.price + sizeOf(sizeId).extra + (oat ? OAT_EXTRA : 0);
}

// Each order line keeps the price it was sold at (unitPrice), so changing the menu later
// never changes what an old order cost.
export const lineTotal = item => item.unitPrice * item.qty;
export const drinksTotal = order => order.items.reduce((sum, item) => sum + lineTotal(item), 0);
export const deliveryFee = order => (order.how === 'delivery' ? order.deliveryFee || 0 : 0);
export const orderTotal = order => drinksTotal(order) + deliveryFee(order);
export const amountToCollect = order => (order.paid ? 0 : orderTotal(order));
export const cupCount = order => order.items.reduce((n, item) => n + item.qty, 0);

/** e.g. "2× Matcha latte (16 oz, oatmilk)" */
export function itemLabel(item) {
  const details = [sizeOf(item.size).label, item.oat ? 'oatmilk' : ''].filter(Boolean).join(', ');
  return `${item.qty}× ${item.drink} (${details})`;
}

/** Any whole number from 1 to 99; anything else becomes 1 (same rule as the website) */
export const toQty = n => Math.min(99, Math.max(1, parseInt(n) || 1));

// ----- Order status -----
// Delivery: New → Preparing → Out for delivery → Done.  Pick up: New → Preparing → Ready for pickup → Done.
// An open order can also be cancelled.
export const STATUS = {
  new: 'New', preparing: 'Preparing', out: 'Out for delivery', ready: 'Ready for pickup', done: 'Done', cancelled: 'Cancelled',
};
// What the button that moves an order along says
export const ACTION = { preparing: 'Start preparing', out: 'Send out for delivery', ready: 'Ready for pickup', done: 'Mark done' };

export function nextStatus(order) {
  switch (order.status) {
    case 'new': return 'preparing';
    case 'preparing': return order.how === 'delivery' ? 'out' : 'ready';
    case 'out':
    case 'ready': return 'done';
    default: return null;   // done and cancelled are the end
  }
}
export const isOpen = order => order.status !== 'done' && order.status !== 'cancelled';

/** If an order is switched between delivery and pick up after it was made, keep its status sensible */
export function statusForHow(status, how) {
  if (how === 'pickup' && status === 'out') return 'ready';
  if (how === 'delivery' && status === 'ready') return 'out';
  return status;
}

// ----- Today -----
// The shop is in the Philippines, so "today" is Manila's day, whatever time zone a device is set to.
const manilaFormat = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' });
/** "2026-10-06" for any moment, as a date in Manila */
export const manilaDay = moment => manilaFormat.format(new Date(moment));

/** The numbers at the top of the Today screen */
export function todayStats(orders, now = new Date()) {
  const today = manilaDay(now);
  const counted = orders.filter(o => o.status !== 'cancelled' && manilaDay(o.createdAt) === today);
  return {
    orders: counted.length,
    sales: counted.reduce((sum, o) => sum + drinksTotal(o), 0),            // drinks only; delivery fees are not sales
    unpaid: counted.reduce((sum, o) => sum + amountToCollect(o), 0),       // still to be paid, delivery fees included
    cups: counted.reduce((n, o) => n + cupCount(o), 0),
    open: orders.filter(isOpen).length,                                     // open orders from any day still need doing
  };
}

// ----- Copy for driver -----
/** The message she pastes into the driver's chat */
export function driverMessage(order) {
  const lines = [
    `mirou matcha · order #${order.no}`,
    `For: ${order.customer}`,
    ...(order.contact ? [`Contact: ${order.contact}`] : []),
    `Address: ${order.address}`,
    ...order.items.map(item => `• ${itemLabel(item)}`),
    order.paid
      ? `Paid already by ${PAYMENT[order.paidBy]}: nothing to collect`
      : `Collect: ${peso(orderTotal(order))}` +
        (deliveryFee(order) ? ` (drinks ${peso(drinksTotal(order))} + delivery ${peso(deliveryFee(order))})` : ''),
  ];
  if (order.notes) lines.push(`Notes: ${order.notes}`);
  return lines.join('\n');
}

// ----- Backup: all orders as a spreadsheet file (CSV) -----
const CSV_COLUMNS = ['Order', 'Date', 'Time', 'Customer', 'Contact', 'Pick up or delivery', 'Address', 'Drinks', 'Cups',
  'Drinks total', 'Delivery fee', 'Total', 'Status', 'Paid', 'Paid by', 'Notes'];
const csvTime = new Intl.DateTimeFormat('en-PH', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit', hour12: false });

/** One cell: quoted when needed, and made safe to open in Google Sheets or Excel
 *  (text starting with = + - @ could otherwise run as a spreadsheet formula) */
function csvCell(value) {
  let text = String(value ?? '');
  if (/^[=+\-@\t\r]/.test(text)) text = "'" + text;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Every order, oldest first, one row each. Starts with a marker so Excel shows ₱ and accents correctly. */
export function ordersCsv(orders) {
  const rows = [...orders].sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map(o => [
    o.no, manilaDay(o.createdAt), csvTime.format(new Date(o.createdAt)), o.customer, o.contact,
    o.how === 'delivery' ? 'Delivery' : 'Pick up', o.address, o.items.map(itemLabel).join('; '), cupCount(o),
    drinksTotal(o), deliveryFee(o), orderTotal(o), STATUS[o.status], o.paid ? 'Yes' : 'No', o.paid ? PAYMENT[o.paidBy] : '', o.notes,
  ]);
  return '﻿' + [CSV_COLUMNS, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

/** Whole days since the last backup, or null if there has never been one */
export function daysSince(lastIso, now = new Date()) {
  if (!lastIso) return null;
  return Math.floor((new Date(now) - new Date(lastIso)) / 86_400_000);
}
export const BACKUP_EVERY_DAYS = 7;

// ----- Checking an order before it is saved -----
/** A list of what's missing or wrong; an empty list means the order can be saved */
export function problemsWith(order) {
  const problems = [];
  if (!order.customer?.trim()) problems.push("Add the customer's name.");
  if (!order.items?.length) problems.push('Add at least one drink.');
  if (order.items?.some(item => !Number.isInteger(item.qty) || item.qty < 1 || item.qty > 99)) problems.push('Each drink needs a quantity from 1 to 99.');
  if (order.how === 'delivery' && !order.address?.trim()) problems.push('Add the delivery address.');
  if (!Number.isInteger(order.deliveryFee) || order.deliveryFee < 0) problems.push('The delivery fee must be a whole number of pesos (0 or more).');
  if (order.paid && !PAYMENT[order.paidBy]) problems.push('Choose how it was paid.');
  return problems;
}

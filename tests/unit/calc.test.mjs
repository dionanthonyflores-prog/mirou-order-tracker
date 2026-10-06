// Unit tests for the tracker's rules and arithmetic (js/calc.js). Run with: npm run test:unit
// Each test name starts with its ID (UT-xx) and the requirement it checks.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as calc from '../../js/calc.js';

const item = (drink, size, oat, qty) => ({ drink, size, oat, qty, unitPrice: calc.unitPrice(drink, size, oat) });
const order = (fields = {}) => ({
  no: 101, customer: 'Ana R.', contact: '', how: 'pickup', address: '', deliveryFee: 0, notes: '',
  status: 'new', paid: false, paidBy: null, createdAt: '2026-10-06T03:00:00Z', items: [item('Matcha latte', '12oz', false, 1)],
  ...fields,
});

test('UT-01 T-REQ-01 a cup costs the drink + ₱35 for the 16 oz upsize + ₱10 for oatmilk', () => {
  assert.equal(calc.unitPrice('Matcha latte', '12oz', false), 160);
  assert.equal(calc.unitPrice('Matcha latte', '16oz', false), 195);
  assert.equal(calc.unitPrice('Matcha latte', '16oz', true), 205);
  assert.equal(calc.unitPrice('Hojicha latte', '12oz', true), 160);
  assert.throws(() => calc.unitPrice('Ube latte', '12oz', false), /Not on the menu/);
});

test('UT-02 T-REQ-01 totals: the delivery fee only counts for delivery, and a paid order has nothing to collect', () => {
  const items = [item('Matcha latte', '16oz', true, 2), item('Hor-jicha', '12oz', false, 1)];   // 2 × 205 + 200
  const delivery = order({ how: 'delivery', address: 'Bay', deliveryFee: 50, items });
  assert.equal(calc.drinksTotal(delivery), 610);
  assert.equal(calc.orderTotal(delivery), 660);
  assert.equal(calc.amountToCollect(delivery), 660);
  assert.equal(calc.amountToCollect({ ...delivery, paid: true, paidBy: 'gcash' }), 0);
  assert.equal(calc.orderTotal({ ...delivery, how: 'pickup' }), 610, 'no delivery fee for pick up');
  assert.equal(calc.cupCount(delivery), 3);
});

test('UT-03 T-REQ-01 an order line reads like the menu, with its size and milk', () => {
  assert.equal(calc.itemLabel(item('Matcha latte', '16oz', true, 2)), '2× Matcha latte (16 oz, oatmilk)');
  assert.equal(calc.itemLabel(item('Hor-jicha', '12oz', false, 1)), '1× Hor-jicha (12 oz)');
});

test('UT-04 T-REQ-02 status: delivery and pick up have their own steps, and done or cancelled is the end', () => {
  const walk = how => {
    const steps = [];
    let o = order({ how });
    while (o.status) { steps.push(o.status); o = { ...o, status: calc.nextStatus(o) }; }
    return steps;
  };
  assert.deepEqual(walk('delivery'), ['new', 'preparing', 'out', 'done']);
  assert.deepEqual(walk('pickup'), ['new', 'preparing', 'ready', 'done']);
  assert.equal(calc.nextStatus(order({ status: 'cancelled' })), null);
  assert.equal(calc.isOpen(order({ status: 'out' })), true);
  assert.equal(calc.isOpen(order({ status: 'cancelled' })), false);
  // switching delivery ↔ pick up after the order went out keeps the status sensible
  assert.equal(calc.statusForHow('out', 'pickup'), 'ready');
  assert.equal(calc.statusForHow('ready', 'delivery'), 'out');
  assert.equal(calc.statusForHow('preparing', 'pickup'), 'preparing');
});

test('UT-05 T-REQ-04 "today" is the day in Manila, so it changes at midnight Philippine time', () => {
  assert.equal(calc.manilaDay('2026-10-06T15:59:59Z'), '2026-10-06');   // 11:59:59 pm in Manila
  assert.equal(calc.manilaDay('2026-10-06T16:00:00Z'), '2026-10-07');   // midnight in Manila
  assert.equal(calc.manilaDay('2026-10-05T16:00:00Z'), '2026-10-06');
});

test("UT-06 T-REQ-04 today's numbers: cancelled and other days' orders are left out, open orders from any day are counted", () => {
  const now = new Date('2026-10-06T07:00:00Z');   // 3 pm in Manila
  const orders = [
    order({ how: 'delivery', address: 'Bay', deliveryFee: 50, items: [item('Matcha latte', '16oz', true, 2)] }),          // today, unpaid: 410 + 50
    order({ status: 'done', paid: true, paidBy: 'cash', items: [item('Hor-jicha', '12oz', false, 1)] }),                  // today, paid: 200
    order({ status: 'cancelled', items: [item('Hor-jicha', '12oz', false, 5)] }),                                         // today, cancelled
    order({ createdAt: '2026-10-05T15:59:00Z', items: [item('Hojicha latte', '12oz', false, 3)] }),                       // 11:59 pm yesterday, still open
    order({ createdAt: '2026-10-05T16:00:00Z', status: 'done', paid: true, paidBy: 'bank', items: [item('Hojicha latte', '12oz', false, 1)] }), // midnight today
  ];
  assert.deepEqual(calc.todayStats(orders, now), { orders: 3, sales: 410 + 200 + 150, unpaid: 460, cups: 2 + 1 + 1, open: 2 });
});

test('UT-07 T-REQ-03 the driver message has the address, the drinks and exactly what to collect', () => {
  const o = order({
    no: 107, how: 'delivery', customer: 'Paolo M.', contact: '0900 000 0001', address: '12 Sample St., Bay', deliveryFee: 50,
    notes: 'Gate is blue', items: [item('Matcha latte', '16oz', true, 2), item('Hor-jicha', '12oz', false, 1)],
  });
  assert.equal(calc.driverMessage(o), [
    'mirou matcha · order #107',
    'For: Paolo M.',
    'Contact: 0900 000 0001',
    'Address: 12 Sample St., Bay',
    '• 2× Matcha latte (16 oz, oatmilk)',
    '• 1× Hor-jicha (12 oz)',
    'Collect: ₱660 (drinks ₱610 + delivery ₱50)',
    'Notes: Gate is blue',
  ].join('\n'));
  const paid = calc.driverMessage({ ...o, paid: true, paidBy: 'gcash', deliveryFee: 0, contact: '', notes: '' });
  assert.match(paid, /Paid already by GCash: nothing to collect$/);
  assert.doesNotMatch(paid, /Contact:|Notes:|Collect:/);
});

test('UT-08 T-REQ-01 an order is only saved with a name, a drink, an address for delivery, a fee of 0 or more, and how it was paid', () => {
  assert.deepEqual(calc.problemsWith(order()), []);
  assert.deepEqual(calc.problemsWith(order({ customer: '  ' })), ["Add the customer's name."]);
  assert.deepEqual(calc.problemsWith(order({ items: [] })), ['Add at least one drink.']);
  assert.deepEqual(calc.problemsWith(order({ how: 'delivery', address: '' })), ['Add the delivery address.']);
  assert.deepEqual(calc.problemsWith(order({ deliveryFee: -5 })), ['The delivery fee must be a whole number of pesos (0 or more).']);
  assert.deepEqual(calc.problemsWith(order({ deliveryFee: 12.5 })), ['The delivery fee must be a whole number of pesos (0 or more).']);
  assert.deepEqual(calc.problemsWith(order({ paid: true, paidBy: null })), ['Choose how it was paid.']);
  assert.deepEqual(calc.problemsWith(order({ items: [{ ...item('Matcha latte', '12oz', false, 1), qty: 100 }] })), ['Each drink needs a quantity from 1 to 99.']);
});

test('UT-09 T-REQ-01 quantities stay from 1 to 99 (same rule as the website)', () => {
  assert.deepEqual(['5', '0', '', 'abc', '150', 99, -3].map(calc.toQty), [5, 1, 1, 1, 99, 99, 1]);
});

test('UT-10 money is shown in pesos with thousands separators', () => {
  assert.equal(calc.peso(0), '₱0');
  assert.equal(calc.peso(16280), '₱16,280');
});

test('UT-11 T-REQ-11 the backup file has one row per order, oldest first, with the right totals', () => {
  const csv = calc.ordersCsv([
    order({ no: 102, createdAt: '2026-10-06T05:30:00Z', how: 'delivery', address: '12 Sample St., Bay', deliveryFee: 50,
      paid: true, paidBy: 'gcash', status: 'done', items: [item('Matcha latte', '16oz', true, 2)] }),
    order({ no: 101, createdAt: '2026-10-05T16:05:00Z' }),   // 12:05 am on 6 Oct in Manila
  ]);
  assert.ok(csv.startsWith('﻿'), 'starts with the marker Excel needs for ₱');
  const lines = csv.slice(1).trimEnd().split('\r\n');
  assert.equal(lines[0], 'Order,Date,Time,Customer,Contact,Pick up or delivery,Address,Drinks,Cups,Drinks total,Delivery fee,Total,Status,Paid,Paid by,Notes');
  assert.equal(lines[1], '101,2026-10-06,00:05,Ana R.,,Pick up,,1× Matcha latte (12 oz),1,160,0,160,New,No,,');
  assert.equal(lines[2], '102,2026-10-06,13:30,Ana R.,,Delivery,"12 Sample St., Bay","2× Matcha latte (16 oz, oatmilk)",2,410,50,460,Done,Yes,GCash,');
  assert.equal(lines.length, 3);
});

test('UT-12 T-REQ-11 security: text in the backup can never run as a spreadsheet formula, and quotes or line breaks stay in their cell', () => {
  const csv = calc.ordersCsv([order({ customer: '=HYPERLINK("http://example.com","Click")', notes: 'Line 1\nSay "hi"', contact: '+63 900 000 0001' })]);
  const row = csv.slice(1).split('\r\n')[1];
  assert.ok(row.includes(`"'=HYPERLINK(""http://example.com"",""Click"")"`), 'a leading = gets a protective apostrophe');
  assert.ok(row.includes(`'+63 900 000 0001`), 'a leading + gets one too');
  assert.ok(row.endsWith(`"Line 1\nSay ""hi"""`), 'quotes are doubled and the line break stays inside the quoted cell');
});

test('UT-13 T-REQ-11 the backup reminder counts whole days since the last backup', () => {
  const now = new Date('2026-10-13T07:00:00Z');
  assert.equal(calc.daysSince(null, now), null);
  assert.equal(calc.daysSince('2026-10-06T07:00:00Z', now), 7);
  assert.equal(calc.daysSince('2026-10-06T07:00:01Z', now), 6);
});

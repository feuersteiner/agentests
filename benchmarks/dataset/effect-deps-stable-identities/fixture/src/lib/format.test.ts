import { expect, test } from 'bun:test';
import { formatDate, formatLastActive, formatMonth, formatSeats, planLabel, roleLabel, statusLabel } from './format';

test('formatDate shows day, month and year', () => {
  expect(formatDate('2026-03-03T10:00:00Z')).toBe('3 Mar 2026');
});

test('formatMonth shows month and year', () => {
  expect(formatMonth('2026-11-20T00:00:00Z')).toBe('Nov 2026');
});

test('formatLastActive shows the date of the last sign-in', () => {
  expect(formatLastActive('2026-10-31T23:59:00Z')).toBe('31 Oct 2026');
});

test('formatSeats counts seats', () => {
  expect(formatSeats(12)).toBe('12 seats');
  expect(formatSeats(0)).toBe('0 seats');
});

test('planLabel names each plan', () => {
  expect(planLabel('starter')).toBe('Starter');
  expect(planLabel('enterprise')).toBe('Enterprise');
});

test('statusLabel names active and trial organizations', () => {
  expect(statusLabel('active')).toBe('Active');
  expect(statusLabel('trial')).toBe('Trial');
});

test('roleLabel names each role', () => {
  expect(roleLabel('owner')).toBe('Owner');
  expect(roleLabel('member')).toBe('Member');
});

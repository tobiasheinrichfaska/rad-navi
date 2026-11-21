import { describe, expect, it } from 'vitest';
import { DEAD_ZONE, turnAngle, wheelSteps } from '../../src/logic/scroll.ts';

describe('wheelSteps', () => {
  it('turns one page per mouse notch, either way', () => {
    expect(wheelSteps(0, 100, 0)).toEqual({ steps: 1, rest: 0 });
    expect(wheelSteps(0, -100, 0)).toEqual({ steps: -1, rest: 0 });
  });
  it('counts a Firefox notch (3 lines) as one page', () => {
    expect(wheelSteps(0, 3, 1).steps).toBe(1);
  });
  it('adds up fine touchpad deltas', () => {
    let rest = 0;
    let total = 0;
    for (let i = 0; i < 10; i++) {
      const r = wheelSteps(rest, 25, 0);
      rest = r.rest;
      total += r.steps;
    }
    expect(total).toBe(2);
    expect(rest).toBe(50);
  });
  it('drops the leftover when the direction changes', () => {
    expect(wheelSteps(80, -30, 0)).toEqual({ steps: 0, rest: -30 });
  });
  it('turns several pages for a big jump', () => {
    expect(wheelSteps(0, 250, 0).steps).toBe(2);
  });
});

describe('turnAngle', () => {
  it('scrolling down turns the right half anticlockwise, the left half clockwise', () => {
    expect(turnAngle(1, 50, 0.5)).toBe(-0.5);
    expect(turnAngle(1, -50, 0.5)).toBe(0.5);
  });
  it('scrolling up reverses it', () => {
    expect(turnAngle(-2, 50, 0.5)).toBe(1);
  });
  it('turns nothing on the middle line', () => {
    expect(turnAngle(1, 0, 0.5)).toBe(0);
    expect(turnAngle(1, DEAD_ZONE - 1, 0.5)).toBe(0);
    expect(turnAngle(1, -(DEAD_ZONE - 1), 0.5)).toBe(0);
  });
  it('turns nothing for zero steps', () => {
    expect(turnAngle(0, 50, 0.5)).toBe(0);
  });
});

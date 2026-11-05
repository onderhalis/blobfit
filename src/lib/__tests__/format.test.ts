import {
  formatLoad,
  formatVolume,
  fromDisplayLoad,
  greeting,
  percent,
  plural,
  prescription,
  toDisplayLoad,
} from '../format';

describe('format', () => {
  it('pluralises', () => {
    expect(plural(1, 'set')).toBe('1 set');
    expect(plural(3, 'set')).toBe('3 sets');
  });

  it('describes prescriptions by measure and side', () => {
    expect(prescription({ exerciseId: 'squat', sets: 3, target: 10 })).toBe('3 sets × 10 reps');
    expect(prescription({ exerciseId: 'plank', sets: 2, target: 20 })).toBe('2 sets × 20 sec');
    expect(prescription({ exerciseId: 'row', sets: 3, target: 10 })).toBe('3 sets × 10 reps each side');
  });

  it('converts loads between units without drift', () => {
    expect(formatLoad(null, 'kg')).toBe('Bodyweight');
    expect(formatLoad(8, 'kg')).toBe('8 kg');
    expect(formatLoad(8, 'lb')).toBe('17.5 lb');
    expect(toDisplayLoad(fromDisplayLoad(20, 'lb'), 'lb')).toBe(20);
    expect(fromDisplayLoad(12.5, 'kg')).toBe(12.5);
    expect(formatVolume(1000, 'kg')).toBe('1,000 kg');
  });

  it('greets by time of day', () => {
    expect(greeting(new Date(2026, 9, 17, 8))).toBe('Good morning,');
    expect(greeting(new Date(2026, 9, 17, 14))).toBe('Good afternoon,');
    expect(greeting(new Date(2026, 9, 17, 21))).toBe('Good evening,');
  });

  it('formats percentages', () => {
    expect(percent(2 / 3)).toBe('67%');
  });
});

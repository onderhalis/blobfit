import { buildWorkout } from '../plan';
import {
  adherence,
  newBestsIn,
  personalBests,
  thenAndNow,
  todayStatus,
  totals,
  weekStreak,
  weekSummary,
  weeklyHistory,
} from '../progress';
import { createSession } from '../session';
import { at, completedSession, makePrefs } from './helpers';

// Plan starts Monday 5 Oct 2026; training days Mon / Wed / Fri.
const prefs = makePrefs();

describe('brand-new user', () => {
  const now = at(2026, 10, 5, 12);

  it('shows empty, honest numbers', () => {
    expect(totals([])).toEqual({ sessions: 0, sets: 0, reps: 0, seconds: 0, volumeKg: 0, activeMinutes: 0 });
    expect(personalBests([])).toEqual([]);
    expect(thenAndNow([])).toEqual([]);
    expect(weekStreak(prefs, [], now)).toBe(0);
  });

  it('does not report adherence before any scheduled day has passed', () => {
    expect(adherence(prefs, [], now)).toEqual({ credited: 0, scheduled: 0, ratio: null });
  });

  it('is due workout A today', () => {
    const status = todayStatus(prefs, [], now);
    expect(status.kind).toBe('train');
    expect(status.workout.id).toBe('A');
  });
});

describe('weekSummary', () => {
  it('marks done, missed, planned, rest and extra days', () => {
    const sessions = [
      completedSession(at(2026, 10, 12, 18)), // Mon
      completedSession(at(2026, 10, 13, 18), { workoutId: 'B' }), // Tue (rest day, extra)
    ];
    const week = weekSummary(prefs, sessions, at(2026, 10, 16, 10)); // Fri morning
    expect(week.days.map((day) => day.status)).toEqual([
      'done',
      'extra',
      'missed',
      'rest',
      'planned',
      'rest',
      'rest',
    ]);
    expect(week.days[4].isToday).toBe(true);
    expect(week.done).toBe(2);
    expect(week.target).toBe(3);
    expect(week.weekNumber).toBe(2);
  });

  it('has no target when the plan starts after the last training day of the week', () => {
    const saturday = makePrefs({ planStartedAt: at(2026, 10, 10).toISOString() });
    const week = weekSummary(saturday, [], at(2026, 10, 10, 12));
    expect(week.target).toBe(0);
    expect(week.days.every((day) => day.status === 'rest')).toBe(true);
    expect(adherence(saturday, [], at(2026, 10, 11)).ratio).toBeNull();
    expect(weekStreak(saturday, [], at(2026, 10, 11))).toBe(0);
  });

  it('does not schedule days before the plan started', () => {
    const late = makePrefs({ planStartedAt: at(2026, 10, 8).toISOString() }); // Thursday
    const week = weekSummary(late, [], at(2026, 10, 8));
    expect(week.target).toBe(1); // only Friday remains
    expect(week.days[0].status).toBe('rest');
    expect(week.weekNumber).toBe(1);
  });
});

describe('adherence', () => {
  it('compares completed sessions with scheduled days that have passed', () => {
    const sessions = [completedSession(at(2026, 10, 5, 18)), completedSession(at(2026, 10, 9, 18))];
    // Saturday: Mon, Wed, Fri scheduled; Mon + Fri done.
    expect(adherence(prefs, sessions, at(2026, 10, 10))).toEqual({ credited: 2, scheduled: 3, ratio: 2 / 3 });
  });

  it('does not penalise a training day before it has been trained', () => {
    const sessions = [completedSession(at(2026, 10, 5, 18))];
    // Wednesday morning: only Monday counts so far.
    expect(adherence(prefs, sessions, at(2026, 10, 7, 7)).ratio).toBe(1);
    // Wednesday evening after training: both count.
    const wed = completedSession(at(2026, 10, 7, 17));
    expect(adherence(prefs, [...sessions, wed], at(2026, 10, 7, 19))).toMatchObject({ credited: 2, scheduled: 2 });
  });

  it('never exceeds 100% from extra sessions', () => {
    const sessions = [
      completedSession(at(2026, 10, 5, 7)),
      completedSession(at(2026, 10, 5, 18)),
      completedSession(at(2026, 10, 6, 18)),
    ];
    expect(adherence(prefs, sessions, at(2026, 10, 7, 7)).ratio).toBe(1);
  });

  it('credits a session moved to a rest day', () => {
    const tuesday = [completedSession(at(2026, 10, 6, 18))];
    expect(adherence(prefs, tuesday, at(2026, 10, 7, 7)).ratio).toBe(1);
  });
});

describe('weekStreak', () => {
  const fullWeek = (mon: number) => [
    completedSession(at(2026, 10, mon, 18)),
    completedSession(at(2026, 10, mon + 2, 18), { workoutId: 'B' }),
    completedSession(at(2026, 10, mon + 4, 18)),
  ];

  it('counts consecutive weeks that met the target', () => {
    const sessions = [...fullWeek(5), ...fullWeek(12)];
    // Monday of week 3, nothing done yet: in-progress week does not break the streak.
    expect(weekStreak(prefs, sessions, at(2026, 10, 19, 7))).toBe(2);
  });

  it('adds the current week once its target is met', () => {
    const sessions = [...fullWeek(5), ...fullWeek(12)];
    expect(weekStreak(prefs, sessions, at(2026, 10, 17))).toBe(2);
    expect(weekStreak(prefs, fullWeek(5), at(2026, 10, 9, 20))).toBe(1);
  });

  it('breaks on a past week below target', () => {
    const sessions = [...fullWeek(5), completedSession(at(2026, 10, 12, 18)), ...fullWeek(19)];
    expect(weekStreak(prefs, sessions, at(2026, 10, 24))).toBe(1);
  });
});

describe('personal bests and then/now', () => {
  const first = completedSession(at(2026, 10, 5, 18), { values: 6, loadKg: 6 });
  const second = completedSession(at(2026, 10, 9, 18), { values: 8, loadKg: 8 });

  it('records best reps and best load per exercise', () => {
    const bests = personalBests([first, second]);
    const row = bests.find((best) => best.exerciseId === 'row');
    expect(row?.bestValue.value).toBe(8);
    expect(row?.bestLoad?.loadKg).toBe(8);
    expect(row?.sessions).toBe(2);
    const squat = bests.find((best) => best.exerciseId === 'squat');
    expect(squat?.bestLoad).toBeNull();
  });

  it('detects new bests against earlier sessions only', () => {
    expect(newBestsIn(first, [first])).toEqual([]);
    const news = newBestsIn(second, [first, second]);
    expect(news).toEqual(
      expect.arrayContaining([
        { exerciseId: 'squat', kind: 'value', value: 8, loadKg: null },
        { exerciseId: 'row', kind: 'load', value: 8, loadKg: 8 },
      ]),
    );
  });

  it('compares the first and latest logged best set', () => {
    const rows = thenAndNow([second, first]);
    expect(rows.map((row) => row.exerciseId)).toEqual(['incline-push-up', 'row', 'squat']);
    const row = rows.find((item) => item.exerciseId === 'row');
    expect(row?.first).toMatchObject({ value: 6, loadKg: 6 });
    expect(row?.latest).toMatchObject({ value: 8, loadKg: 8 });
  });

  it('needs two sessions before comparing', () => {
    expect(thenAndNow([first])).toEqual([]);
  });

  it('sums totals from logs only', () => {
    const t = totals([first, second]);
    expect(t.sessions).toBe(2);
    expect(t.sets).toBe(18);
    expect(t.reps).toBe(9 * 6 + 9 * 8);
    expect(t.volumeKg).toBe(3 * 6 * 6 + 3 * 8 * 8);
    expect(t.activeMinutes).toBe(40);
  });
});

describe('weeklyHistory', () => {
  it('starts at the plan week and ends with the current week', () => {
    const history = weeklyHistory(prefs, [completedSession(at(2026, 10, 12, 18))], at(2026, 10, 17));
    expect(history).toHaveLength(2);
    expect(history.map((entry) => entry.done)).toEqual([0, 1]);
    expect(history.map((entry) => entry.target)).toEqual([3, 3]);
  });
});

describe('todayStatus', () => {
  it('reports rest days with the next training day', () => {
    const status = todayStatus(prefs, [], at(2026, 10, 13));
    expect(status.kind).toBe('rest');
    if (status.kind === 'rest') {
      expect(status.nextDay.getDate()).toBe(14);
    }
  });

  it('reports a finished day and queues the next workout', () => {
    const status = todayStatus(prefs, [completedSession(at(2026, 10, 12, 8))], at(2026, 10, 12, 20));
    expect(status.kind).toBe('done');
    expect(status.workout.id).toBe('B');
  });

  it('prioritises an open session', () => {
    const open = createSession(buildWorkout('B', prefs), { id: 'o', now: at(2026, 10, 13), history: [] });
    const status = todayStatus(prefs, [open], at(2026, 10, 13, 10));
    expect(status.kind).toBe('in-progress');
    expect(status.workout.id).toBe('B');
  });
});

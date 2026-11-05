// Content rules for data/exercises.json, shared by the CLI (validate-exercises.mjs) and the unit tests.
'use strict';

const MUSCLES = [
  'chest',
  'front shoulders',
  'side shoulders',
  'rear shoulders',
  'biceps',
  'triceps',
  'grip',
  'core',
  'obliques',
  'upper back',
  'back',
  'lower back',
  'glutes',
  'outer hips',
  'quadriceps',
  'adductors',
  'hamstrings',
  'calves',
];
const PATTERNS = ['squat', 'lunge', 'hinge', 'push', 'pull', 'core', 'arms'];
const BODY_AREAS = ['Lower Body', 'Upper Body', 'Core'];
const VIEWS = ['side', 'front', 'back', 'above'];
const EQUIPMENT = ['dumbbells', 'band'];

/** Longest allowed text per field, so copy stays phone-sized. */
const LIMITS = {
  name: 32,
  summary: 80,
  startingPosition: 240,
  step: 160,
  phaseLabel: 16,
  phaseText: 180,
  cue: 70,
  breathing: 160,
  check: 180,
  mistakeTitle: 36,
  looksLike: 180,
  why: 150,
  fix: 180,
  mistakeCue: 40,
  safety: 180,
  frameLabel: 16,
  pose: 220,
};

/** Returns a list of problems; empty when the exercises are valid. */
function validateExercises(exercises, { knownIds = [], partial = false } = {}) {
  const problems = [];
  const ids = new Set(exercises.map((e) => e.id));
  const all = new Set([...ids, ...knownIds]);
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const fail = (id, message) => problems.push(`${id}: ${message}`);
  const text = (id, field, value, max) => {
    if (typeof value !== 'string' || value.trim().length === 0) {
      fail(id, `${field} must be non-empty text`);
    } else if (value.length > max) {
      fail(id, `${field} is ${value.length} chars (max ${max}): "${value.slice(0, 50)}…"`);
    } else if (/\s{2,}|^\s|\s$/.test(value)) {
      fail(id, `${field} has stray whitespace`);
    }
  };
  const list = (id, field, value, min, max, check) => {
    if (!Array.isArray(value) || value.length < min || value.length > max) {
      fail(id, `${field} needs ${min}–${max} items`);
      return;
    }
    value.forEach((item, i) => check(item, `${field}[${i}]`));
  };

  if (new Set(exercises.map((e) => e.id)).size !== exercises.length) {
    problems.push('duplicate ids');
  }
  for (const e of exercises) {
    const id = e.id ?? '(no id)';
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) fail(id, 'id must be kebab-case');
    text(id, 'name', e.name, LIMITS.name);
    text(id, 'summary', e.summary, LIMITS.summary);
    text(id, 'equipment', e.equipment, 60);
    text(id, 'startingPosition', e.startingPosition, LIMITS.startingPosition);
    text(id, 'breathing', e.breathing, LIMITS.breathing);
    if (!PATTERNS.includes(e.pattern)) fail(id, `pattern must be one of ${PATTERNS.join(', ')}`);
    if (!BODY_AREAS.includes(e.bodyArea)) fail(id, 'bodyArea is not valid');
    if (![1, 2, 3].includes(e.level)) fail(id, 'level must be 1, 2 or 3');
    if (!['reps', 'seconds'].includes(e.measure)) fail(id, 'measure must be reps or seconds');
    if (typeof e.loadable !== 'boolean' || typeof e.perSide !== 'boolean') fail(id, 'loadable and perSide must be booleans');
    if (!Array.isArray(e.requires) || e.requires.some((item) => !EQUIPMENT.includes(item))) fail(id, 'requires must list dumbbells and/or band');
    if (e.loadable && !e.requires?.includes('dumbbells')) fail(id, 'only dumbbell exercises are loadable (load is logged in kg/lb)');
    if (e.loadable && e.measure !== 'reps') fail(id, 'loadable exercises are measured in reps');
    if (e.reviewStatus !== 'needs-qualified-review') fail(id, 'reviewStatus must stay needs-qualified-review');
    list(id, 'primaryMuscles', e.primaryMuscles, 1, 3, (m, f) => MUSCLES.includes(m) || fail(id, `${f} "${m}" is not in the muscle list`));
    list(id, 'secondaryMuscles', e.secondaryMuscles, 0, 4, (m, f) => MUSCLES.includes(m) || fail(id, `${f} "${m}" is not in the muscle list`));
    if (e.primaryMuscles?.some((m) => e.secondaryMuscles?.includes(m))) fail(id, 'a muscle is both primary and secondary');
    list(id, 'steps', e.steps, 3, 6, (s, f) => text(id, f, s, LIMITS.step));
    list(id, 'phases', e.phases, 1, 3, (p, f) => {
      text(id, `${f}.label`, p?.label, LIMITS.phaseLabel);
      text(id, `${f}.text`, p?.text, LIMITS.phaseText);
    });
    list(id, 'cues', e.cues, 3, 5, (c, f) => text(id, f, c, LIMITS.cue));
    list(id, 'formChecks', e.formChecks, 2, 4, (c, f) => {
      if (!VIEWS.includes(c?.view)) fail(id, `${f}.view must be one of ${VIEWS.join(', ')}`);
      text(id, `${f}.check`, c?.check, LIMITS.check);
    });
    list(id, 'mistakes', e.mistakes, 3, 4, (m, f) => {
      if (!VIEWS.includes(m?.view)) fail(id, `${f}.view must be one of ${VIEWS.join(', ')}`);
      text(id, `${f}.title`, m?.title, LIMITS.mistakeTitle);
      text(id, `${f}.looksLike`, m?.looksLike, LIMITS.looksLike);
      text(id, `${f}.why`, m?.why, LIMITS.why);
      text(id, `${f}.fix`, m?.fix, LIMITS.fix);
      text(id, `${f}.cue`, m?.cue, LIMITS.mistakeCue);
      if (m?.cue && m.cue.toLowerCase() === m.title?.toLowerCase()) fail(id, `${f}.cue repeats the title`);
    });
    list(id, 'safety', e.safety, 1, 3, (s, f) => text(id, f, s, LIMITS.safety));
    if (!VIEWS.includes(e.artBrief?.view)) fail(id, 'artBrief.view is not valid');
    list(id, 'artBrief.frames', e.artBrief?.frames, 2, 2, (fr, f) => {
      text(id, `${f}.label`, fr?.label, LIMITS.frameLabel);
      text(id, `${f}.pose`, fr?.pose, LIMITS.pose);
    });
    text(id, 'easier', e.easier, 60);
    text(id, 'harder', e.harder, 60);
    for (const key of ['easierId', 'harderId']) {
      const target = e[key];
      if (target === undefined) continue;
      if (target === id) fail(id, `${key} points at itself`);
      else if (!all.has(target)) fail(id, `${key} "${target}" does not exist`);
      const linked = byId.get(target);
      if (linked) {
        const label = key === 'easierId' ? e.easier : e.harder;
        if (label.toLowerCase() !== linked.name.toLowerCase()) fail(id, `${key === 'easierId' ? 'easier' : 'harder'} should read "${linked.name}"`);
        if (key === 'easierId' && linked.level > e.level) fail(id, `easier variation ${target} has a higher level`);
        if (key === 'harderId' && linked.level < e.level) fail(id, `harder variation ${target} has a lower level`);
      }
    }
    // Banned claims: no injury promises, no medical outcomes, no hype (whole words, so "secure" is fine).
    const blob = JSON.stringify(e).toLowerCase();
    for (const claim of [/prevents? injur/, /injury[- ]proof/, /guarantee/, /\bcur(e|es|ed)\b/, /burns? fat/, /fat[- ]burn/, /\bton(e|ed|ing)\b/, /\bsculpt/]) {
      if (claim.test(blob)) fail(id, `avoid the claim ${claim}`);
    }
  }
  if (!partial) {
    if (exercises.length < 40) problems.push(`catalog has ${exercises.length} exercises; at least 40 are required`);
    for (const pattern of PATTERNS) {
      const count = exercises.filter((e) => e.pattern === pattern).length;
      if (count < 4) problems.push(`pattern ${pattern} has ${count} exercises; at least 4 are required`);
    }
  }
  return problems;
}

module.exports = { MUSCLES, PATTERNS, LIMITS, validateExercises };

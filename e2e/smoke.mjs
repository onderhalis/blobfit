// End-to-end smoke test of the exported web build on a phone-sized viewport.
// Drives the real UI: onboarding → plan → workouts logged over several (simulated) days → progress,
// with relaunches in between to prove local persistence. Screenshots land in e2e-output/.
//
//   npm run build:web && npm run e2e
//   E2E_VIEWPORT=320x568 E2E_OUT=e2e-output/320 npm run e2e    # smallest supported phone
//   E2E_BASE_PATH=/blobfit npm run e2e                           # a build exported for a sub-path (GitHub Pages)
//   E2E_REMOTE_URL=https://onderhalis.github.io/blobfit npm run e2e   # the published preview, no local server
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

import { startServer } from './serve.mjs';

const OUT = process.env.E2E_OUT ?? 'e2e-output';
const [VIEW_W, VIEW_H] = (process.env.E2E_VIEWPORT ?? '390x844').split('x').map(Number);
const REMOTE = process.env.E2E_REMOTE_URL?.replace(/\/$/, '');
const BASE = REMOTE ?? `http://localhost:${process.env.PORT ?? 8099}${process.env.E2E_BASE_PATH ?? ''}`;
mkdirSync(OUT, { recursive: true });

const executablePath = process.env.CHROMIUM_PATH ?? (process.env.PLAYWRIGHT_BROWSERS_PATH ? '/opt/pw-browsers/chromium' : undefined);

/** Local wall-clock times (the app's calendar logic is local-time). Oct 2026: 5th, 12th and 19th are Mondays. */
const at = (day, hour, minute = 0) => new Date(2026, 9, day, hour, minute);

const server = REMOTE ? null : await startServer();
const browser = await chromium.launch({ executablePath });
const context = await browser.newContext({
  viewport: { width: VIEW_W, height: VIEW_H },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
page.on('console', (msg) => {
  if (msg.type() === 'error') {
    errors.push(`console: ${msg.text()}`);
  }
});

const byId = (id) => page.getByTestId(id);
const shot = async (name) => {
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false });
  await page.screenshot({ path: `${OUT}/${name}-full.png`, fullPage: true });
};
const step = (label) => console.log(`• ${label}`);
/** Navigation must never stack a second copy of the tab navigator. */
const assertSingleTabBar = async () => {
  await byId('tab-home').first().waitFor();
  await page.waitForTimeout(300);
  assert.equal(await byId('tab-home').count(), 1, 'exactly one tab bar mounted');
};

async function goTo(time, path = '/') {
  await page.clock.setSystemTime(time);
  await page.clock.resume();
  await page.goto(`${BASE}${path}`);
  await page.waitForLoadState('networkidle');
}

async function logWorkout({ startTime, reps = 0, load = 0, effort = null, expectHistory = false }) {
  await goTo(startTime, '/plan');
  await byId('plan-start').click();
  await byId('workout').waitFor();
  if (expectHistory) {
    // Every exercise explains today's target from what was logged last time.
    await page.getByTestId('workout').getByText(/^Last time \(/).first().waitFor();
  }
  // Mark every set of every exercise done, optionally adding reps / load first.
  const doneButtons = page.locator('[data-testid$="-done"]');
  const count = await doneButtons.count();
  for (let i = 0; i < count; i += 1) {
    const id = await doneButtons.nth(i).getAttribute('data-testid');
    const prefix = id.replace(/-done$/, '');
    for (let r = 0; r < reps; r += 1) {
      await byId(`${prefix}-value-plus`).click();
    }
    if (load > 0 && (await byId(`${prefix}-load-plus`).count()) > 0) {
      for (let l = 0; l < load; l += 1) {
        await byId(`${prefix}-load-plus`).click();
      }
    }
    await doneButtons.nth(i).click();
  }
  if (effort) {
    const chips = page.locator(`[data-testid^="effort-"][data-testid$="-${effort}"]`);
    const chipCount = await chips.count();
    assert.ok(chipCount > 0, 'effort question appears after the last set');
    for (let i = 0; i < chipCount; i += 1) {
      await chips.nth(i).click();
    }
  }
  await page.clock.setSystemTime(new Date(startTime.getTime() + 21 * 60_000));
  await byId('finish-workout').click();
  await byId('session-summary').waitFor();
}

try {
  await page.clock.install({ time: at(5, 8) });
  await page.clock.resume();

  step('first launch shows onboarding');
  await goTo(at(5, 8));
  await byId('onboarding').waitFor();
  await shot('02-onboarding-goal');
  assert.equal(await byId('onboarding-continue').getAttribute('aria-disabled'), 'true', 'continue disabled before a goal');

  step('complete onboarding');
  await byId('goal-build-muscle').click();
  await shot('02-onboarding-goal-selected');
  await byId('onboarding-continue').click();
  await byId('experience-new').click();
  await shot('02b-onboarding-experience');
  await byId('onboarding-continue').click();
  await shot('02c-onboarding-days');
  await byId('onboarding-continue').click();
  await byId('equipment-dumbbells').click();
  await byId('accept-disclaimer').click();
  await shot('02d-onboarding-equipment');
  await byId('onboarding-continue').click();
  await byId('home').waitFor();
  await shot('01-home-new-user');

  step('onboarding persists across relaunch');
  await goTo(at(5, 9));
  await byId('home').waitFor();

  step('brand-new progress shows the empty state, no fake numbers');
  await byId('tab-progress').click();
  await byId('progress').waitFor();
  await byId('progress').getByText('No workouts logged yet').waitFor();
  await shot('05-progress-empty');

  step('plan + exercise detail');
  await byId('tab-plan').click();
  await byId('plan').waitFor();
  await shot('03-plan');
  await byId('plan-exercise-incline-push-up').click();
  await byId('exercise-detail').waitFor();
  await byId('exercise-detail').getByText('Content review pending').first().waitFor();
  await shot('04-exercise-incline-push-up');
  await goTo(at(5, 9), '/exercise/push-up');
  await byId('exercise-detail').waitFor();
  await shot('04-exercise-push-up');

  step('log session 1 (Mon) end to end');
  await logWorkout({ startTime: at(5, 18), effort: 'right' });
  await byId('session-summary').getByText(/^Next time:/).first().waitFor();
  await shot('06-session-summary');
  await byId('summary-done').click();
  await byId('progress').waitFor();
  await assertSingleTabBar();
  await byId('progress').getByText('1 in last 30 days').waitFor();

  step('log sessions 2–4 on later days with a little more each time');
  await logWorkout({ startTime: at(7, 18), reps: 1, load: 2, expectHistory: true });
  await byId('summary-done').click();
  await logWorkout({ startTime: at(9, 18), reps: 1, load: 4 });
  await byId('summary-done').click();
  await logWorkout({ startTime: at(12, 18), reps: 2, load: 6 });
  await shot('06b-session-summary-bests');
  await byId('summary-done').click();
  await assertSingleTabBar();

  step('progress reflects only the logged sessions, after relaunch');
  await goTo(at(14, 8), '/progress');
  await byId('progress').waitFor();
  await byId('progress').getByText('4 workouts logged').waitFor();
  await byId('progress-calendar').waitFor();
  await shot('05-progress');

  step('home on a training day with history');
  await goTo(at(14, 8), '/');
  await byId('home').waitFor();
  await byId('home-up-next').getByText(/from last time/).first().waitFor();
  await shot('01-home');

  step('plan mid-week');
  await goTo(at(14, 8), '/plan');
  await shot('03-plan-midweek');

  step('workout logging screen');
  await byId('plan-start').click();
  await byId('workout').waitFor();
  await page.waitForTimeout(4000);
  const firstDone = page.locator('[data-testid$="-done"]').first();
  await firstDone.click();
  await page.waitForTimeout(1500);
  await shot('07-workout-logging');
  await byId('pause-workout').click();
  await shot('07b-workout-paused');
  await byId('pause-workout').click();
  await byId('discard-workout').click();
  await byId('confirm-dialog-confirm').click();
  await byId('home').waitFor();
  await assertSingleTabBar();

  step('edit preferences from More');
  await byId('tab-more').click();
  await byId('more').waitFor();
  await shot('08-more');
  await byId('more-preferences').click();
  await byId('preferences').waitFor();
  await byId('save-preferences').click();
  await byId('more').waitFor();

  step('library');
  await byId('more-library').click();
  await byId('library').waitFor();
  await shot('09-library');

  step('a failed save is surfaced and can be retried');
  await goTo(at(14, 9), '/more');
  await byId('more').waitFor();
  await page.evaluate(() => {
    window.__realSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    };
  });
  await page.getByRole('radio', { name: 'Pounds' }).click();
  await byId('save-error').waitFor();
  await shot('10-save-error');
  await page.evaluate(() => {
    Storage.prototype.setItem = window.__realSetItem;
  });
  await page.getByRole('button', { name: 'Try saving again' }).click();
  await byId('save-error').waitFor({ state: 'detached' });
  await page.reload();
  await byId('more').waitFor();
  assert.equal(await page.getByRole('radio', { name: 'Pounds' }).getAttribute('aria-checked'), 'true', 'units saved after retry');

  step('a plan started on a Saturday explains when it begins (fresh device)');
  const weekend = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const wp = await weekend.newPage();
  wp.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  await wp.clock.install({ time: at(17, 11) });
  await wp.clock.resume();
  await wp.goto(`${BASE}/`);
  await wp.getByTestId('goal-get-stronger').click();
  await wp.getByTestId('onboarding-continue').click();
  await wp.getByTestId('experience-returning').click();
  await wp.getByTestId('onboarding-continue').click();
  await wp.getByTestId('onboarding-continue').click();
  await wp.getByTestId('accept-disclaimer').click();
  await wp.getByTestId('onboarding-continue').click();
  await wp.getByTestId('home').getByText('Your first planned session is Monday.', { exact: false }).waitFor();
  await wp.getByTestId('home').getByText('Rest day').waitFor();
  await wp.getByTestId('home').getByText('Next: Full Body A on Monday.').waitFor();
  await wp.waitForTimeout(400);
  await wp.screenshot({ path: `${OUT}/01-home-weekend-start.png` });
  await weekend.close();

  assert.deepEqual(errors, [], `browser errors:\n${errors.join('\n')}`);
  console.log(`\nSmoke test passed. Screenshots in ${OUT}/`);
} catch (error) {
  await page.screenshot({ path: `${OUT}/failure.png`, fullPage: true }).catch(() => undefined);
  console.error(errors.join('\n'));
  throw error;
} finally {
  await browser.close();
  server?.close();
}

// GitHub Pages has no rewrites: an unknown path is answered with 404.html and a 404 status.
// Give every app route its own index.html so deep links and reloads return 200. Session pages
// (ids created on the device) still fall back to 404.html, which loads the app the same way.
//
//   node tools/preview/route-pages.mjs dist
import { copyFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const dist = process.argv[2] ?? 'dist';
const exercises = JSON.parse(readFileSync('data/exercises.json', 'utf8'));
const routes = [
  'onboarding',
  'plan',
  'progress',
  'more',
  'workout',
  'library',
  'preferences',
  'about',
  ...exercises.map((exercise) => `exercise/${exercise.id}`),
];
for (const route of routes) {
  mkdirSync(join(dist, route), { recursive: true });
  copyFileSync(join(dist, 'index.html'), join(dist, route, 'index.html'));
}
copyFileSync(join(dist, 'index.html'), join(dist, '404.html'));
console.log(`Route pages: ${routes.length} + 404.html`);

// Checks exercise content against the coach-level schema in src/domain/types.ts.
//
//   node tools/content/validate-exercises.mjs                       # data/exercises.json, full catalog checks
//   node tools/content/validate-exercises.mjs part.json --known ids.txt   # a partial file; links may point at ids in ids.txt
//
// Exit code 1 with one line per problem. The unit tests run the same rules (exercise-rules.cjs).
import { readFileSync } from 'node:fs';

import rules from './exercise-rules.cjs';

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const knownAt = args.indexOf('--known');
  const knownIds = knownAt >= 0 ? readFileSync(args[knownAt + 1], 'utf8').split(/\s+/).filter(Boolean) : [];
  const file = args.find((arg, i) => !arg.startsWith('--') && i !== knownAt + 1) ?? 'data/exercises.json';
  const exercises = JSON.parse(readFileSync(file, 'utf8'));
  const problems = rules.validateExercises(exercises, { knownIds, partial: knownAt >= 0 });
  if (problems.length > 0) {
    console.error(problems.join('\n'));
    console.error(`\n${problems.length} problem(s) in ${file}`);
    process.exit(1);
  }
  console.log(`${file}: ${exercises.length} exercises OK`);
}

// Writes the illustrator's to-do list, generated from data/exercises.json and from what is already
// delivered in assets/exercises/:
//   docs/EXERCISE_ART_BRIEF.md          spec, delivery, checklist per exercise
//   docs/art-prompts/batch-<n>.md       one ready-to-paste sheet prompt per exercise with missing frames
//                                       (one image, figures in rows of up to three; tools/art/import_sheets.py cuts it up)
//
//   node tools/art/exercise-brief.mjs                # rewrite both
//   node tools/art/exercise-brief.mjs --check        # exit 1 if the committed files are out of date (npm run check)
//   node tools/art/exercise-brief.mjs --require-all  # exit 1 while any image is missing (release gate)
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const OUT = 'docs/EXERCISE_ART_BRIEF.md';
const PROMPTS = (batch) => `docs/art-prompts/batch-${batch}.md`;
const BRANCH = 'claude/zealous-cannon-9cvkob';
/** The exercises the beginner plan schedules (src/domain/plan.ts), drawn first. */
const PLAN = ['squat', 'incline-push-up', 'row', 'band-row', 'prone-y-raise', 'hip-hinge', 'plank'];
const VIEW = { side: 'side view', front: 'front view', back: 'back view', above: 'from above' };
const CAMERA = {
  side: 'side view, camera at hip height, looking straight at the side of the body',
  front: 'front view, camera at hip height, looking straight at the front of the body (the character faces the camera; not a side view)',
  back: 'back view, camera at hip height, looking straight at the back of the body',
  above: 'top-down view from directly above, looking straight down at the body (not a side view)',
};
const CHARACTER =
  'Same character as the BLOB FIT reference (base-character-sheet.png): a 3D soft-clay mascot with a warm cream-white, ' +
  'rounded, beginner-build body (soft, no visible muscles), two upright black pill-shaped eyes, no mouth, nose, hair or ears, ' +
  'wearing plain black athletic shorts.';
const SHEET =
  'One landscape image, at least 1536 x 1024 px (larger is better), as a PNG with a fully transparent background. ' +
  'Draw exactly the numbered figures listed below, no more and no fewer, in rows of up to three, read left to right, top row first. ' +
  'Leave clear empty space between the figures and around them; no figure touches the image edge or another figure. ' +
  'No grid lines, borders, labels, numbers, text, logos, arrows, ticks or crosses. ' +
  `Character in every figure: ${CHARACTER} Same character size, proportions and lighting in every figure. ` +
  'No floor, room or scenery; only a faint contact shadow under the body. Soft studio light from the upper left. ' +
  'Props are identical in every figure (same object, size, colour and placement): dumbbells are plain dark grey hexagonal dumbbells, ' +
  'a band is one plain muted grey resistance band, benches, chairs, boxes and steps are plain and neutral, a mat is a thin plain grey mat. No brand marks.';

const exercises = JSON.parse(readFileSync('data/exercises.json', 'utf8'));
const byId = new Map(exercises.map((e) => [e.id, e]));
const linked = new Set(PLAN.flatMap((id) => [byId.get(id)?.easierId, byId.get(id)?.harderId]).filter(Boolean));
const batchOf = (e) => (PLAN.includes(e.id) ? 1 : linked.has(e.id) || e.requires.length === 0 ? 2 : 3);
const equipment = (e) => (e.equipment === 'none' ? 'No equipment.' : `Equipment: ${e.equipment}.`);
const files = (e) => [
  ...e.artBrief.frames.map((frame, i) => ({
    name: i === 0 ? 'start.png' : 'end.png',
    what: `${frame.label}: ${frame.pose}`,
    cell:
      i === 0
        ? `CORRECT technique, "${frame.label}" position. Camera: ${CAMERA[e.artBrief.view]}. ${frame.pose}`
        : `CORRECT technique, "${frame.label}" position. Exactly the same camera angle, distance, props and hand grip as figure 1; only the movement has changed. ${frame.pose}`,
  })),
  ...e.mistakes.map((m, i) => ({
    name: `mistake-${i + 1}.png`,
    what: `Wrong on purpose (${VIEW[m.view]}): **${m.title}.** ${m.looksLike}`,
    cell: `WRONG on purpose, the mistake "${m.title}". Camera: ${CAMERA[m.view]}. Make this fault clearly visible: ${m.looksLike} Everything else as in the normal setup.`,
  })),
];
const delivered = (e, file) => existsSync(`assets/exercises/${e.id}/${file}`);
/** start and end are always drawn together, so the loop between them never mixes two generations. */
const wanted = (e) => {
  const list = files(e);
  const pair = !delivered(e, 'start.png') || !delivered(e, 'end.png');
  return list.map((f, i) => (i < 2 ? pair : !delivered(e, f.name)));
};
/** The frames a sheet holds, in order. tools/art/import_sheets.py (needed) reads a sheet the same way. */
const needed = (e) => {
  const list = files(e);
  const draw = wanted(e);
  return draw.some(Boolean) ? list.filter((_, i) => draw[i]) : list;
};
const LAYOUT = (count) =>
  count === 1
    ? 'Layout: one figure, centred.'
    : count <= 3
      ? `Layout: one row of ${count} figures.`
      : `Layout: two rows; figures 1-3 in the top row, figures 4-${count} in the bottom row.`;
const sheetPrompt = (e) => {
  const list = needed(e);
  const same = list[0]?.name === 'start' ? ' Props, hand position and character size as in figure 1.' : '';
  const figures = list.map((f, i) => `Figure ${i + 1}: ${f.cell}${f.name.startsWith('mistake') ? same : ''}`);
  return [SHEET, LAYOUT(list.length), `Exercise: ${e.name}. ${equipment(e)} Normal setup: ${e.startingPosition}`, ...figures].join('\n\n');
};

const ordered = [...exercises].sort((a, b) => batchOf(a) - batchOf(b) || PLAN.indexOf(a.id) - PLAN.indexOf(b.id));
const count = (list, predicate = () => true) => list.reduce((n, e) => n + files(e).filter((f) => predicate(e, f)).length, 0);
const total = count(ordered);
const done = count(ordered, (e, f) => delivered(e, f.name));
const missingIn = (batch) => count(ordered.filter((e) => batchOf(e) === batch), (e, f) => !delivered(e, f.name));
const needsSheet = (e) => wanted(e).some(Boolean);
const sheetsIn = (batch) => ordered.filter((e) => batchOf(e) === batch && needsSheet(e)).length;

const lines = [
  '# Exercise art brief',
  '',
  `Generated by \`tools/art/exercise-brief.mjs\` from \`data/exercises.json\`. Do not edit by hand. **${done} of ${total} images delivered.**`,
  '',
  'This is a request for production art, not a claim that it exists. The app must not ship with missing exercise art: `npm run release:check` fails until every file below is delivered.',
  '',
  '## What to draw',
  '',
  'For every exercise:',
  '- **`start.png` and `end.png`:** the two key positions of a correct rep, from the camera view given. The app loops them to show the movement, and they teach most of it: the screen has almost no text.',
  '- **`mistake-<n>.png`:** one image per common mistake, showing that fault clearly but realistically, from the view given. The app puts it next to a one-line fix, so the image itself has no red cross, arrows or text.',
  '',
  '**One sheet per exercise.** All missing frames of an exercise are drawn in one image, in rows of up to three, read left to right, top row first: start and end (always together), then the missing mistakes in order. Drawing them together keeps the character, camera and props the same, so the start → end loop does not jump. `npm run art:import` cuts the sheet into the files listed below.',
  '',
  `**Ready-to-paste prompts:** one per exercise, in [\`docs/art-prompts/\`](art-prompts/). Sheets still needed: batch 1 ${sheetsIn(1)}, batch 2 ${sheetsIn(2)}, batch 3 ${sheetsIn(3)} (missing images: ${missingIn(1)} / ${missingIn(2)} / ${missingIn(3)}).`,
  '',
  '## Spec (same for every file)',
  '- **Character:**',
  '  - The canonical Blob: warm cream-white soft clay, two upright black pill eyes, no mouth, nose, hair or ears.',
  '  - **Black athletic shorts**, beginner build (S0–S1), same proportions in every frame.',
  '  - No extra muscles, no recolors. Use the founder handoff `base-character-sheet.png` as the reference for every image.',
  '- **Canvas:**',
  '  - One landscape PNG per exercise, at least 1536 × 1024 px (larger is better), with a transparent background (RGBA).',
  '  - Exactly the figures the prompt lists, in rows of up to three, with empty space around each; nothing touches the image edge or another figure.',
  '  - No grid lines, floor, room, scenery, text, logo, arrows or ticks. A faint contact shadow under the body is fine.',
  '- **Camera and scale:**',
  '  - Camera at hip height, using the view listed for that figure.',
  '  - Same character size in every figure. Pixel-exact alignment is not needed: `npm run art:sync` puts every frame of an exercise on one shared scale and the same ground point.',
  '- **Props:** simple, neutral and realistic: dark grey dumbbells, a muted band with its anchor visible, a plain bench, chair or wall. No brand marks.',
  '- **Technique:** the correct frames must match the text, because a coach reviews both. When the text and a drawing disagree, the text wins; flag it in issue #1.',
  '',
  '## Delivery',
  '- **File name:** the exercise id, for example `hip-hinge.png`. The id is in each prompt heading.',
  '- **Send it, one of:**',
  '  - Paste the sheets into the Claude Code chat. Claude saves them under the right name.',
  `  - Or upload them to \`assets/exercises/inbox/\` on branch \`${BRANCH}\` (GitHub: Add file → Upload files).`,
  '- **After delivery:** Claude runs `npm run art:import`. It cuts each sheet into the files below, then `art:sync` validates them, aligns the frames, writes optimized WebP copies and wires them into the app. Claude checks every figure against the exercise text and answers with one list of the frames to redo, if any; rejected frames come back in the next prompt.',
  '- **Order:** batch 1 (the beginner plan) first, then batch 2 (their variations and the bodyweight movements), then batch 3.',
  '',
  '## Acceptance',
  '- Every file listed below exists after `npm run art:import`, and `npm run art:sync` reports no skipped files.',
  '- The character lock holds in every figure, including black shorts.',
  '- Each figure shows the pose its prompt describes and matches the exercise text. Start and end differ only by the movement.',
  '',
  '## Checklist',
  '',
  '| Batch | Exercise | id | View | Delivered |',
  '|---|---|---|---|---|',
  ...ordered.map((e) => {
    const list = files(e);
    const have = list.filter((f) => delivered(e, f.name)).length;
    return `| ${batchOf(e)} | ${e.name} | \`${e.id}\` | ${VIEW[e.artBrief.view]} | ${have}/${list.length} |`;
  }),
  '',
];

for (const batch of [1, 2, 3]) {
  lines.push(`## Batch ${batch}`, '');
  for (const e of ordered.filter((item) => batchOf(item) === batch)) {
    lines.push(`### ${e.name} (\`${e.id}\`), ${VIEW[e.artBrief.view]}`, '');
    lines.push(`Equipment: ${e.equipment}. Setup: ${e.startingPosition}`, '');
    for (const file of files(e)) {
      const mark = delivered(e, file.name) ? '[x]' : '[ ]';
      lines.push(`- ${mark} \`assets/exercises/${e.id}/${file.name}\`: ${file.what}`);
    }
    lines.push('');
  }
}

const outputs = new Map([[OUT, lines.join('\n')]]);
for (const batch of [1, 2, 3]) {
  const items = ordered.filter((e) => batchOf(e) === batch);
  const open = items.filter(needsSheet);
  const body = [
    `# Sheet prompts, batch ${batch}`,
    '',
    `Generated by \`tools/art/exercise-brief.mjs\`. Do not edit by hand. **${open.length} sheets still needed in this batch.** Spec and delivery: [\`docs/EXERCISE_ART_BRIEF.md\`](../EXERCISE_ART_BRIEF.md).`,
    '',
    'One image per prompt: all frames of one exercise on one transparent sheet. Attach `base-character-sheet.png` as the character reference every time. Name each result after the exercise id in its heading, for example `hip-hinge.png`. Exercises whose frames are all delivered are left out.',
    '',
  ];
  for (const e of open) {
    body.push(`## ${open.indexOf(e) + 1}. ${e.name} → \`${e.id}.png\``, '', '```text', sheetPrompt(e), '```', '');
  }
  if (open.length === 0) body.push('Everything in this batch is delivered.', '');
  outputs.set(PROMPTS(batch), body.join('\n'));
}

if (process.argv.includes('--check')) {
  const stale = [...outputs].filter(([path, text]) => !existsSync(path) || readFileSync(path, 'utf8') !== text).map(([path]) => path);
  if (stale.length > 0) {
    console.error(`Out of date: ${stale.join(', ')}. Run: node tools/art/exercise-brief.mjs`);
    process.exit(1);
  }
  console.log(`Art brief and prompts are up to date (${done}/${total} images delivered).`);
} else if (process.argv.includes('--require-all')) {
  if (done < total) {
    console.error(`Exercise art incomplete: ${total - done} of ${total} images missing (batch 1: ${missingIn(1)}, batch 2: ${missingIn(2)}, batch 3: ${missingIn(3)}).`);
    process.exit(1);
  }
  console.log(`All ${total} exercise images delivered.`);
} else {
  mkdirSync('docs/art-prompts', { recursive: true });
  for (const [path, text] of outputs) writeFileSync(path, text);
  console.log(`Wrote ${OUT} and ${PROMPTS('{1,2,3}')}: ${ordered.length} exercises, ${total} images, ${done} delivered.`);
}

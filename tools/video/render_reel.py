"""Prototype renderer: storyboard JSON -> vertical 1080x1920 MP4 (no credits, runs offline).

Usage:  python3 tools/video/render_reel.py video/reels/ep003-squat.json [--out path.mp4]
Needs:  Python 3 with Pillow, ffmpeg on PATH, `npm install` (for the bundled Inter / Archivo Black fonts).

Segments:
  card              eyebrow/title/body + approved art
  clip              newest completed Wiro output for `job` (video/runs/<job>/attempt-N.json);
                    falls back to a still clearly marked as a pending preview
  exercise-steps    steps[pick] from data/exercises.json
  exercise-cues     cues[pick] from data/exercises.json
  exercise-easier   the exercise's easier variation
A voice file (storyboard `voice`) is mixed in when present; otherwise a silent track is added.
"""
import argparse
import json
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[2]
FONTS = ROOT / 'node_modules/@expo-google-fonts'
INK, SECONDARY, ACCENT_INK, BG = (24, 25, 27), (107, 104, 101), (166, 75, 35), (248, 245, 239)
REVIEW_NOTE = 'Form guidance pending coach review'


def font(name: str, size: int) -> ImageFont.FreeTypeFont:
    paths = {
        'regular': FONTS / 'inter/400Regular/Inter_400Regular.ttf',
        'semibold': FONTS / 'inter/600SemiBold/Inter_600SemiBold.ttf',
        'extrabold': FONTS / 'inter/800ExtraBold/Inter_800ExtraBold.ttf',
        'wordmark': FONTS / 'archivo-black/400Regular/ArchivoBlack_400Regular.ttf',
    }
    return ImageFont.truetype(str(paths[name]), size)


def wrap(draw: ImageDraw.ImageDraw, text: str, fnt, width: int) -> list[str]:
    lines, line = [], ''
    for word in text.split():
        candidate = f'{line} {word}'.strip()
        if draw.textlength(candidate, font=fnt) <= width:
            line = candidate
        else:
            if line:
                lines.append(line)
            line = word
    if line:
        lines.append(line)
    return lines


def spaced(draw, xy, text, fnt, fill, tracking):
    x, y = xy
    for ch in text:
        draw.text((x, y), ch, font=fnt, fill=fill)
        x += draw.textlength(ch, font=fnt) + tracking


def card(size, eyebrow='', title='', body='', bullets=(), art=None, footer=None, badge=None) -> Image.Image:
    w, h = size
    img = Image.new('RGB', size, BG)
    d = ImageDraw.Draw(img)
    margin = 96
    spaced(d, (margin, 120), 'BLOB FIT', font('wordmark', 54), INK, 10)
    y = 300
    if eyebrow:
        spaced(d, (margin, y), eyebrow.upper(), font('semibold', 34), SECONDARY, 6)
        y += 80
    if title:
        f = font('extrabold', 112)
        for line in wrap(d, title, f, w - 2 * margin):
            d.text((margin, y), line, font=f, fill=INK)
            y += 124
        y += 24
    if body:
        f = font('regular', 50)
        for line in wrap(d, body, f, w - 2 * margin):
            d.text((margin, y), line, font=f, fill=SECONDARY)
            y += 68
        y += 16
    for bullet in bullets:
        f = font('semibold', 54)
        lines = wrap(d, bullet, f, w - 2 * margin - 70)
        d.ellipse((margin, y + 22, margin + 26, y + 48), fill=(245, 140, 98))
        for line in lines:
            d.text((margin + 70, y), line, font=f, fill=INK)
            y += 72
        y += 28
    if art:
        piece = Image.open(ROOT / art).convert('RGBA')
        max_w, max_h = int(w * 0.62), int(h - y - 260)
        scale = min(max_w / piece.width, max_h / piece.height)
        if scale > 0:
            piece = piece.resize((int(piece.width * scale), int(piece.height * scale)), Image.LANCZOS)
            base = img.convert('RGBA')
            base.alpha_composite(piece, ((w - piece.width) // 2, h - 230 - piece.height))
            img = base.convert('RGB')
            d = ImageDraw.Draw(img)
    if footer:
        f = font('regular', 32)
        tw = d.textlength(footer, font=f)
        d.text(((w - tw) / 2, h - 150), footer, font=f, fill=SECONDARY)
    if badge:
        f = font('semibold', 40)
        tw = d.textlength(badge, font=f)
        pad = 28
        box = ((w - tw) / 2 - pad, 210, (w + tw) / 2 + pad, 290)
        d.rounded_rectangle(box, radius=40, fill=(255, 243, 211))
        d.text(((w - tw) / 2, 228), badge, font=f, fill=(122, 90, 0))
    return img


def still_to_video(png: Path, seconds: float, fps: int, size, out: Path, zoom=True):
    w, h = size
    frames = int(round(seconds * fps))
    vf = f'scale={w * 2}:{h * 2},'
    vf += (f"zoompan=z='min(1+0.0006*on,1.04)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={frames}:s={w}x{h}:fps={fps},"
           if zoom else f'scale={w}:{h},fps={fps},')
    vf += f'fade=t=in:st=0:d=0.3,fade=t=out:st={seconds - 0.3:.2f}:d=0.3,format=yuv420p'
    run(['ffmpeg', '-y', '-loglevel', 'error', '-loop', '1', '-i', str(png), '-t', f'{seconds}', '-vf', vf,
         '-r', str(fps), '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-an', str(out)])


def clip_to_video(src: Path, seconds: float, fps: int, size, out: Path):
    w, h = size
    vf = (f'scale={w}:{h}:force_original_aspect_ratio=decrease,pad={w}:{h}:(ow-iw)/2:(oh-ih)/2:color=0xF8F5EF,'
          f'fps={fps},fade=t=in:st=0:d=0.2,fade=t=out:st={seconds - 0.3:.2f}:d=0.3,format=yuv420p')
    run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(src), '-t', f'{seconds}', '-vf', vf,
         '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-an', str(out)])


def newest_output(job: str) -> Path | None:
    runs = sorted((ROOT / 'video/runs' / job).glob('attempt-*.json'))
    for record_path in reversed(runs):
        record = json.loads(record_path.read_text())
        for output in record.get('outputs', []) if record.get('status') == 'completed' else []:
            path = ROOT / output['file']
            if path.exists():
                return path
    return None


def run(cmd):
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        sys.exit(f'ffmpeg failed: {" ".join(cmd[:6])}…\n{result.stderr[-2000:]}')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('storyboard')
    parser.add_argument('--out')
    args = parser.parse_args()
    board = json.loads(Path(args.storyboard).read_text())
    exercises = {e['id']: e for e in json.loads((ROOT / 'data/exercises.json').read_text())}
    size, fps = tuple(board.get('size', (1080, 1920))), board.get('fps', 30)
    out = Path(args.out) if args.out else ROOT / 'video/output/reels' / f"{board['id']}.mp4"
    out.parent.mkdir(parents=True, exist_ok=True)
    report = []
    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        parts = []
        for i, seg in enumerate(board['segments']):
            part = tmp / f'part-{i:02d}.mp4'
            kind, seconds = seg['type'], float(seg['seconds'])
            exercise = exercises.get(seg.get('exercise', ''))
            if kind == 'clip':
                source = newest_output(seg['job'])
                if source:
                    clip_to_video(source, seconds, fps, size, part)
                    report.append(f'{seconds:>4}s clip  {source.relative_to(ROOT)}')
                    parts.append(part)
                    continue
                base = Image.open(ROOT / seg['fallback']).convert('RGB').resize(size, Image.LANCZOS)
                d = ImageDraw.Draw(base)
                label = 'PREVIEW · squat clip pending approval'
                f = font('semibold', 40)
                tw = d.textlength(label, font=f)
                d.rounded_rectangle(((size[0] - tw) / 2 - 30, 120, (size[0] + tw) / 2 + 30, 200), radius=40, fill=(255, 243, 211))
                d.text(((size[0] - tw) / 2, 138), label, font=f, fill=(122, 90, 0))
                png = tmp / f'part-{i:02d}.png'
                base.save(png)
                still_to_video(png, seconds, fps, size, part, zoom=False)
                report.append(f'{seconds:>4}s clip  PLACEHOLDER (no completed run for {seg["job"]})')
            else:
                if kind == 'card':
                    img = card(size, seg.get('eyebrow', ''), seg.get('title', ''), seg.get('body', ''), art=seg.get('art'))
                elif kind == 'exercise-steps':
                    img = card(size, exercise['name'], seg['title'], bullets=[exercise['steps'][j] for j in seg['pick']],
                               art='assets/illustrations/interim/blob-squat.png', footer=REVIEW_NOTE)
                elif kind == 'exercise-cues':
                    img = card(size, exercise['name'], seg['title'], bullets=[exercise['cues'][j] for j in seg['pick']],
                               art='assets/illustrations/interim/blob-squat.png', footer=REVIEW_NOTE)
                elif kind == 'exercise-easier':
                    easier = exercises.get(exercise.get('easierId', ''))
                    title = f"Too hard? Try a {easier['name'].lower()}" if easier else 'Make it easier'
                    img = card(size, 'Easier option', title, easier['summary'] if easier else exercise['easier'],
                               bullets=easier['steps'][:2] if easier else (), footer=REVIEW_NOTE)
                else:
                    sys.exit(f'Unknown segment type: {kind}')
                png = tmp / f'part-{i:02d}.png'
                img.save(png)
                still_to_video(png, seconds, fps, size, part)
                report.append(f'{seconds:>4}s {kind}')
            parts.append(part)
        listing = tmp / 'parts.txt'
        listing.write_text(''.join(f"file '{p}'\n" for p in parts))
        total = sum(float(s['seconds']) for s in board['segments'])
        silent = tmp / 'video.mp4'
        run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', str(listing), '-c', 'copy', str(silent)])
        voice = board.get('voice')
        audio = ['-i', str(ROOT / voice)] if voice else ['-f', 'lavfi', '-t', f'{total}', '-i', 'anullsrc=r=48000:cl=stereo']
        run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(silent), *audio, '-map', '0:v', '-map', '1:a',
             '-c:v', 'copy', '-c:a', 'aac', '-b:a', '128k', '-shortest', '-movflags', '+faststart', str(out)])
    print('\n'.join(report))
    print(f'-> {out.relative_to(ROOT) if out.is_relative_to(ROOT) else out} ({total:.1f}s, {size[0]}x{size[1]}, '
          f'{"voice" if board.get("voice") else "silent track"})')


if __name__ == '__main__':
    main()

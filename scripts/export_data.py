#!/usr/bin/env python3
"""Deterministically flatten downloaded transcripts; publish a manifest only after validation."""
import argparse, hashlib, json, re, shutil, tempfile, unicodedata
from datetime import datetime, timezone
from pathlib import Path


def norm(value):
    return ' '.join(unicodedata.normalize('NFKC', value or '').split())


def duration_seconds(value):
    if not isinstance(value, str) or not re.fullmatch(r'\d+:\d{2}:\d{2}', value):
        return None
    hours, minutes, seconds = map(int, value.split(':'))
    if minutes >= 60 or seconds >= 60:
        return None
    return hours * 3600 + minutes * 60 + seconds


def key(value):
    return hashlib.sha256(value.encode()).hexdigest()[:20]


def encode(value):
    return json.dumps(value, ensure_ascii=False, separators=(',', ':')).encode()


def export(archive, output):
    files = sorted((archive / 'en').rglob('*.json'))
    meetings, statements, affiliations, speakers, topics = [], [], [], [], []
    am, pm, tm, seen = {}, {}, {}, set()
    errors = []
    unnamed = 0
    output.parent.mkdir(parents=True, exist_ok=True)
    stage = Path(tempfile.mkdtemp(prefix='un-export-', dir=output.parent))
    (stage / 'text').mkdir()
    try:
        for path in files:
            try:
                obj = json.loads(path.read_text())
                v, transcript = obj['video'], obj['transcript']
                assert transcript['language'] == 'en'
                slug = v.get('slug') or obj['url'].split('/en/', 1)[1]
                if slug in seen:
                    continue
                date = (v.get('date') or '')[:10]
                if not re.fullmatch(r'\d{4}-\d{2}-\d{2}', date):
                    raise ValueError('Invalid meeting date')
                # Validate before changing any exported dictionaries.
                for st in transcript['data']:
                    assert isinstance(st['paragraphs'], list)
                    float(st.get('start', 0))
                    for para in st['paragraphs']:
                        for sentence in para.get('sentences', []):
                            assert isinstance(sentence.get('text', ''), str)
                seen.add(slug)
            except (ValueError, KeyError, TypeError, AssertionError) as exc:
                errors.append({'path': str(path.relative_to(archive)), 'error': str(exc)})
                continue
            mid = len(meetings)
            texts = []
            meetings.append({'id': key(slug), 'title': norm(v.get('clean_title') or v.get('title')),
                             'date': date, 'scheduled': v.get('scheduled_time') or date,
                             'category': norm(v.get('category')) or 'Unclassified',
                             'body': norm(v.get('body')), 'slug': slug,
                             'durationSeconds': duration_seconds(v.get('duration'))})
            for ordinal, st in enumerate(transcript['data']):
                sp = st.get('speaker') or {}
                code, label = norm(sp.get('affiliation')), norm(sp.get('affiliation_full'))
                # Codes from the source are identifiers; without one use an exact normalized label.
                ak = ('code:' + code.casefold()) if code else ('label:' + label.casefold())
                if ak not in am:
                    am[ak] = len(affiliations)
                    affiliations.append({'id': key(ak), 'code': code, 'name': label or code or 'Unattributed'})
                aid = am[ak]
                name = norm(sp.get('name'))
                pid = -1
                if name:
                    pk = name.casefold() + '|' + ak
                    if pk not in pm:
                        pm[pk] = len(speakers)
                        speakers.append({'id': key(pk), 'name': name, 'a': aid})
                    pid = pm[pk]
                else:
                    unnamed += 1
                matched = set()
                paragraphs = []
                for para in st['paragraphs']:
                    paragraphs.append(' '.join(sent.get('text', '') for sent in para.get('sentences', [])))
                    for sent in para.get('sentences', []):
                        for topic in sent.get('topics', []):
                            if not isinstance(topic, dict) or not topic.get('label'):
                                continue
                            tk = norm(topic.get('key')).casefold() + '|' + norm(topic['label']).casefold()
                            if tk not in tm:
                                tm[tk] = len(topics)
                                topics.append({'id': key(tk), 'key': norm(topic.get('key')), 'name': norm(topic['label'])})
                            matched.add(tm[tk])
                texts.append('\n\n'.join(paragraphs))
                statements.append([mid, ordinal, pid, aid, round(float(st.get('start', 0)), 2),
                                   sorted(matched), norm(sp.get('function')), st.get('statement_number', ordinal + 1)])
            body = encode(texts)
            text_hash = hashlib.sha256(body).hexdigest()[:16]
            filename = f"{meetings[-1]['id']}-{text_hash}.json"
            meetings[-1]['file'] = 'text/' + filename
            if len(body) >= 25 * 1024 * 1024:
                raise ValueError(f'Text asset too large: {slug}')
            (stage / 'text' / filename).write_bytes(body)
        if not meetings:
            raise ValueError('No valid English transcripts found')
        index = {'schema': 1, 'meetings': meetings, 'statements': statements,
                 'affiliations': affiliations, 'speakers': speakers, 'topics': topics}
        body = encode(index)
        filename = 'index-' + hashlib.sha256(body).hexdigest()[:16] + '.json'
        if len(body) >= 25 * 1024 * 1024:
            raise ValueError('Index exceeds hosting file size limit')
        (stage / filename).write_bytes(body)
        discovered = sum(bool(line.strip()) for line in (archive / 'meetings.jsonl').read_text().splitlines()) if (archive / 'meetings.jsonl').exists() else len(meetings)
        manifest = {'schema': 1, 'index': filename, 'exportedAt': datetime.now(timezone.utc).isoformat(),
                    'discovered': discovered, 'recordings': len(meetings), 'interventions': len(statements),
                    'speakers': len(speakers), 'affiliations': len(affiliations), 'topics': len(topics),
                    'unnamedInterventions': unnamed, 'dateFrom': min(m['date'] for m in meetings),
                    'dateTo': max(m['date'] for m in meetings), 'skippedFiles': errors, 'indexBytes': len(body)}
        (stage / 'manifest.json').write_bytes(encode(manifest))
        # Keep the old complete snapshot if anything above fails.
        backup = output.with_name(output.name + '.previous')
        if backup.exists():
            shutil.rmtree(backup)
        if output.exists():
            output.rename(backup)
        try:
            stage.rename(output)
        except Exception:
            if backup.exists():
                backup.rename(output)
            raise
        if backup.exists():
            shutil.rmtree(backup)
        return manifest
    finally:
        if stage.exists():
            shutil.rmtree(stage)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--archive', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    print(json.dumps(export(args.archive, args.output), indent=2))

# UN Transcript Explorer

Public, static dashboard of the downloaded English UN transcript archive. React/TypeScript renders the interface. A Web Worker filters a compact index; full text is fetched per recording only when a meeting is expanded. There is no backend database or server-side Python process.

## Local development

```sh
npm ci
npm run dev
```

The generated `public/data` snapshot is included, so a fresh checkout can run without the original archive. The archive remains outside this dashboard repository.

## Manual data refresh

From the parent archive directory, run the existing downloader first. Then, inside this directory:

```sh
npm run export:data
npm test
python3 -m unittest discover -s tests -p 'test_*.py'
npm run build
```

The exporter reads `../data`, validates one transcript at a time, and replaces the generated snapshot only after completion. Invalid files are listed in `manifest.json`; they are not included in totals. A failed export preserves the previous snapshot. Publish the successful build through Sites using the existing project in `.openai/hosting.json`. Do not create a new Site on refresh. Publication is manual; no scheduler is configured.

## Counts and identity

- One canonical source slug equals one recording; multipart recordings count separately.
- Affiliation identifiers come from source codes when present, otherwise the normalized full label. Names and labels are normalized for whitespace/case only. No fuzzy identity inference.
- A speaker is a normalized name plus affiliation. Nameless interventions stay in affiliation and country profiles but do not become invented people.
- Country recognition uses ISO 3166-1 codes, independent of map geometry. Small countries remain in the country list. Organizations and missing affiliations are never assigned a country by inference.
- Topic identities use the supplied key and label pair. Topics match on the intervention where they occur. No new topics or model classification are generated.
- Date/type/affiliation/topic filters combine with AND at intervention level. Distinct recordings and profiles use those same matches.
- Country and affiliation profiles include chairs' procedural speech. Roles are displayed, not inferred.
- Newest meetings sort by source date, scheduled time, and stable source ID. Statements within meetings sort by recording timestamp and source order.

## Overview charts

The Hours of meetings card sums source-provided video durations once per matching recording and displays decimal hours. These are full recording lengths, including when a topic or affiliation selects only some interventions. Unavailable durations are explicitly excluded and reported; they are never estimated from transcript timestamps.

Monthly activity counts distinct recordings under the active filters. Zero-activity months remain visible. Boundary months clipped by the archive or selected dates are marked as partial. Selecting a month sets the date range; Reset dates preserves other filters. Counts describe the downloaded archive, not complete UN activity.

The ranked country bars and map colours show distinct matching recordings only. Hovering or focusing a mapped country shows its meeting count and share of all filtered meetings. Countries can appear in the same recording, so these shares are not additive. Country profiles retain their meeting-type breakdown above the meeting list.

## Data files

`manifest.json` points to a content-hashed index containing metadata dictionaries and compact statement rows. The row fields, in order, are meeting index, statement ordinal, speaker index (-1 if absent), affiliation index, start seconds, topic indices, role, and source statement number. Content-hashed `text/*.json` files contain arrays of statement text in source order, preserving paragraph breaks. Deploy the index and text snapshot together.

## Verification

`npm test` checks count and filter semantics, profile membership, small countries, unknown filters, same-day chronology, dictionary integrity and full-archive performance. Python tests check exporter normalization, preserved original text, and recovery from invalid input. `npm run build` type-checks and creates `dist/`.

World geometry: @d3-maps/atlas 1.0.0, countries-110m, supplied as TopoJSON. The map is for navigation and does not assert official UN boundaries. Transcripts are automatic recognition outputs, including interpreted speech, and are not official UN records.

# National Sea Scout Dashboard

Local dashboard built from the latest dated Sea Scout Ships capture in Google Drive.

## Refresh the data

```bash
/Users/petersargent/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 scripts/refresh_data.py
```

This reads the newest `SeaScoutShips-YYYY-MM-DD.xlsx` workbook in the `NSSC Membership Spreadsheet Capture` Google Drive shared drive, writes a CSV snapshot to `data/ships.csv`, and writes normalized dashboard data to `data/dashboard-data.json`.

## Archive the weekly spreadsheet

```bash
python3 scripts/archive_membership_spreadsheet.py
```

This exports the source Google Sheet as an `.xlsx` workbook and saves a dated copy into the `NSSC Membership Spreadsheet Capture` Google Drive shared drive.

## Run locally

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000/src/`.

## Production automation

The external production automation is installed at:

```text
/Users/petersargent/Automation/NationalSeaScoutDashboard
```

The LaunchAgent `com.petersargent.nssc-dashboard-refresh` fires hourly at
7:00 AM through 5:00 PM America/Chicago (11 times a day, on the hour). Each fire
holds the full-run lock and:

1. Exits quietly if today's `production-runs/<date>` report is already SUCCESS.
2. Runs a change check (`source_change_check.py`): a dry-run build that
   downloads a fresh export to a temporary folder, builds the dashboard payload
   in memory with the production `refresh_data` code, and compares a SHA-256 of
   the dashboard-used fields (`summary`, `breakdowns`, `ships`) with the
   published `data/dashboard-data.json` on GitHub `main`. It does not compare raw
   XLSX bytes or Drive modified times, and it never writes `data/`. Results are
   logged to `production-runs/<date>/change-checks.jsonl`.
3. If the data changed, runs the full production refresh once: archive the
   source workbook, refresh and validate the dashboard data, publish GitHub,
   write a JSON report, and email the result (signed "Pathfinder for Peter").
4. If unchanged, waits for the next hourly fire. If there is still no change at
   the 5:00 PM check, Peter alone receives a one-time no-change notice.

Start a production run manually with:

```bash
/Users/petersargent/Automation/NationalSeaScoutDashboard/run_nssc_dashboard_production.sh
```

A manual start follows the same change-gated flow. To force a full run without
the change check, set `NSSC_SKIP_CHANGE_CHECK=1` (manual use only).

The production runner is a thin orchestrator: it runs the independent build,
then the independent publisher, and finally writes the report and sends the
status email. It does not require Codex to be open.

Build and validate local dashboard data without publishing:

```bash
/Users/petersargent/Automation/NationalSeaScoutDashboard/build_nssc_dashboard.sh
```

This build-only command archives the dated workbook, regenerates the two data
files, and validates the capture name and row count. It does not access GitHub
or send email.

Production reports and scheduler logs are written under:

```text
/Users/petersargent/Automation/NationalSeaScoutDashboard/production-runs
```

## Historyless GitHub publishing

The production publisher intentionally keeps `main` as a single parentless
commit. Each successful publication creates a new root commit from the desired
dashboard tree and replaces the previous GitHub `main` using a force-with-lease
push. This keeps no branch ancestry while preventing an unexpected concurrent
remote update from being overwritten.

Publish already-generated dashboard data without building, archiving, emailing,
or running the rest of the production workflow:

```bash
/Users/petersargent/Automation/NationalSeaScoutDashboard/force_publish_dashboard_historyless.sh
```

By default, the standalone publisher overlays only these local files onto the
current GitHub tree:

- `data/ships.csv`
- `data/dashboard-data.json`

Specific repository-relative files can be supplied as arguments when another
set of files must be published:

```bash
/Users/petersargent/Automation/NationalSeaScoutDashboard/force_publish_dashboard_historyless.sh src/index.html src/styles.css
```

A double-clickable launcher is also installed at:

```text
~/Desktop/Force Publish NSSC Dashboard.command
```

Because these publishers replace the remote branch tip, use them only when the
selected local files are ready to become the published version.

## Dashboard appearance and help

The dashboard defaults to the operating system's light or dark appearance.
The theme control can explicitly select System, Light, or Dark, and an explicit
choice is saved in the browser.

The Health Board includes a visible status-color legend:

- Green: healthy or complete
- Amber: watch or approaching action
- Red: attention or action is needed
- Gray: informational or not scheduled

The `?` controls open help in a page-level popover so the explanation remains
visible inside scrollable dashboard sections and works with click, tap, and
keyboard input.

## November 5 source layout

The current import reads monthly and annual aggregates from Data Source. See [source mapping and safeguards](docs/SOURCE_LAYOUT_20261105.md). Earlier TY History and 2010-202X Membership references above describe archived layouts. Existing schedules and delivery ledgers are unchanged.

## National youth headline rule — adopted November 6, 2026

Use the captured workbook's `From Excel` summary for national youth cards:
Total Youth `AI2`, change `AK2 = AI2-AJ2`; Primary Youth `AI3` (includes
Scouts without a unit from `AI13`), change `AK3 = AI3-AJ3`. Read the current date from
`AI1` and comparator date from `AJ1` on every refresh; never hardcode a date
or sum ship YoY fields for these national headlines. Label change with its
actual comparator date. The national youth cards stay national when ship
filters change; ship/CST/council details retain their existing scope.
Missing or inconsistent cached summary values stop a refresh.

## Renewal window — adopted November 6, 2026

The renewal window is the dashboard refresh's current calendar month plus
the next calendar month, including the entire current month. September
and October 2026 renewals also have two calendar months of grace: September
through November 30 and October through December 31. All grace ends after
December 31, 2026. December renewals become Past on January 1. National and CST filters, board statuses and the generated
upcomingRenewals count use this same rule. Compare year/month rather than
a rolling number of days. Source renewalDate remains a month marker.

See `docs/renewal-window-rule.md` for the confirmed temporary grace cutoff.
Preflight runs pinned-date renewal boundary tests; publication validates the rule and count.

AI13 represents **Scouts without a unit**, as clarified by Peter on November
6, 2026. The workbook label "Lone Scouts" and JSON key `loneScouts` are legacy
source/compatibility terms only. Counts and inclusion in Primary Youth stay
unchanged. Dashboard copy must not classify this population as Lone Scouts.

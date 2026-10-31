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

The scheduled checkout of this repository is `dashboard-repo` under that
directory:

```text
/Users/petersargent/Automation/NationalSeaScoutDashboard/dashboard-repo
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

## Informational pages

- `src/status.html`: current national totals and a comparison with the latest earlier annual workbook column.
- `src/monthly.html`: monthly national trends, year-over-year overlays, exact-value table, and filtered CSV download from TY History.
- `src/history.html`: selectable annual membership, ships, leaders, and council history, with the current capture shown separately.
- `src/numbers.html`: definitions, source dates, missing-data behavior, and comparison limitations.

The existing data refresh also calls `scripts/membership_history.py`. It reads only
allowlisted aggregate rows and numeric year columns from `2010-202X Membership`
in the same captured workbook and writes `history` into `dashboard-data.json`.
Missing/error annual cells remain null. Annual totals are preserved as supplied;
they are not replaced with historical slide values or reconstructed by summing
other series. The current partial-year capture is not connected to the annual
trend line. The December 31 positions identify annual periods, not independently
verified source observation timestamps.

The new pages inherit system/light/dark appearance and are linked from National,
CST, and Help. They do not import contact data, internal notes, Coming rows, or
recruitment leads. Official new-ship counts, primary current adults, and national
council coverage percentage remain unavailable until their definitions and
required source inputs are verified.

## Refresh and email safeguards

The scheduled runner holds an exclusive lock for the full refresh and delivery.
Before sending a success email, it waits up to ten minutes for both public data
files to match the validated local build, including the dated source capture.
GitHub accepting a push alone does not count as a live deployment.

Success links go from `petersargent@seascout.org` to Scott Christensen and Hugh
Riley, copying Stephen Stevens and Peter at his Sea Scout address. Failures go
only to `peter@imetpetersargent.com`. The configured sender must exist in Mail.
Mail accepting a request is recorded as `accepted_by_mail`, not proof of delivery.

`production-runs/YYYY-MM-DD/group-delivery.json` is saved atomically before a
group email attempt. An accepted attempt suppresses further group emails for
that date. Pending, failed, or timed-out attempts require manual review of Mail's
Sent and Outbox before retrying; the runner never automatically retries them.
After confirming that an email was sent, preserve the ledger and mark its status
`accepted_by_mail`. Only after confirming it was not sent or queued may an operator
archive the ledger to allow another attempt. Keep that archive for the audit trail.
A manual one-time send must also be recorded in this ledger to prevent duplicates.
Do not remove delivery records as part of ordinary report cleanup.

Verification: `python3 -m unittest discover -s tests -p test_delivery_safety.py -v`.
These tests mock Mail and network access and send no messages.

### Monthly history import

The refresh also reads `TY History` through `scripts/monthly_history.py` into `monthlyHistory.observations` in the dashboard JSON. Only National / 0 / Ship rows and Date, Total_Units, Total_Adults, Total_Youth are imported. Missing/error counts stay null. Invalid dates, missing headers, or duplicate national Ship months fail the build. Missing worksheets produce an explicit unavailable page. Monthly history does not overwrite annual history or current ship totals.

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

It runs daily at 9:15 AM America/Chicago through the LaunchAgent
`com.petersargent.nssc-dashboard-refresh`. A production run archives the source
workbook, refreshes the dashboard data, publishes GitHub, writes a JSON report,
and emails the result.

Start a production run manually with:

```bash
/Users/petersargent/Automation/NationalSeaScoutDashboard/run_nssc_dashboard_production.sh
```

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

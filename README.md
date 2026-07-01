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

# Daily refresh source contract

The active LaunchAgent runs `/Users/petersargent/Automation/NationalSeaScoutDashboard/run_nssc_dashboard_production.sh` hourly from 7:00 AM to 5:00 PM Central. Each fire exits quietly after a SUCCESS for the day; otherwise it compares a dry-run build of the dashboard-used fields (summary, breakdowns, ships) with the published `data/dashboard-data.json` and runs the full refresh once when they differ. If there is still no change at 5:00 PM, Peter alone receives a one-time notice. Its build uses the `dashboard-repo` checkout in that directory. The older checkout under `/Volumes/MacProData/Codex/30-Production-Source/Mac-Pro/NationalSeaScoutDashboard` is not the scheduled source.

The build checks `config/refresh-contract.json` before archiving or generating data. It identifies the reviewed privacy, BeAScout, annual history, and TY monthly history code and page assets by SHA-256. The publisher checks the same source contract and public export contract before pushing. Missing files, changed reviewed code, lost history or links, raw CSV columns, full skipper surnames, and email addresses fail the run.

After an intentional exporter or TY-page code change, run tests, then explicitly reseal with `python3 scripts/check_refresh_sources.py --seal`. Install the reviewed files and matching contract in the active scheduled checkout. Do not reseal merely to silence unexplained drift.

To exercise the actual daily build without replacing the capture, publishing, or sending email:

```
python3 /Users/petersargent/Automation/NationalSeaScoutDashboard/build_nssc_dashboard.py --date YYYY-MM-DD --existing-capture
```

This test regenerates the checkout's public data files from the existing dated capture and performs all source and output validation. It does not run the production email workflow.

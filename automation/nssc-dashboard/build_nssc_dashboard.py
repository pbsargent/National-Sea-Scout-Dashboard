from __future__ import annotations

import argparse
import json
import subprocess
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

TZ = ZoneInfo("America/Chicago")
PROJECT_ROOT = Path("/Volumes/MacProData/Codex/30-Production-Source/Mac-Pro/NationalSeaScoutDashboard")
REPO = PROJECT_ROOT / "dashboard-repo"
PYTHON = Path("/Users/petersargent/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3")
CAPTURE_DIR = Path("/Users/petersargent/Library/CloudStorage/GoogleDrive-petersargent@seascout.org/Shared drives/NSSC Membership Spreadsheet Capture")
SHEET_ID = "1Y5DqDHs3qyH8Kx9z4jPSRIg0Fq0Ju-sDCxfVhRgx_dM"


def run(args: list[str], timeout: int = 300) -> None:
    print("$", " ".join(args), flush=True)
    subprocess.run(args, cwd=REPO, check=True, timeout=timeout)


def build(run_date: str, *, existing_capture: bool = False) -> dict:
    run([str(PYTHON), "scripts/check_refresh_sources.py"], timeout=30)
    archive_script = REPO / "scripts/archive_membership_spreadsheet.py"
    if SHEET_ID not in archive_script.read_text(encoding="utf-8"):
        raise RuntimeError(f"Archive script does not contain required sheet ID {SHEET_ID}")
    if not existing_capture:
        run([str(PYTHON), "scripts/archive_membership_spreadsheet.py", "--date", run_date], timeout=180)
    capture = CAPTURE_DIR / f"SeaScoutShips-{run_date}.xlsx"
    if not capture.exists() or capture.stat().st_size == 0:
        raise RuntimeError(f"Expected capture is missing or empty: {capture}")
    captures = sorted(CAPTURE_DIR.glob("SeaScoutShips-*.xlsx"), key=lambda path: path.stem, reverse=True)
    if not captures or captures[0].name != capture.name:
        newest = captures[0].name if captures else "none"
        raise RuntimeError(f"Today's capture is not newest. Expected {capture.name}; newest is {newest}")
    run([str(PYTHON), "scripts/refresh_data.py"], timeout=180)
    run([str(PYTHON), "scripts/validate_public_exports.py"], timeout=30)
    dashboard = json.loads((REPO / "data/dashboard-data.json").read_text(encoding="utf-8"))
    actual_name = dashboard.get("meta", {}).get("sourceCaptureName")
    if actual_name != capture.name:
        raise RuntimeError(f"Dashboard JSON names {actual_name}; expected {capture.name}")
    return {
        "status": "built",
        "run_date": run_date,
        "capture_path": str(capture),
        "capture_size": capture.stat().st_size,
        "dashboard_source_capture": actual_name,
        "row_count": dashboard.get("meta", {}).get("rowCount"),
        "generated_files": ["data/ships.csv", "data/dashboard-data.json"],
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Build and validate NSSC dashboard data without publishing it.")
    parser.add_argument("--date", default=datetime.now(TZ).date().isoformat())
    parser.add_argument("--result-json", type=Path)
    parser.add_argument("--existing-capture", action="store_true", help="Test the complete build with an existing capture; no archive, publish, or email")
    args = parser.parse_args()
    result = build(args.date, existing_capture=args.existing_capture)
    if args.result_json:
        args.result_json.parent.mkdir(parents=True, exist_ok=True)
        args.result_json.write_text(json.dumps(result, indent=2), encoding="utf-8")
    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

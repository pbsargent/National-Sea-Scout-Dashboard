#!/usr/bin/env python3
import argparse
import os
import urllib.request
import time
from datetime import date
from pathlib import Path
from urllib.error import URLError

SHEET_ID = "1Y5DqDHs3qyH8Kx9z4jPSRIg0Fq0Ju-sDCxfVhRgx_dM"
EXPORT_URL = f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/export?format=xlsx"
DEFAULT_DESTINATION = Path(
    "/Users/petersargent/Library/CloudStorage/"
    "GoogleDrive-petersargent@seascout.org/"
    "Shared drives/NSSC Membership Spreadsheet Capture"
)


def parse_args():
    parser = argparse.ArgumentParser(
        description="Archive a dated copy of the Sea Scout membership spreadsheet."
    )
    parser.add_argument(
        "--date",
        default=date.today().isoformat(),
        help="Date stamp for the archive filename, in YYYY-MM-DD format.",
    )
    parser.add_argument(
        "--destination",
        default=os.environ.get("NSSC_CAPTURE_DESTINATION", str(DEFAULT_DESTINATION)),
        help="Folder where the archived spreadsheet should be saved.",
    )
    return parser.parse_args()


def main():
    args = parse_args()
    destination = Path(args.destination).expanduser()
    destination.mkdir(parents=True, exist_ok=True)

    output_path = destination / f"SeaScoutShips-{args.date}.xlsx"
    temp_path = output_path.with_suffix(".xlsx.download")

    last_error = None
    for attempt in range(1, 4):
        try:
            with urllib.request.urlopen(EXPORT_URL, timeout=60) as response:
                payload = response.read()
            if len(payload) < 1024 or not payload.startswith(b"PK"):
                raise RuntimeError("Downloaded file does not look like an .xlsx workbook")
            temp_path.write_bytes(payload)
            temp_path.replace(output_path)
            break
        except (OSError, RuntimeError, URLError) as error:
            last_error = error
            if attempt == 3:
                raise
            time.sleep(10 * attempt)
    if last_error is not None and not output_path.exists():
        raise RuntimeError(f"Archive failed: {last_error}") from last_error

    print(output_path)


if __name__ == "__main__":
    main()

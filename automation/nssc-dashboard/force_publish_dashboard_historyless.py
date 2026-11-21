from __future__ import annotations

import argparse
import base64
import json
import os
import subprocess
import tempfile
from datetime import datetime
from pathlib import Path


PROJECT_ROOT = Path("/Volumes/MacProData/Codex/30-Production-Source/Mac-Pro/NationalSeaScoutDashboard")
REPO = PROJECT_ROOT / "dashboard-repo"
TOKEN_FILE = Path.home() / ".config/nssc-dashboard/github-token"
EXPECTED_REMOTE = "https://github.com/pbsargent/National-Sea-Scout-Dashboard.git"
BRANCH = "main"
DEFAULT_PATHS = ("data/ships.csv", "data/dashboard-data.json")


def run(args: list[str], *, env: dict[str, str] | None = None) -> str:
    shown = ["[AUTH REDACTED]" if "AUTHORIZATION:" in arg else arg for arg in args]
    print("$", " ".join(shown), flush=True)
    result = subprocess.run(
        args,
        cwd=REPO,
        env=env,
        text=True,
        capture_output=True,
        check=False,
    )
    if result.stdout:
        print(result.stdout, end="", flush=True)
    if result.stderr:
        print(result.stderr, end="", flush=True)
    if result.returncode:
        raise RuntimeError(f"Command failed with exit {result.returncode}: {' '.join(shown)}")
    return result.stdout.strip()


def git(args: list[str], *, env: dict[str, str] | None = None) -> str:
    return run(["git", *args], env=env)


def load_token() -> str:
    token = os.environ.get("GH_TOKEN") or os.environ.get("GITHUB_TOKEN") or ""
    if not token and TOKEN_FILE.exists():
        token = TOKEN_FILE.read_text(encoding="utf-8").strip()
    return "" if token == "PASTE_GITHUB_TOKEN_HERE" else token


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Publish selected local dashboard files as a single parentless GitHub commit."
    )
    parser.add_argument(
        "paths",
        nargs="*",
        default=list(DEFAULT_PATHS),
        help="Repository-relative files to overlay on GitHub's current tree (defaults to dashboard data files).",
    )
    parser.add_argument("--message", help="Root commit message.")
    parser.add_argument("--result-json", type=Path, help="Optional machine-readable result path.")
    args = parser.parse_args()

    if not REPO.is_dir() or not (REPO / ".git").exists():
        raise RuntimeError(f"Dashboard repository not found: {REPO}")
    if git(["remote", "get-url", "origin"]) != EXPECTED_REMOTE:
        raise RuntimeError(f"Refusing to publish: origin is not {EXPECTED_REMOTE}")
    if git(["branch", "--show-current"]) != BRANCH:
        raise RuntimeError(f"Refusing to publish: checked-out branch is not {BRANCH}")

    paths = list(dict.fromkeys(args.paths))
    if not paths:
        raise RuntimeError("No files were selected for publishing")
    missing = [path for path in paths if not (REPO / path).is_file()]
    if missing:
        raise RuntimeError("Selected files do not exist: " + ", ".join(missing))

    if any(path in {"data/ships.csv", "data/dashboard-data.json"} for path in paths):
        run([os.sys.executable, "scripts/check_refresh_sources.py"])
        run([os.sys.executable, "scripts/validate_public_exports.py"])

    git(["fetch", "--no-write-fetch-head", "origin", BRANCH])
    expected_remote = git(["rev-parse", f"origin/{BRANCH}"])

    with tempfile.NamedTemporaryFile(prefix="nssc-dashboard-index-", delete=False) as handle:
        index_path = Path(handle.name)
    index_path.unlink(missing_ok=True)
    index_env = os.environ.copy()
    index_env["GIT_INDEX_FILE"] = str(index_path)
    try:
        git(["read-tree", f"origin/{BRANCH}"], env=index_env)
        git(["add", "--", *paths], env=index_env)
        tree = git(["write-tree"], env=index_env)
    finally:
        index_path.unlink(missing_ok=True)

    remote_tree = git(["rev-parse", f"origin/{BRANCH}^{{tree}}"])
    if tree == remote_tree:
        result = {"status": "not needed", "commit": expected_remote, "historyless": True, "paths": paths}
        if args.result_json:
            args.result_json.parent.mkdir(parents=True, exist_ok=True)
            args.result_json.write_text(json.dumps(result, indent=2), encoding="utf-8")
        print("No selected-file changes need publishing.")
        return 0

    message = args.message or f"Refresh dashboard data for {datetime.now().date().isoformat()}"
    commit = git(["commit-tree", tree, "-m", message])
    token = load_token()
    push_args = [
        "push",
        f"--force-with-lease=refs/heads/{BRANCH}:{expected_remote}",
        "origin",
        f"{commit}:refs/heads/{BRANCH}",
    ]
    push_env = os.environ.copy()
    if token:
        auth = base64.b64encode(f"x-access-token:{token}".encode()).decode("ascii")
        push_args = ["-c", f"http.https://github.com/.extraheader=AUTHORIZATION: basic {auth}", *push_args]
        push_env["GH_TOKEN"] = token
        push_env["GITHUB_TOKEN"] = token
    git(push_args, env=push_env)

    result = {"status": "pushed", "commit": commit, "historyless": True, "paths": paths}
    if args.result_json:
        args.result_json.parent.mkdir(parents=True, exist_ok=True)
        args.result_json.write_text(json.dumps(result, indent=2), encoding="utf-8")

    print(f"Published parentless commit {commit}")
    print("Published files:")
    for path in paths:
        print(f"- {path}")
    print("Capture, data refresh, email, and scheduler steps were not run.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

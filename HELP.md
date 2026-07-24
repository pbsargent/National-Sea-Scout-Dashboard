# Dashboard Help

## Data source and refresh flow

All dashboard values come from the newest captured `SeaScoutShips-YYYY-MM-DD.xlsx` workbook in the `NSSC Membership Spreadsheet Capture` Google Drive folder.

The dashboard is rebuilt by `scripts/refresh_data.py`, which reads the `Ships` worksheet and:

- keeps rows where `UnitID` is present,
- writes `data/ships.csv` as a CSV snapshot,
- writes `data/dashboard-data.json` with normalized and derived fields.

`data/dashboard-data.json` includes `meta.sourceCapture` and `meta.sourceCaptureName` so you can confirm which workbook produced each publish.

## Source fields and derived dashboard fields

Workbook values are normalized from the `Ships` sheet into these JSON fields.

- `unitId`: from `UnitID`
- `cst`: from `CST`
- `shipNumber`: from `Ship #`
- `shipName`: from `Ship Name if tracking`
- `council`: from `Council Name`
- `district`: from `District`
- `owner`: from `Owner` (defaults to `Unassigned`)
- `auxDistrict`: from `CG Aux Districts` (defaults to `Unassigned`)
- `focus`: from `Ship Focus` (defaults to `Unspecified`)
- `status`: from `Status` (defaults to `Established`)
- `youth`: from `Total Youth`
- `adult`: from `Total Adult`
- `youthYoY`: from `Total Youth YOY`
- `primaryYouth`: from `Primary Youth`
- `primaryYoY`: from `Primary YOY`
- `advancementRate`: from `%Advancement` (interpreted as percentage; `0.5` becomes `50`)
- `retentionRate`: from `Retention` (interpreted as percentage)
- `unitMetric`: from `Unit Metric`
- `metricBucket`: derived from `Unit Metric` as `0-1`, `2`, `3`, `4-5`
- `renewal`: from `Renewal` (as text, e.g. `Jul-26`)
- `renewalDate`: parsed date from `Renewal` for comparison, normalized to the first day of that month
- `skipperTrained`: yes/no from `Skipper Trained`
- `committeeTrained`: yes/no from `CC Trained`
- `sizeHealthy`: yes/no from `Size`
- `growthHealthy`: yes/no from `Growth`
- `advancementHealthy`: yes/no from `20% Advance`
- `outdoorHealthy`: yes/no from `Outdoor`
- `charterOrganization`: from `Charter Organization`
- `skipperName`: from `Skipper Name`

### Derived rollups

- `summary.ships`: count of rows with a `UnitID`
- `summary.newShips`: count of rows where `status === "New"`
- `summary.youth`: sum of `youth`
- `summary.adults`: sum of `adult`
- `summary.youthYoY`: sum of `youthYoY`
- `summary.primaryYouth`: sum of `primaryYouth`
- `summary.primaryYoY`: sum of `primaryYoY`
- `summary.avgUnitMetric`: average of `unitMetric`
- `summary.skipperTrainingRate`: percent of rows with `skipperTrained === true`
- `summary.committeeTrainingRate`: percent of rows with `committeeTrained === true`
- `summary.advancementHealthyRate`: percent of rows with `advancementHealthy === true`
- `summary.outdoorHealthyRate`: percent of rows with `outdoorHealthy === true`
- `summary.upcomingRenewals`: rows with a parsed `renewalDate` within `0..120` days from `meta.generatedAt`
- `breakdowns`: aggregated counts for chart sections (unit metric, renewal, focus, AUX district, owner, councils)

## Status labels and color scheme

The color meaning is driven by `src/ship-board.js` status-to-class mapping:

- **Good (green)**: `Healthy`, `Complete`, `Strong`
- **Warn (amber)**: `Partial`, `Watch`, `Next 120`
- **Bad (red)**: `Needs Attention`, `Gap`, `Risk`, `Past`
- **Neutral (gray/muted)**: `Later`, `Unscheduled`, and any labels not in the buckets above

## What each status label means

- **Size**: from `sizeHealthy` (`Size` column in workbook) -> `Healthy` if `true`, else `Needs Attention`
- **Growth**: from `growthHealthy` (`Growth` column) -> `Healthy` if `true`, else `Needs Attention`
- **Advance**: from `advancementHealthy` (`20% Advance` column) -> `Healthy` if `true`, else `Needs Attention`
- **Outdoor**: from `outdoorHealthy` (`Outdoor` column) -> `Healthy` if `true`, else `Needs Attention`
- **Training**:
  - `Complete` when both `Skipper Trained` and `CC Trained` are Yes
  - `Partial` when exactly one of the two is Yes
  - `Gap` when neither is Yes
- **Renewal**:
  - `Next 120` when parsed renewal date is within 120 days of dashboard refresh date
  - `Past` when renewal is before refresh date
  - `Later` when renewal is after refresh window but present
  - `Unscheduled` when no valid renewal is present
- **Metric**:
  - `Strong` when `Unit Metric >= 4`
  - `Watch` when `Unit Metric` is `2` or `3`
  - `Risk` when `Unit Metric < 2`

## Visual locations that use the color scheme

- Health board segment bars
- Health chips shown in each ship row and in the detail explanation grid
- Legend below the Health Board (`Green` / `Amber` / `Red` / `Gray`)
- Status cards use the same mapping through shared `good`, `warn`, `bad`, and `neutral` classes

## Color theme note

Dashboard theme controls (`System`, `Light`, `Dark`) change base page chrome and card surfaces, but the status meaning above remains the same in all themes.

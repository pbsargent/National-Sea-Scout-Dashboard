# National Sea Scout Dashboard Help

This page explains where each dashboard value comes from and how to read the status colors.

## 1) What data powers the dashboard

The dashboard is built from the newest capture file in Google Drive:

- `NSSC Membership Spreadsheet Capture/SeaScoutShips-YYYY-MM-DD.xlsx`

Ship Health uses **Ships**. Annual Membership History uses **2010-202X Membership**. Monthly Trends uses national Ship aggregate rows in **TY History**.

The build process (for internal reference):

- Keeps rows where `UnitID` is present.
- Writes a snapshot to `data/ships.csv`.
- Writes dashboard data to `data/dashboard-data.json`.

If you want to confirm which file was used for a publish, check:

- `meta.sourceCapture`
- `meta.sourceCaptureName`

in `data/dashboard-data.json`.

## 2) Where each field comes from

### Ship identity and basics

- **Ship number** → `Ship #`
- **Ship ID** → `UnitID` (used as the ship key in the dashboard)
- **Ship name** → `Ship Name if tracking`
- **CST** → `CST`
- **Council** → `Council Name`
- **District** → `District`
- **Owner** → `Owner` (if blank, shows `Unassigned`)
- **AUX district** → `CG Aux Districts` (if blank, shows `Unassigned`)
- **Focus** → `Ship Focus` (if blank, shows `Unspecified`)
- **Ship status** → `Status` (defaults to `Established`)

### Youth, adult, and trend values

- **Total youth** → `Total Youth`
- **Adults** → `Total Adult`
- **Primary youth** → `Primary Youth`
- **Total youth YOY** → `Total Youth YOY`
- **Primary youth YOY** → `Primary YOY`

### Training and readiness

- **Skipper trained** → `Skipper Trained` (Yes/No)
- **Committee Chair trained** → `CC Trained` (Yes/No)
- **Size healthy** → `Size` (Yes/No)
- **Growth healthy** → `Growth` (Yes/No)
- **20% Advance healthy** → `20% Advance` (Yes/No)
- **Outdoor healthy** → `Outdoor` (Yes/No)
- **Unit Metric** → `Unit Metric` (0-5)
- **Unit Metric bucket** → derived from the metric (`0-1`, `2`, `3`, `4-5`)
- **Charter organization** → `Charter Organization`
- **Skipper name** → `Skipper Name`

### Renewal

- **Renewal month text** → `Renewal` (for display, e.g. `Jul-26`)
- **Renewal date** → parsed from `Renewal` for date calculations

### Dashboard summary cards

- **Ships** = number of rows with a `UnitID`
- **New ships** = ships where `Status` is `New`
- **Total youth / adults** = sums of `Total Youth` and `Total Adult`
- **Primary youth totals and YOY** = sums of the primary youth fields
- **Average unit metric** = average of `Unit Metric`
- **Skipper training rate** = % of ships with `Skipper Trained = Yes`
- **Committee training rate** = % of ships with `CC Trained = Yes`
- **Advancement health rate** = % of ships with `20% Advance = Yes`
- **Outdoor health rate** = % of ships with `Outdoor = Yes`
- **Upcoming renewals** = renewals within 0–120 days of the refresh date
- **Breakdowns** = grouped counts used in charts (council, renewal, focus, AUX district, owner)

## 3) How status labels are determined

Each ship row shows several status chips with a color:

- **Size**: `Healthy` if `Size` is Yes, otherwise `Needs Attention`
- **Growth**: `Healthy` if `Growth` is Yes, otherwise `Needs Attention`
- **Advance**: `Healthy` if `20% Advance` is Yes, otherwise `Needs Attention`
- **Outdoor**: `Healthy` if `Outdoor` is Yes, otherwise `Needs Attention`
- **Training**:
  - `Complete` = both `Skipper Trained` and `CC Trained`
  - `Partial` = one of the two is Yes
  - `Gap` = neither is Yes
- **Renewal**:
  - `Next 120` = renewal falls within 120 days of dashboard refresh
  - `Past` = renewal date is before refresh
  - `Later` = renewal date is after refresh but outside the 120-day window
  - `Unscheduled` = no valid renewal value
- **Metric**:
  - `Strong` = Unit Metric 4 or 5
  - `Watch` = Unit Metric 2 or 3
  - `Risk` = Unit Metric 0 or 1

## 4) Color meaning (quick view)

The same colors are used everywhere for status:

- **Green** = good / healthy / complete
- **Amber** = watch / partial / approaching action
- **Red** = needs action
- **Gray** = informational (`Later` or `Unscheduled`)

You will see these colors in:

- Health Board bars
- Status chips in each ship row
- The ship detail explanation cards
- The color legend under Health Board

## 5) Tip

Colors and status meanings do not change between theme modes (`System`, `Light`, `Dark`); only the page styling changes.

## Monthly Trends

Open **Monthly Trends** from any dashboard navigation. The latest-month cards show youth, adults, ships, and same-month year-over-year changes. Choose Youth, Adults, Ships, or Youth per Ship, then All years or one year. Both graph and table follow these selections. The table groups months into expandable year sections, newest first, with the latest year open initially. Select a year heading to expand or collapse it. Switch between Timeline and Year-over-year comparison; the latter overlays years on January–December. Hover or focus graph points for exact dates and values. Download CSV exports the selected measure and year with comparison columns.

Monthly change uses the preceding calendar month; yearly change uses the same calendar month one year earlier. Percentage change is change divided by the baseline. Missing months or values remain unavailable, and zero baselines have no percentage change. Youth per ship is total youth divided by ships. Months missing from the source interrupt graph lines. Future months are not filled.

The source is TY History, filtered to Level_Type National, Level_Number 0, Unit_Type Ship. Observation dates are preserved, including February 28, 2024. National totals do not supply council or individual-ship histories, primary registrations, or verified unique-person totals. Monthly, annual, and current Ships observations remain separate, including discrepancies in December 2025 totals.

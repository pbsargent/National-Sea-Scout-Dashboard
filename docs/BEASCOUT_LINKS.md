# National Sea Scout BeAScout links

Read `BEASCOUT_DIRECT_LINK_RULES.md` before updating these links.

The captured workbook's `Pin & CharOrg data` sheet supplies internal UnitID,
Ship number, council, and a meeting/charter-organization address. Match the
UnitID to the dashboard exactly. Duplicate identical source rows are collapsed;
conflicting source identities are left unresolved.

Resolve with the source ZIP and numeric UnitID. Restore leading zeroes only
where an explicit state plus a shortened numeric ZIP establishes the value.
For records without a usable ZIP, the official resolver may work using UnitID
alone; accept only a verified canonical unit page. Never substitute an invented
ZIP, UUID, or generic search page.

Verification requires HTTP 200, the official canonical `/units/UUID` route,
its embedded `legacyUnitId`, the Ship program and number, and matching council
number where provided. Check the displayed location as well. When it differs
from the captured address but the exact ID, program/number and council match,
record the discrepancy in the audit; do not change the source address.

To refresh the audit, run the resolver with the bundled Python runtime:

```
python3 scripts/resolve_beascout_links.py --capture /absolute/path/SeaScoutShips-YYYY-MM-DD.xlsx --output /absolute/path/beascout-link-audit.json
```

An existing output file resumes verified results. Use a new output file to
recheck every unit. Network checks use at most three workers, then retry failures
with two. Only verified URLs are copied to `data/beascout-links.json`, keyed by
UnitID. `scripts/refresh_data.py` adds these as `beascoutUrl` to the daily JSON
export. Unknown or newly added units receive no link until verified.

The shared ship board displays a separate BeAScout anchor beside each verified
ship and in its detail view. Unresolved details state that the link is not
verified. Links open in a new tab and never nest inside a ship selection button.
No contact names, email addresses, phones, or source street addresses are added
to the link map or public CSV.

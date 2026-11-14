# Renewal window rule

Peter Sargent confirmed this rule on November 6, 2026.

The window includes the calendar month of the dashboard refresh and the next
calendar month. Entire months count; a first-of-month source marker does not
make a current-month renewal Past. Use the snapshot calendar date consistently
across browser timezones and Python.

September 2026 renewals have two calendar months of temporary grace, through
November 30, 2026. October 2026 renewals have two calendar months of temporary
grace, through December 31, 2026. Grace must not extend into January 2027 and
must not recur for September/October of later years. November and December
2026 have no grace. December renewals become Past on January 1.

Due soon means current/next month; Grace means an eligible temporary extension;
Past means the renewal month and any applicable grace ended. Missing dates are
Unscheduled. These are source-snapshot timing classifications; they do not
independently establish whether a subsequent renewal was completed.

For the November 6 snapshot: September 7 + October 7 + November 10 + December
193 = 217 ships. The former 120-day calculation selected 288 ships. The base
current/next window without temporary grace selects 203 ships.

Implementation: scripts/refresh_data.py and src/ship-board.js.
Preflight hashes protect reviewed sources and execute both pinned-date Python
and JavaScript renewal boundary tests before each build/publish. Export
validation rejects missing rule metadata or a mismatched renewal-window count.
National and CST pages use the same shared browser rule.

# Source layout — November 5, 2026

Stephen Stevens's “Agreement on data” email and a fresh 15:21 Central source
export establish the replacement `Data Source` layout in Sea Scout Ships.

- Monthly history: A:G, currently A1:G46. Read National / 0 / Ship rows only.
  Headers now contain spaces. Dates remain exactly as supplied; latest is
  September 30, 2026. Adjacent imported tables are not monthly observations.
- Annual total youth: year labels J2:N2, Ship values J7:N7.
- Annual adults: year labels J12:N12, Ship values J17:N17.
- Annual ships: year labels R17:U17 and W17:AC17, values on row 18.
- Annual primary youth: year labels R32:U32 and W32:AC32, values on row 33.
- AC32 is the manual snapshot date; AC2 links to it. Dated columns and the
  snapshot year are excluded from completed annual history. The October 31,
  2026 snapshot is not a 2026 annual observation.
- Coverage varies: ships and primary youth have 2016–2025 annual columns;
  total youth and adults have 2022–2025. Councils, primary adults, and multiple
  youth are unavailable here. Do not backfill from earlier captures or derive
  multiple youth from independently maintained series.
- From Excel retains its existing role in the Ships formulas. Manual values
  remain controlled by Tom/Hugh; changing their timing is outside this repair.

Missing/error aggregate counts remain null. Schema/date drift stops the import.
Legacy history readers remain available for archives without Data Source.
Source tab ID: 1254926491. Public source links and help now name Data Source.

For an isolated rebuild, use `scripts/refresh_data.py --capture PATH
--output-dir DIRECTORY`. Same-day repair captures use a timestamped filename;
the original daily archive, reports, delivery ledgers, and scheduler are preserved.
Production installation uses reviewed source hashes and the existing exclusive
refresh lock. Publication uses the selected-file historyless publisher with
force-with-lease. No email replay is part of this repair.

"""Read only reviewed aggregate cells from the captured membership history tab."""
from math import isfinite
from datetime import date, datetime
from openpyxl import load_workbook

HISTORY_SHEET = '2010-202X Membership'
FIELDS = {
    'Councils with Ships': 'councils', '# Ships': 'ships',
    'Primary Youth': 'primaryYouth', 'Multiple Youth': 'multipleYouth',
    'Total Youth': 'youth', 'primary registered adults': 'primaryAdults',
    'total registered adults': 'adults',
}


def count(value):
    if isinstance(value, bool) or not isinstance(value, (float, int)):
        return None
    return int(value) if isfinite(value) and value >= 0 and value == int(value) else None


def annual_year(value):
    """Year labels may be text in IMPORTRANGE; dates are never annual labels."""
    if isinstance(value, str) and len(value) == 4 and value.isdigit():
        value = int(value)
    year = count(value)
    return year if year is not None and 2000 <= year <= 2100 else None


def read_data_source_history(sheet):
    # Bound the read to the reviewed aggregate area, excluding contacts/notes.
    grid = list(sheet.iter_rows(min_row=1, max_row=33, max_col=29, values_only=True))
    cell = lambda r, c: grid[r-1][c-1]
    checkpoint = cell(32, 29)
    if not isinstance(checkpoint, (date, datetime)):
        raise ValueError('Data Source AC32 must contain the snapshot date')
    checkpoint = checkpoint.date() if isinstance(checkpoint, datetime) else checkpoint
    for r, c, expected in [(1,9,'Total_Youth'), (2,9,'Unit_Type'), (7,9,'Ship'),
                            (11,9,'Total_Adults'), (12,9,'Unit_Type'), (17,9,'Ship'),
                            (17,22,'Year End'), (18,22,'Ships'),
                            (31,22,'Primary Youth'), (32,22,'Year End'), (33,22,'Sea Scouts')]:
        if cell(r,c) != expected:
            raise ValueError(f'Data Source aggregate layout changed at row {r}, column {c}')
    records = {}
    def add_block(header_row, value_row, columns, field):
        seen = set()
        for c in columns:
            label = cell(header_row, c)
            year = annual_year(label)
            # Dated checkpoint columns are kept out of completed annual history.
            if isinstance(label, (date, datetime)):
                continue
            if year is None:
                raise ValueError(f'Data Source invalid annual year at row {header_row}, column {c}')
            if year in seen:
                raise ValueError(f'Data Source duplicate annual year: {year}')
            seen.add(year)
            if year >= checkpoint.year:
                continue
            record = records.setdefault(year, {'year': year, 'date': f'{year}-12-31',
                                               **{key: None for key in FIELDS.values()}})
            record[field] = count(cell(value_row, c))
    add_block(2, 7, range(10,15), 'youth')
    add_block(12, 17, range(10,15), 'adults')
    historical_columns = [*range(18,22), *range(23,30)]
    add_block(17, 18, historical_columns, 'ships')
    add_block(32, 33, historical_columns, 'primaryYouth')
    return {'sourceSheet': 'Data Source', 'sourceSheetId': 1254926491,
            'sourceRanges': {'youth': 'J2:N7', 'adults': 'J12:N17',
                             'ships': 'R17:AC18', 'primaryYouth': 'R32:AC33'},
            'snapshotDate': checkpoint.isoformat(),
            'annual': [records[y] for y in sorted(records)],
            'note': 'Completed annual columns from Data Source. Dated snapshots and the snapshot year are excluded. '
                    'Coverage varies by measure; missing values remain unavailable. Primary youth and total youth '
                    'are separate source series; multiple youth is not inferred. December 31 identifies the annual '
                    'period, not an independently verified source observation timestamp.'}


def read_history(capture_path):
    workbook = load_workbook(capture_path, read_only=True, data_only=True)
    try:
        if 'Data Source' in workbook.sheetnames:
            return read_data_source_history(workbook['Data Source'])
        if HISTORY_SHEET not in workbook.sheetnames:
            return {'sourceSheet': HISTORY_SHEET, 'annual': [], 'note': 'History worksheet unavailable in this capture.'}
        iterator = workbook[HISTORY_SHEET].iter_rows(values_only=True)
        headers = next(iterator, ())
        columns = [(i, count(v)) for i, v in enumerate(headers) if count(v) is not None and 2000 <= count(v) <= 2100]
        records = {year: {'year': year, 'date': f'{year}-12-31', **{key: None for key in FIELDS.values()}} for _, year in columns}
        seen = set()
        for row in iterator:
            key = FIELDS.get(str(row[0] or '').strip()) if row else None
            if key and key not in seen:
                seen.add(key)
                for i, year in columns:
                    records[year][key] = count(row[i]) if i < len(row) else None
        return {'sourceSheet': HISTORY_SHEET, 'annual': [records[y] for y in sorted(records)],
                'note': 'Annual columns as recorded in the captured workbook. December 31 identifies the annual comparison period; source revision dates are unavailable. These figures may differ from historical slide snapshots.'}
    finally:
        workbook.close()

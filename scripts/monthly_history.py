"""Read national Ship monthly observations; support archived and current layouts."""
from datetime import date, datetime
from pathlib import Path
from openpyxl import load_workbook
from membership_history import count


def read_monthly_history(path):
    result = {'sourceSheet': 'TY History', 'sourceCaptureName': Path(path).name, 'observations': []}
    book = load_workbook(path, read_only=True, data_only=True)
    try:
        sheet = 'Data Source' if 'Data Source' in book.sheetnames else 'TY History'
        result['sourceSheet'] = sheet
        if sheet not in book.sheetnames:
            return result
        # Other tables share Data Source. Read only the seven monthly columns.
        rows = book[sheet].iter_rows(max_col=7 if sheet == 'Data Source' else None, values_only=True)
        headers = [str(v or '').strip().replace(' ', '_') for v in next(rows, ())]
        required = ['Date', 'Level_Type', 'Level_Number', 'Unit_Type', 'Total_Units', 'Total_Adults', 'Total_Youth']
        if not all(name in headers for name in required):
            raise ValueError(f'{sheet} is missing required monthly columns')
        seen = set()
        for values in rows:
            row = dict(zip(headers, values))
            if (row.get('Level_Type'), row.get('Level_Number'), row.get('Unit_Type')) != ('National', 0, 'Ship'):
                continue
            day = row.get('Date')
            if isinstance(day, datetime):
                day = day.date()
            if not isinstance(day, date):
                raise ValueError(f'{sheet} has an invalid observation date')
            month = day.strftime('%Y-%m')
            if month in seen:
                raise ValueError(f'{sheet} has duplicate national Ship month: {month}')
            seen.add(month)
            result['observations'].append({'date': day.isoformat(), 'ships': count(row.get('Total_Units')),
                                           'adults': count(row.get('Total_Adults')), 'youth': count(row.get('Total_Youth'))})
        result['observations'].sort(key=lambda row: row['date'])
        if sheet == 'Data Source':
            result['sourceSheetId'] = 1254926491
            result['sourceRange'] = 'A:G'
            result['note'] = 'National / 0 / Ship monthly observations. Source dates are preserved. Counts are registrations, not verified distinct people.'
        return result
    finally:
        book.close()

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const board = vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/ship-board.js'), 'utf8') + '; SeaScoutBoard', {});
const cases = [
  ['2026-11-06T11:19:07-06:00','2026-10-01',true,'Grace'],
  ['2026-11-06T11:19:07-06:00','2026-11-01',true,'Due soon'],
  ['2026-11-06T11:19:07-06:00','2026-12-01',true,'Due soon'],
  ['2026-11-06T11:19:07-06:00','2027-01-01',false,'Later'],
  ['2026-12-30T23:59:59-06:00','2026-12-01',true,'Due soon'],
  ['2026-12-31T23:59:59-06:00','2026-12-01',true,'Due soon'],
  ['2027-01-01T00:00:00-06:00','2026-12-01',false,'Past'],
  ['2026-12-31T23:59:59-06:00','2027-01-01',true,'Due soon'],
  ['2026-12-31T23:59:59-06:00','2027-02-01',false,'Later'],
  ['2027-01-01T00:00:00-06:00','2027-02-01',true,'Due soon'],
  ['2028-02-29T23:59:59-06:00','2028-02-01',true,'Due soon'],
  ['2028-03-01T00:00:00-06:00','2028-02-01',false,'Past'],
  ['2026-11-06T11:19:07-06:00','',false,'Unscheduled'],
  ['2026-11-06T11:19:07-06:00','invalid',false,'Unscheduled'],
  ['2026-11-30T23:59:59-06:00','2026-09-01',true,'Grace'],
  ['2026-12-01T00:00:00-06:00','2026-09-01',false,'Past'],
  ['2026-12-30T23:59:59-06:00','2026-10-01',true,'Grace'],
  ['2026-12-31T23:59:59-06:00','2026-10-01',true,'Grace'],
  ['2027-01-01T00:00:00-06:00','2026-10-01',false,'Past'],
  ['2026-12-01T00:00:00-06:00','2026-11-01',false,'Past'],
  ['2027-11-01T00:00:00-06:00','2027-09-01',false,'Past'],
  ['2027-11-01T00:00:00-06:00','2027-10-01',false,'Past'],
];
for (const [snapshot, date, included, status] of cases) {
  assert.equal(board.isRenewalWindow({renewalDate:date},snapshot),included,`${snapshot} ${date}`);
  assert.equal(board.renewalStatus({renewalDate:date},snapshot),status);
}
const data=JSON.parse(fs.readFileSync(path.join(__dirname,'../data/dashboard-data.json'),'utf8'));
const rows=data.ships.filter(s=>board.isRenewalWindow(s,data.meta.generatedAt));
assert.equal(rows.length,data.summary.upcomingRenewals);
console.log(`Renewal calendar boundaries and no December grace passed; current window has ${rows.length} ships.`);

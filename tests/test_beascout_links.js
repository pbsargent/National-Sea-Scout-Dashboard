const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const context = vm.createContext({ Intl, Date, Number, String, Map, Array, Math });
vm.runInContext(fs.readFileSync('src/ship-board.js', 'utf8') + '\nthis.board = SeaScoutBoard;', context);
const ship = { unitId: '42', shipNumber: '7', council: 'Test Council', cst: 1, youth: 3, youthYoY: 0, unitMetric: 3, skipperName: 'Alex M.', beascoutUrl: 'https://beascout.scouting.org/units/12345678-1234-1234-1234-123456789abc' };
function render(url) {
  const row = {...ship, beascoutUrl: url};
  const groupTarget = {}, detailTarget = {};
  context.board.renderCstBoard({ rows: [row], data: {ships: [row], meta: {generatedAt: '2026-10-18T09:15:19-05:00'}}, state: { openCouncils: new Set(['Test Council']), selectedId: '42' }, groupTarget, detailTarget });
  return { row: groupTarget.innerHTML, detail: detailTarget.innerHTML };
}
const good = render(ship.beascoutUrl);
assert.match(good.row, /href="https:\/\/beascout.scouting.org\/units\//);
assert.match(good.detail, /View Ship 7 on BeAScout/);
assert.match(good.detail, /target="_blank" rel="noopener noreferrer"/);
assert.doesNotMatch(good.row, /<button[^>]*>[\s\S]*?<a[^>]*>[\s\S]*?<\/button>/);
for (const bad of ['', 'javascript:alert(1)', 'https://evil.example/units/12345678-1234-1234-1234-123456789abc', 'https://beascout.scouting.org/search']) {
  const output = render(bad);
  assert.doesNotMatch(output.row, /class="beascout-link"/);
  assert.match(output.detail, /BeAScout link not verified/);
}
console.log('Verified valid links, unresolved states, safe URLs, new-tab behavior and separate row controls.');

/* Shared calendar comparisons: missing months are never substituted. */
(function(root) {
  function monthKey(date) { return date.slice(0,7); }
  function offset(key, months) {
    const [year, month] = key.split('-').map(Number);
    return new Date(Date.UTC(year, month-1+months, 1)).toISOString().slice(0,7);
  }
  function prepare(observations) {
    if (!observations.length) return [];
    const lookup = new Map(observations.map(r=>[monthKey(r.date), r]));
    const keys = [...lookup.keys()].sort();
    const result = [];
    for (let key=keys[0]; key<=keys.at(-1); key=offset(key,1)) {
      const record = lookup.get(key);
      result.push({month:key, date:record?.date ?? null, youth:record?.youth ?? null,
        adults:record?.adults ?? null, ships:record?.ships ?? null,
        average:record?.youth != null && record.ships > 0 ? record.youth/record.ships : null});
    }
    return result;
  }
  function compare(rows, record, key, months) {
    const previous = rows.find(r=>r.month===offset(record.month,-months));
    const a=record[key], b=previous?.[key];
    return {change:a==null || b==null ? null : a-b,
      percent:a==null || b==null || b===0 ? null : (a-b)/b*100};
  }
  const api = {prepare,compare,offset};
  root.MonthlyModel=api;
  if(typeof module!=='undefined') module.exports=api;
})(globalThis);

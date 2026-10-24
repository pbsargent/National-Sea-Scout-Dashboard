(() => {
  const content = document.getElementById('informationContent');
  const mode = document.body.dataset.information;
  const number = value => value == null ? 'Unavailable' : new Intl.NumberFormat('en-US', {maximumFractionDigits: 1}).format(value);
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const dateLabel = iso => new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', {year:'numeric',month:'short',day:'numeric', timeZone:'UTC'});
  const metrics = [['youth','Total youth'],['primaryYouth','Primary youth'],['ships','Ships'],['average','Youth per ship'],['adults','Adult registrations'],['councils','Councils with ships']];
  const derived = row => ({...row, average: row.youth != null && row.ships > 0 ? row.youth / row.ships : null});
  const panel = (title, body) => `<section class="panel info-panel"><h2>${title}</h2>${body}</section>`;
  const delta = (a,b) => a == null || b == null ? 'Unavailable' : `${a-b > 0 ? '+' : ''}${number(a-b)}`;
  const percent = (a,b) => a == null || b == null || b === 0 ? 'Unavailable' : `${a-b > 0 ? '+' : ''}${number((a-b)/b*100)}%`;
  const table = (headers,rows,caption) => `<div class="info-table-wrap"><table class="info-table"><caption>${escape(caption)}</caption><thead><tr>${headers.map(h=>`<th scope="col">${escape(h)}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
  const row = (title, values) => `<tr><th scope="row">${escape(title)}</th>${values.map(v=>`<td>${escape(v)}</td>`).join('')}</tr>`;
  document.querySelectorAll('.info-nav a').forEach(link => {
    if (link.getAttribute('href') === `${mode}.html`) link.setAttribute('aria-current','page');
  });

  function status(data, current, annual, captureDate) {
    const baseline = annual.filter(r=>r.year < Number(captureDate.slice(0,4))).at(-1);
    const cards = metrics.map(([key,label])=>`<article class="score"><span>${label}</span><strong>${number(current[key])}</strong><small>${key==='average'?'Total youth ÷ ships':key==='councils'?'Distinct nonblank council names in Ships':'Captured Ships worksheet'}</small></article>`).join('');
    content.innerHTML = `<section class="info-metrics" aria-label="Current national measures">${cards}</section>` +
      panel('Current capture and annual baseline', baseline ?
        `<p class="info-note">Current: ${dateLabel(captureDate)}. Baseline: ${baseline.year} annual column in ${escape(data.history.sourceSheet)}. These are workbook comparisons, not a reproduction of the historical slide report.</p>`+
        table(['Measure',`${baseline.year} annual`,dateLabel(captureDate),'Change','Change %'],metrics.map(([key,label])=>row(label,[number(baseline[key]),number(current[key]),delta(current[key],baseline[key]),percent(current[key],baseline[key])])), 'National measures by reporting period') :
        '<p>No earlier annual baseline is available in this capture.</p>') +
      panel('Reading the national picture', `<p>Total youth and adult figures sum registrations reported by each ship; they should not be interpreted as deduplicated people across ships. Primary youth uses the separate Primary Youth column.</p><p>Ships counts all rows with a UnitID on Ships. Councils with ships counts distinct council names in those rows; national council coverage percentage is unavailable because this import does not establish a complete council denominator.</p><p>Primary adult leaders and official new-ship counts are unavailable in this view. The Ships status label is not sufficient to reproduce the official new-ship definition.</p><p><a href="history.html">Explore membership history</a> · <a href="numbers.html">Read the definitions and source notes</a></p>`);
  }

  function chart(annual, current, key, label, captureDate) {
    const points = annual.filter(r=>r[key] != null).map(r=>({date:r.date,label:`${r.year} annual`,value:r[key]}));
    if(current[key] != null) points.push({date:captureDate,label:dateLabel(captureDate)+' capture',value:current[key],current:true});
    if(!points.length) return '<p>No recorded values for this measure.</p>';
    const width=Math.max(340, Math.min(960, document.getElementById('historyChart').clientWidth));
    const left=76, right=width-20, top=24, bottom=262;
    const times=points.map(p=>Date.parse(p.date+'T12:00:00Z'));
    const start=Math.min(...times),end=Math.max(...times);
    const max=Math.max(1,...points.map(p=>p.value))*1.1;
    const x=p=>left+(Date.parse(p.date+'T12:00:00Z')-start)/(end-start||1)*(right-left);
    const y=p=>bottom-p.value/max*(bottom-top);
    const grid=Array.from({length:5},(_,i)=>{const v=max*i/4;const yy=bottom-v/max*(bottom-top);return `<line class="grid" x1="${left}" x2="${right}" y1="${yy}" y2="${yy}"/><text x="${left-10}" y="${yy+4}" text-anchor="end">${number(v)}</text>`;}).join('');
    const annualPoints=points.filter(p=>!p.current);
    const ticks=[...new Set(width < 600 ? [0,points.length-1] : [0,Math.floor((points.length-1)/2),points.length-1])].map(i=>`<text x="${x(points[i])}" y="294" text-anchor="${i===points.length-1?'end':i===0?'start':'middle'}">${escape(points[i].label)}</text>`).join('');
    return `<svg class="history-chart" viewBox="0 0 ${width} 315" role="img" aria-labelledby="trendTitle trendDesc"><title id="trendTitle">${escape(label)} over time</title><desc id="trendDesc">Annual workbook observations with a separate gold point for the current capture. Exact values are in the table below. Vertical axis starts at zero.</desc>${grid}<polyline class="trend" points="${annualPoints.map(p=>`${x(p)},${y(p)}`).join(' ')}"/>${points.map(p=>`<circle class="${p.current?'current-point':''}" cx="${x(p)}" cy="${y(p)}" r="${p.current?6:4}"><title>${escape(p.label)}: ${number(p.value)}</title></circle>`).join('')}${ticks}</svg>`;
  }

  function history(data,current,annual,captureDate) {
    content.innerHTML = panel('Annual membership and ship trends', `<div class="info-controls"><label for="historyMeasure">Measure</label><select id="historyMeasure">${[...metrics,['multipleYouth','Multiple youth'],['primaryAdults','Primary adult registrations']].map(([key,label])=>`<option value="${key}">${label}</option>`).join('')}</select></div><div id="historyChart"></div><p class="info-note">Teal: annual workbook history. Gold: ${dateLabel(captureDate)} capture, shown separately because the current year is incomplete. Missing annual values are unavailable, never zero.</p><p class="info-note">${escape(data.history?.note || 'Annual history is unavailable in this capture.')}</p>`) +
      panel('Exact historical values', `<div id="historyValues"></div><p class="info-note">Source: ${escape(data.history?.sourceSheet || 'History worksheet unavailable')} in ${escape(data.meta.sourceCaptureName)}. Annual totals are used as recorded; they are not reconstructed from the slides or from primary plus multiple youth.</p>`);
    const update=()=>{
      const key=document.getElementById('historyMeasure').value;
      const label=[...metrics,['multipleYouth','Multiple youth'],['primaryAdults','Primary adult registrations']].find(m=>m[0]===key)[1];
      document.getElementById('historyChart').innerHTML=chart(annual,current,key,label,captureDate);
      document.getElementById('historyValues').innerHTML=table(['Period',label], [...annual.map(r=>row(`${r.year} annual`,[number(r[key])])),row(`${dateLabel(captureDate)} capture`,[number(current[key])])], label+' by source period');
    };
    document.getElementById('historyMeasure').addEventListener('change',update);window.addEventListener('resize',update);update();
  }

  function numbers(data,_current,_annual,captureDate) {
    content.innerHTML=panel('Where the numbers come from', `<p>The website reads a dated SeaScoutShips workbook capture. Current figures on these pages come from <strong>${escape(data.meta.sourceCaptureName)}</strong>, captured ${dateLabel(captureDate)}. The browser displays that published snapshot; it does not query live membership records.</p><p>Source workbook: <a href="${escape(data.meta.sourceUrl)}">Sea Scout Ships</a>. Current measures use Ships rows with a UnitID. Annual history uses only reviewed aggregate rows in 2010-202X Membership.</p>`) +
      panel('Measures and definitions', `<dl><dt>Total youth</dt><dd>Sum of Total Youth across included ship rows. This is a ship registration total, not a verified national unique-person count.</dd><dt>Primary youth</dt><dd>Sum of Primary Youth, using the workbook’s primary-registration designation.</dd><dt>Adult registrations</dt><dd>Sum of Total Adult. A primary adult breakdown is unavailable in the current Ships import.</dd><dt>Ships</dt><dd>Count of Ships rows with a UnitID. The website does not independently recertify unit status.</dd><dt>Youth per ship</dt><dd>Total youth divided by the number of included ships. This is a national weighted ratio, not an average of council averages.</dd><dt>Councils with ships</dt><dd>Distinct nonblank Council Name values in Ships. A percentage requires a separately verified list of all eligible councils.</dd><dt>Annual change</dt><dd>Current capture minus the latest earlier annual column. Percentage change divides that difference by the annual baseline. A missing or zero baseline produces Unavailable.</dd><dt>YOY fields on Ship Health</dt><dd>The main dashboard sums workbook-supplied Total Youth YOY and Primary YOY. Their comparison dates are not established by this import, so these informational pages do not relabel them as exact same-day comparisons.</dd></dl>`) +
      panel('Why another report may show a different total', `<p>Compare source dates first. Stephen’s status slides represent their source snapshot; today’s workbook should not be expected to reproduce an earlier report.</p><p>Definitions and source revisions also matter. The annual history table is preserved as recorded in this capture, even when it differs from figures shown in historical slides. Current partial-year captures stay separate from annual observations.</p><p>The Coming worksheet is an informational list and describes coming units as having zero total youth and zero total adults. Its setup requirements are marked tentative in the source. Official new ships, charter activity, coming units, and Ships rows tagged New are distinct measures; this page does not equate their counts.</p>`) +
      panel('Missing data and public fields', `<p>Annual missing cells and spreadsheet errors display as Unavailable. The existing Ships importer converts missing or unparseable numeric cells to zero and unrecognized training or health flags to false; check the workbook before interpreting an apparent zero or gap.</p><p>These pages add only aggregate history. The public CSV and ship data retain their approved fields and abbreviated skipper names. Contact emails, phone numbers, recruitment leads, and internal comments are excluded.</p><p><a href="../data/dashboard-data.json">Inspect the published data</a> · <a href="../data/ships.csv">Download the ship CSV</a> · <a href="help.html">Dashboard Help</a></p>`);
  }

  fetch('../data/dashboard-data.json', {cache:'no-store'}).then(response=>{
    if(!response.ok) throw new Error('Snapshot unavailable');return response.json();
  }).then(data=>{
    const captureDate=data.meta.sourceCaptureName.match(/\d{4}-\d{2}-\d{2}/)?.[0];
    if(!captureDate) throw new Error('Capture date unavailable');
    const current=derived({ships:data.ships.length,youth:data.summary.youth,primaryYouth:data.summary.primaryYouth,adults:data.summary.adults,councils:new Set(data.ships.map(s=>s.council).filter(Boolean)).size});
    const annual=(data.history?.annual || []).map(derived);
    document.getElementById('informationUpdated').textContent=`Capture: ${dateLabel(captureDate)}`;
    document.getElementById('informationSource').textContent=`${data.meta.sourceCaptureName} · Site data generated ${new Date(data.meta.generatedAt).toLocaleString('en-US',{timeZone:'America/Chicago',timeZoneName:'short'})}.`;
    ({status,history,numbers})[mode](data,current,annual,captureDate);
  }).catch(()=>{
    document.getElementById('informationSource').textContent='Source data could not be loaded.';
    content.innerHTML='<div class="panel info-error" role="alert">Unable to load the captured data. Reload this page, or return to <a href="index.html">Ship Health</a> to check the current snapshot.</div>';
  });
})();

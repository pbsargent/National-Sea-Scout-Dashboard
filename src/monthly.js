(() => {
  const content=document.getElementById('informationContent');
  const metrics=[['youth','Total youth'],['adults','Adult registrations'],['ships','Ships'],['average','Youth per ship']];
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const num=v=>v==null?'Unavailable':new Intl.NumberFormat('en-US',{maximumFractionDigits:1}).format(v);
  const signed=v=>v==null?'Unavailable':v!==0&&Math.abs(v)<0.05?`${v>0?'+':'-'}<0.1`:`${v>0?'+':''}${num(v)}`;
  const monthLabel=m=>new Date(m+'-01T12:00:00Z').toLocaleDateString('en-US',{month:'short',year:'numeric',timeZone:'UTC'});
  const dateLabel=d=>new Date(d+'T12:00:00Z').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'});
  const months=Array.from({length:12},(_,i)=>new Date(Date.UTC(2020,i,1)).toLocaleDateString('en-US',{month:'short',timeZone:'UTC'}));
  const panel=(title,body)=>`<section class="panel info-panel"><h2>${title}</h2>${body}</section>`;
  const colors=['var(--teal)','var(--navy)','var(--monthly-purple)','var(--monthly-orange)'];
  document.querySelector('.info-nav a[href^="monthly.html"]').setAttribute('aria-current','page');
  fetch('../data/dashboard-data.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error();return r.json();}).then(data=>{
    const rows=MonthlyModel.prepare(data.monthlyHistory?.observations||[]);
    document.getElementById('informationUpdated').textContent=`Monthly source: ${data.monthlyHistory?.sourceCaptureName || data.meta.sourceCaptureName}`;
    document.getElementById('informationSource').textContent=`TY History · ${data.monthlyHistory?.sourceCaptureName || data.meta.sourceCaptureName}`;
    if(!rows.length){content.innerHTML=panel('Monthly observations unavailable','<p>This capture does not contain monthly history. <a href="history.html">View annual membership history</a>.</p>');return;}
    const latest=rows.at(-1), years=[...new Set(rows.map(r=>r.month.slice(0,4)))];
    content.innerHTML=`<section class="info-metrics" aria-label="Latest monthly totals">${metrics.slice(0,3).map(([key,label])=>{const yoy=MonthlyModel.compare(rows,latest,key,12);return `<article class="score"><span>${label}</span><strong>${num(latest[key])}</strong><small>${dateLabel(latest.date)}<br>Year over year: ${signed(yoy.change)} (${signed(yoy.percent)}${yoy.percent==null?'':'%'})</small></article>`;}).join('')}</section>`+
      panel('Monthly national trends',`<div class="info-controls"><label for="monthlyMeasure">Measure</label><select id="monthlyMeasure">${metrics.map(([key,label])=>`<option value="${key}">${label}</option>`).join('')}</select><label for="monthlyYear">Year</label><select id="monthlyYear"><option value="all">All years</option>${years.map(y=>`<option>${y}</option>`).join('')}</select><label for="monthlyView">Graph</label><select id="monthlyView"><option value="timeline">Timeline</option><option value="seasonal" selected>Year-over-year comparison</option></select></div><div id="monthlyChart"></div><div id="monthlyLegend" class="monthly-legend"></div><p class="info-note">Missing months appear as gaps. Graph values are available by keyboard or pointer and in the table below. Youth per ship is total youth divided by ships.</p>`)+
      panel('Monthly values and changes','<button id="monthlyDownload" type="button">Download CSV</button><div id="monthlyTable"></div><p class="info-note">Changes compare the preceding calendar month and the same calendar month one year earlier. Missing comparisons display Unavailable. Summary cards always show the latest recorded month.</p>')+
      panel('About these observations',`<p>National Ship totals recorded in <a href="${esc(data.meta.sourceUrl)}#gid=751822894">TY History</a>. These are monthly observations; the February 2024 record is dated February 28. Counts are not independently verified unique-person totals.</p><p>Monthly observations, <a href="history.html">annual history</a>, and the <a href="status.html">current Ships capture</a> are separate sources and can differ. Values are preserved as supplied in each source; monthly December observations do not replace annual columns.</p><p>This page supports national totals only. Council, individual-ship, and primary-registration history are unavailable. <a href="help.html#monthly-trends">Read the Monthly Trends guide</a>.</p>`);
    let exported=[];
    const expandedYears=new Map();
    function update(){
      const key=document.getElementById('monthlyMeasure').value,label=metrics.find(m=>m[0]===key)[1],year=document.getElementById('monthlyYear').value;
      const selected=rows.filter(r=>year==='all'||r.month.startsWith(year));
      const seasonal=document.getElementById('monthlyView').value==='seasonal';
      const width=Math.max(320,Math.min(1150,document.getElementById('monthlyChart').clientWidth)),left=64,right=width-22,top=25,bottom=270;
      const max=Math.ceil(Math.max(1,...selected.map(r=>r[key]??0))*1.1/4)*4;
      const x=r=>left+(seasonal?(Number(r.month.slice(5))-1)/11:selected.indexOf(r)/Math.max(1,selected.length-1))*(right-left);
      const y=r=>bottom-r[key]/max*(bottom-top);
      const groups=seasonal?[...new Set(selected.map(r=>r.month.slice(0,4)))].map(year=>({label:year,rows:selected.filter(r=>r.month.startsWith(year))})):[{label:label,rows:selected}];
      let svg=Array.from({length:5},(_,i)=>{const value=max*i/4, yy=bottom-value/max*(bottom-top);return `<line class="grid" x1="${left}" x2="${right}" y1="${yy}" y2="${yy}"/><text x="${left-8}" y="${yy+4}" text-anchor="end">${num(value)}</text>`;}).join('');
      groups.forEach((group,i)=>{
        let segment=[];const segments=[];
        group.rows.forEach(r=>{if(r[key]==null){if(segment.length)segments.push(segment);segment=[];}else segment.push(r);});if(segment.length)segments.push(segment);
        svg+=segments.map(s=>`<polyline fill="none" stroke="${colors[i%4]}" stroke-width="3" stroke-dasharray="${i>=4?'6 4':'none'}" points="${s.map(r=>`${x(r)},${y(r)}`).join(' ')}"/>`).join('');
        svg+=group.rows.filter(r=>r[key]!=null).map(r=>{const tip=`${dateLabel(r.date)}: ${label} ${num(r[key])}`;return `<circle tabindex="0" aria-label="${esc(tip)}" cx="${x(r)}" cy="${y(r)}" r="4" style="fill:${colors[i%4]}"><title>${esc(tip)}</title></circle>`;}).join('');
      });
      const ticks=seasonal?months.map((label,i)=>({label,x:left+i/11*(right-left)})).filter((_,i)=>width>=650||i%2===0):selected.filter((r,i)=>i===0||i===selected.length-1||(width>650&&i%12===0)).map(r=>({label:monthLabel(r.month),x:x(r)}));
      svg+=ticks.map((t,i)=>`<text x="${t.x}" y="302" text-anchor="${i===0?'start':i===ticks.length-1?'end':'middle'}">${esc(t.label)}</text>`).join('');
      document.getElementById('monthlyChart').innerHTML=`<svg class="history-chart" viewBox="0 0 ${width} 325" role="img" aria-labelledby="monthlyTitle monthlyDesc"><title id="monthlyTitle">${esc(label)}: ${seasonal?'year-over-year comparison':'monthly timeline'}</title><desc id="monthlyDesc">${esc(year==='all'?'All recorded years':year)}. Vertical axis starts at zero. Missing months interrupt lines. Exact dated values follow in the table.</desc>${svg}</svg><div id="monthlyTooltip" class="monthly-tooltip" role="status" aria-live="polite">Select a graph point for its date and value.</div>`;
      document.querySelectorAll('#monthlyChart circle').forEach(point=>['focus','pointerenter'].forEach(event=>point.addEventListener(event,()=>{document.getElementById('monthlyTooltip').textContent=point.getAttribute('aria-label');})));
      document.getElementById('monthlyLegend').innerHTML=groups.map((g,i)=>`<span><i style="background:${colors[i%4]}"></i>${esc(g.label)}</span>`).join('');
      const headers=['Month','Observation date',label,'Monthly change','Monthly change %','Yearly change','Yearly change %'];
      exported=[headers,...selected.map(r=>{const mom=MonthlyModel.compare(rows,r,key,1),yoy=MonthlyModel.compare(rows,r,key,12);return [r.month,r.date??'Unavailable',r[key]??'Unavailable',mom.change??'Unavailable',mom.percent??'Unavailable',yoy.change??'Unavailable',yoy.percent??'Unavailable'];})];
      const tableYears=[...new Set(selected.map(r=>r.month.slice(0,4)))].reverse();
      document.getElementById('monthlyTable').innerHTML=tableYears.map(tableYear=>{
        const open=expandedYears.has(tableYear)?expandedYears.get(tableYear):(year!=='all'||tableYear===years.at(-1));
        const yearRows=selected.map((r,i)=>({r,values:exported[i+1]})).filter(({r})=>r.month.startsWith(tableYear));
        return `<details class="monthly-year" data-year="${tableYear}" ${open?'open':''}><summary>${tableYear}<span>${yearRows.length} months</span></summary><div class="info-table-wrap"><table class="info-table"><caption>${esc(label)} — ${tableYear}</caption><thead><tr>${headers.map(h=>`<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${yearRows.map(({r,values})=>`<tr><th scope="row">${monthLabel(r.month)}</th><td>${r.date?dateLabel(r.date):'Unavailable'}</td>${values.slice(2).map((v,j)=>`<td>${esc(j===0?num(typeof v==='number'?v:null):typeof v==='number'?signed(v)+(j===2||j===4?'%':''):'Unavailable')}</td>`).join('')}</tr>`).join('')}</tbody></table></div></details>`;
      }).join('');
      document.querySelectorAll('.monthly-year').forEach(section=>section.addEventListener('toggle',()=>expandedYears.set(section.dataset.year,section.open)));

    }
    ['monthlyMeasure','monthlyYear','monthlyView'].forEach(id=>document.getElementById(id).addEventListener('change',update));
    window.addEventListener('resize',update);
    document.getElementById('monthlyDownload').addEventListener('click',()=>{const csv=exported.map(row=>row.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=`sea-scout-monthly-${document.getElementById('monthlyMeasure').value}-${document.getElementById('monthlyYear').value}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
    update();
  }).catch(()=>{document.getElementById('informationSource').textContent='Monthly source data could not be loaded.';content.innerHTML=panel('Unable to load monthly trends','<p>Reload this page or return to <a href="index.html">Ship Health</a>.</p>');});
})();

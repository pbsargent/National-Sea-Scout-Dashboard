const SeaScoutBoard = (() => {
  const fmt = new Intl.NumberFormat("en-US");

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    })[char]);
  }

  function sumBy(rows, key) {
    return rows.reduce((total, row) => total + (Number(row[key]) || 0), 0);
  }

  function countBy(rows, key) {
    const counts = new Map();
    rows.forEach((row) => counts.set(row[key] || "Unassigned", (counts.get(row[key] || "Unassigned") || 0) + 1));
    return Array.from(counts, ([name, count]) => ({ name, count })).sort(
      (a, b) => b.count - a.count || String(a.name).localeCompare(String(b.name))
    );
  }

  function deltaText(value) {
    if (value > 0) return `+${fmt.format(value)} YOY`;
    if (value < 0) return `${fmt.format(value)} YOY`;
    return "Flat YOY";
  }

  function deltaClass(value) {
    if (value > 0) return "delta-positive";
    if (value < 0) return "delta-negative";
    return "";
  }

  function isRenewalWindow(ship, generatedAt) {
    if (!ship.renewalDate) return false;
    const today = new Date(generatedAt);
    const renewal = new Date(`${ship.renewalDate}T00:00:00`);
    const days = (renewal - today) / 86400000;
    return days >= 0 && days <= 120;
  }

  function renewalStatus(ship, generatedAt) {
    if (!ship.renewalDate) return "Unscheduled";
    if (isRenewalWindow(ship, generatedAt)) return "Next 120";
    const today = new Date(generatedAt);
    const renewal = new Date(`${ship.renewalDate}T00:00:00`);
    return renewal < today ? "Past" : "Later";
  }

  function healthLabel(ship, key) {
    return ship[key] ? "Healthy" : "Needs Attention";
  }

  function trainingLabel(ship) {
    if (ship.skipperTrained && ship.committeeTrained) return "Complete";
    if (ship.skipperTrained || ship.committeeTrained) return "Partial";
    return "Gap";
  }

  function metricLabel(ship) {
    if (ship.unitMetric >= 4) return "Strong";
    if (ship.unitMetric >= 2) return "Watch";
    return "Risk";
  }

  function statusClass(label) {
    const normalized = String(label).toLowerCase();
    if (["healthy", "complete", "strong"].includes(normalized)) return "good";
    if (["partial", "watch", "next 120"].includes(normalized)) return "warn";
    if (["needs attention", "gap", "risk", "past"].includes(normalized)) return "bad";
    return "neutral";
  }

  function countsFor(rows, getter) {
    const counts = new Map();
    rows.forEach((row) => {
      const label = getter(row);
      counts.set(label, (counts.get(label) || 0) + 1);
    });
    const order = {
      Healthy: 0,
      Complete: 0,
      Strong: 0,
      "Next 120": 1,
      Partial: 1,
      Watch: 1,
      Later: 2,
      "Needs Attention": 3,
      Gap: 3,
      Risk: 3,
      Past: 3,
      Unscheduled: 4,
    };
    return Array.from(counts, ([label, count]) => ({ label, count })).sort(
      (a, b) => (order[a.label] ?? 9) - (order[b.label] ?? 9) || a.label.localeCompare(b.label)
    );
  }

  function stageCell(rows, label, getter) {
    const counts = countsFor(rows, getter);
    const total = rows.length || 1;
    const main = counts[0] || { label: "None", count: 0 };
    return `
      <div class="stage-cell" title="${escapeHtml(counts.map((item) => `${item.label}: ${item.count}`).join("; "))}">
        <div class="bar-label"><span>${escapeHtml(label)}</span><span>${escapeHtml(main.label)} ${fmt.format(main.count)}</span></div>
        <div class="track stacked">
          ${counts.map((item) => `
            <span class="seg ${statusClass(item.label)}" style="width:${(item.count / total) * 100}%"></span>
          `).join("")}
        </div>
      </div>
    `;
  }

  function progressFor(rows) {
    if (!rows.length) return 0;
    const signals = rows.reduce((total, ship) => {
      return total
        + Number(Boolean(ship.sizeHealthy))
        + Number(Boolean(ship.growthHealthy))
        + Number(Boolean(ship.advancementHealthy))
        + Number(Boolean(ship.outdoorHealthy))
        + Number(Boolean(ship.skipperTrained && ship.committeeTrained))
        + Number(ship.unitMetric >= 3);
    }, 0);
    return Math.round((signals / (rows.length * 6)) * 100);
  }

  function groupRows(rows, key) {
    const groups = new Map();
    rows.forEach((row) => {
      const name = row[key] || "Unassigned";
      if (!groups.has(name)) groups.set(name, []);
      groups.get(name).push(row);
    });
    return Array.from(groups, ([name, groupRowsForName]) => ({
      name,
      rows: groupRowsForName,
      youth: sumBy(groupRowsForName, "youth"),
    }));
  }

  function numericSort(a, b) {
    const aNumber = Number(a.name);
    const bNumber = Number(b.name);
    if (Number.isFinite(aNumber) && Number.isFinite(bNumber)) return aNumber - bNumber;
    if (Number.isFinite(aNumber)) return -1;
    if (Number.isFinite(bNumber)) return 1;
    return String(a.name).localeCompare(String(b.name));
  }

  function councilSort(a, b) {
    return b.rows.length - a.rows.length || b.youth - a.youth || a.name.localeCompare(b.name);
  }

  function shipSort(a, b) {
    return b.youth - a.youth || String(a.shipNumber || a.unitId).localeCompare(String(b.shipNumber || b.unitId));
  }

  function rowStages(rows, generatedAt) {
    return `
      ${stageCell(rows, "Size", (ship) => healthLabel(ship, "sizeHealthy"))}
      ${stageCell(rows, "Growth", (ship) => healthLabel(ship, "growthHealthy"))}
      ${stageCell(rows, "Advance", (ship) => healthLabel(ship, "advancementHealthy"))}
      ${stageCell(rows, "Outdoor", (ship) => healthLabel(ship, "outdoorHealthy"))}
      ${stageCell(rows, "Training", trainingLabel)}
      ${stageCell(rows, "Renewal", (ship) => renewalStatus(ship, generatedAt))}
      ${stageCell(rows, "Metric", metricLabel)}
    `;
  }

  function shipPills(ship, generatedAt) {
    return [
      ["Size", healthLabel(ship, "sizeHealthy")],
      ["Growth", healthLabel(ship, "growthHealthy")],
      ["Advance", healthLabel(ship, "advancementHealthy")],
      ["Outdoor", healthLabel(ship, "outdoorHealthy")],
      ["Training", trainingLabel(ship)],
      ["Renewal", renewalStatus(ship, generatedAt)],
      ["Metric", metricLabel(ship)],
    ].map(([label, value]) => `<span class="status-chip ${statusClass(value)}" title="${escapeHtml(label)}">${escapeHtml(value)}</span>`).join("");
  }

  function daysUntilRenewal(ship, generatedAt) {
    if (!ship.renewalDate) return null;
    const today = new Date(generatedAt);
    const renewal = new Date(`${ship.renewalDate}T00:00:00`);
    return Math.ceil((renewal - today) / 86400000);
  }

  function statusExplanationRows(ship, generatedAt) {
    const renewalDays = daysUntilRenewal(ship, generatedAt);
    const workbookFlag = (field, healthy) => {
      return `${field} workbook flag is ${healthy ? "Yes" : "not Yes"}. The workbook provides this final Yes/No indicator.`;
    };
    const trainingReason = ship.skipperTrained && ship.committeeTrained
      ? "Skipper trained and Committee Chair trained are both Yes."
      : ship.skipperTrained || ship.committeeTrained
        ? `Only ${ship.skipperTrained ? "Skipper trained" : "Committee Chair trained"} is Yes.`
        : "Neither Skipper trained nor Committee Chair trained is Yes.";
    const renewalReason = !ship.renewalDate
      ? "No renewal month/date is present in the workbook."
      : renewalStatus(ship, generatedAt) === "Next 120"
        ? `${ship.renewal || ship.renewalDate} is ${fmt.format(renewalDays)} days from the dashboard refresh date, inside the 120-day window.`
        : renewalStatus(ship, generatedAt) === "Past"
          ? `${ship.renewal || ship.renewalDate} is before the dashboard refresh date.`
          : `${ship.renewal || ship.renewalDate} is ${fmt.format(renewalDays)} days from the dashboard refresh date, outside the 120-day window.`;
    const metricReason = ship.unitMetric >= 4
      ? `Unit Metric is ${ship.unitMetric}, which is 4 or higher.`
      : ship.unitMetric >= 2
        ? `Unit Metric is ${ship.unitMetric}, which falls in the 2-3 watch range.`
        : `Unit Metric is ${ship.unitMetric}, which is below 2.`;
    return [
      ["Size", healthLabel(ship, "sizeHealthy"), workbookFlag("Size", ship.sizeHealthy)],
      ["Growth", healthLabel(ship, "growthHealthy"), workbookFlag("Growth", ship.growthHealthy)],
      ["Advance", healthLabel(ship, "advancementHealthy"), workbookFlag("20% Advance", ship.advancementHealthy)],
      ["Outdoor", healthLabel(ship, "outdoorHealthy"), workbookFlag("Outdoor", ship.outdoorHealthy)],
      ["Training", trainingLabel(ship), trainingReason],
      ["Renewal", renewalStatus(ship, generatedAt), renewalReason],
      ["Metric", metricLabel(ship), metricReason],
    ];
  }

  function renderStatusExplanations(ship, generatedAt) {
    return `
      <section class="status-explanations" aria-label="Status explanations">
        <h3>Status explanations</h3>
        <div class="status-explanation-grid">
          ${statusExplanationRows(ship, generatedAt).map(([name, value, reason]) => `
            <article class="status-explanation">
              <div>
                <span>${escapeHtml(name)}</span>
                <strong class="status-chip ${statusClass(value)}">${escapeHtml(value)}</strong>
              </div>
              <p>${escapeHtml(reason)}</p>
            </article>
          `).join("")}
        </div>
      </section>
    `;
  }

  function renderShipRow(ship, selectedId, generatedAt) {
    const selected = selectedId === ship.unitId ? " selected" : "";
    const nameLine = ship.shipName
      ? `<span class="row-meta"><b>Name:</b> ${escapeHtml(ship.shipName)}</span>`
      : "";
    return `
      <button class="ship-row${selected}" type="button" data-ship-id="${escapeHtml(ship.unitId)}">
        <strong>${escapeHtml(ship.shipNumber || ship.unitId)}</strong>
        <span class="ship-descriptor">
          ${nameLine}
          <span class="row-meta"><b>Focus:</b> ${escapeHtml(ship.focus || "Unspecified")}</span>
        </span>
        <span class="row-meta">${fmt.format(ship.youth)} youth · ${deltaText(ship.youthYoY).replace(" YOY", "")}</span>
        <span class="row-meta">${escapeHtml(ship.renewal || "Unscheduled")}</span>
        <span class="ship-statuses">${shipPills(ship, generatedAt)}</span>
      </button>
    `;
  }

  function detailValue(label, value, wide = false) {
    return `
      <div class="${wide ? "detail-wide" : ""}">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value || "n/a")}</strong>
      </div>
    `;
  }

  function renderDetail(target, rows, selectedId, generatedAt) {
    const ship = rows.find((item) => item.unitId === selectedId);
    if (!ship) {
      target.className = "ship-detail empty-state";
      target.textContent = "Select a ship row in the health board below to display detailed information here.";
      return;
    }
    target.className = "ship-detail detail-section";
    target.innerHTML = `
      <div class="detail-title">
        <strong>Ship ${escapeHtml(ship.shipNumber || ship.unitId)}</strong>
        <span>${escapeHtml(ship.council)} · CST ${escapeHtml(ship.cst)}</span>
      </div>
      <div class="detail-grid">
        ${detailValue("Youth", fmt.format(ship.youth))}
        ${detailValue("Youth YOY", deltaText(ship.youthYoY).replace(" YOY", ""))}
        ${detailValue("Primary youth", fmt.format(ship.primaryYouth))}
        ${detailValue("Primary YOY", deltaText(ship.primaryYoY).replace(" YOY", ""))}
        ${detailValue("Adults", fmt.format(ship.adult))}
        ${detailValue("Unit metric", ship.unitMetric)}
        ${detailValue("Renewal", ship.renewal || "Unscheduled")}
        ${detailValue("Renewal status", renewalStatus(ship, generatedAt))}
        ${detailValue("Skipper trained", ship.skipperTrained ? "Yes" : "No")}
        ${detailValue("Committee Chair trained", ship.committeeTrained ? "Yes" : "No")}
        ${detailValue("AUX district", ship.auxDistrict)}
        ${detailValue("Owner", ship.owner)}
        ${detailValue("District", ship.district, true)}
        ${detailValue("Ship name", ship.shipName, true)}
        ${detailValue("Ship focus", ship.focus, true)}
        ${detailValue("Charter organization", ship.charterOrganization, true)}
        ${detailValue("Skipper", ship.skipperName, true)}
      </div>
      ${renderStatusExplanations(ship, generatedAt)}
    `;
  }

  function renderNationalBoard({ rows, data, state, groupTarget, detailTarget }) {
    groupTarget.innerHTML = "";
    const cstGroups = groupRows(rows, "cst").sort(numericSort);
    groupTarget.innerHTML = cstGroups.map((cstGroup) => {
      const cstKey = String(cstGroup.name);
      const cstOpen = state.openCsts.has(cstKey);
      const councilGroups = groupRows(cstGroup.rows, "council").sort(councilSort);
      const progress = progressFor(cstGroup.rows);
      return `
        <article class="service-block${cstOpen ? " open" : ""}">
          <button class="service-row" type="button" data-cst="${escapeHtml(cstKey)}" aria-expanded="${cstOpen}">
            <div class="district-cell">
              <span class="district-stripe"></span>
              <span class="disclosure" aria-hidden="true">›</span>
              <span class="district-title">
                <strong>CST ${escapeHtml(cstKey)}</strong>
                <span>${fmt.format(cstGroup.rows.length)} ships · ${fmt.format(councilGroups.length)} councils · ${fmt.format(cstGroup.youth)} youth</span>
              </span>
            </div>
            <div class="progress-cell">
              <span class="progress-number">${progress}%</span>
              <div class="track"><div class="fill" style="--w:${progress}%"></div></div>
            </div>
            ${rowStages(cstGroup.rows, data.meta.generatedAt)}
          </button>
          <div class="district-list">
            ${councilGroups.map((councilGroup) => renderCouncilGroup(councilGroup, cstKey, data, state)).join("")}
          </div>
        </article>
      `;
    }).join("") || `<div class="empty-state">No ships match the current filters.</div>`;
    renderDetail(detailTarget, data.ships, state.selectedId, data.meta.generatedAt);
  }

  function renderCouncilGroup(group, cstKey, data, state) {
    const councilKey = `${cstKey}|${group.name}`;
    const open = state.openCouncils.has(councilKey);
    const progress = progressFor(group.rows);
    return `
      <article class="group-block${open ? " open" : ""}">
        <button class="group-row" type="button" data-council="${escapeHtml(councilKey)}" aria-expanded="${open}">
          <div class="district-cell">
            <span class="district-stripe"></span>
            <span class="disclosure" aria-hidden="true">›</span>
            <span class="district-title">
              <strong>${escapeHtml(group.name)}</strong>
              <span>${fmt.format(group.rows.length)} ships · ${fmt.format(group.youth)} youth</span>
            </span>
          </div>
          <div class="progress-cell">
            <span class="progress-number">${progress}%</span>
            <div class="track"><div class="fill" style="--w:${progress}%"></div></div>
          </div>
          ${rowStages(group.rows, data.meta.generatedAt)}
        </button>
        <div class="ship-list">
          ${group.rows.sort(shipSort).map((ship) => renderShipRow(ship, state.selectedId, data.meta.generatedAt)).join("")}
        </div>
      </article>
    `;
  }

  function renderCstBoard({ rows, data, state, groupTarget, detailTarget }) {
    const councilGroups = groupRows(rows, "council").sort(councilSort);
    groupTarget.innerHTML = councilGroups.map((group) => {
      const open = state.openCouncils.has(group.name);
      const progress = progressFor(group.rows);
      return `
        <article class="group-block${open ? " open" : ""}">
          <button class="group-row" type="button" data-council="${escapeHtml(group.name)}" aria-expanded="${open}">
            <div class="district-cell">
              <span class="district-stripe"></span>
              <span class="disclosure" aria-hidden="true">›</span>
              <span class="district-title">
                <strong>${escapeHtml(group.name)}</strong>
                <span>${fmt.format(group.rows.length)} ships · ${fmt.format(group.youth)} youth</span>
              </span>
            </div>
            <div class="progress-cell">
              <span class="progress-number">${progress}%</span>
              <div class="track"><div class="fill" style="--w:${progress}%"></div></div>
            </div>
            ${rowStages(group.rows, data.meta.generatedAt)}
          </button>
          <div class="ship-list">
            ${group.rows.sort(shipSort).map((ship) => renderShipRow(ship, state.selectedId, data.meta.generatedAt)).join("")}
          </div>
        </article>
      `;
    }).join("") || `<div class="empty-state">No ships match the current filters.</div>`;
    renderDetail(detailTarget, data.ships, state.selectedId, data.meta.generatedAt);
  }

  return {
    countBy,
    deltaClass,
    deltaText,
    escapeHtml,
    fmt,
    isRenewalWindow,
    renderCstBoard,
    renderNationalBoard,
    sumBy,
  };
})();

const state = {
  data: null,
  cst: null,
  openCouncils: new Set(),
  selectedId: null,
  filters: {
    search: "",
    owner: "All",
    aux: "All",
    focus: "All",
    quick: "all",
  },
};

const {
  countBy,
  deltaClass,
  deltaText,
  escapeHtml,
  fmt,
  isRenewalWindow,
  renderCstBoard,
  sumBy,
} = SeaScoutBoard;

function byId(id) {
  return document.getElementById(id);
}

function setText(id, value) {
  byId(id).textContent = value;
}

function optionList(values) {
  return ["All", ...Array.from(new Set(values)).sort((a, b) => a.localeCompare(b))];
}

function populateSelect(id, values) {
  byId(id).innerHTML = optionList(values)
    .map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`)
    .join("");
}

function matchesFilters(ship) {
  if (String(ship.cst) !== String(state.cst)) return false;
  const text = [
    ship.shipNumber,
    ship.shipName,
    ship.council,
    ship.district,
    ship.skipperName,
    ship.charterOrganization,
  ]
    .join(" ")
    .toLowerCase();
  const query = state.filters.search.toLowerCase().trim();
  if (query && !text.includes(query)) return false;
  if (state.filters.owner !== "All" && ship.owner !== state.filters.owner) return false;
  if (state.filters.aux !== "All" && ship.auxDistrict !== state.filters.aux) return false;
  if (state.filters.focus !== "All" && ship.focus !== state.filters.focus) return false;
  if (state.filters.quick === "growth" && ship.youthYoY <= 0) return false;
  if (
    state.filters.quick === "training" &&
    ship.skipperTrained &&
    ship.committeeTrained
  ) {
    return false;
  }
  if (state.filters.quick === "renewal" && !isRenewalWindow(ship, state.data.meta.generatedAt)) return false;
  return true;
}

function renderBars(id, rows, { valueKey = "count", labelKey = "name", limit = 10 } = {}) {
  const target = byId(id);
  const items = rows.slice(0, limit);
  const max = Math.max(...items.map((item) => item[valueKey]), 1);
  target.innerHTML = items
    .map((item) => {
      const value = item[valueKey];
      const pct = Math.max(3, Math.round((value / max) * 100));
      return `
        <div class="bar-row">
          <span class="bar-label" title="${escapeHtml(item[labelKey])}">${escapeHtml(item[labelKey])}</span>
          <span class="bar-track"><span class="bar-fill" style="--value:${pct}%"></span></span>
          <span>${fmt.format(value)}</span>
        </div>
      `;
    })
    .join("");
}

function sortedCstSummaries() {
  return Object.values(
    state.data.ships.reduce((acc, ship) => {
      const cst = ship.cst || "Unassigned";
      acc[cst] ||= { cst, ships: 0, youth: 0 };
      acc[cst].ships += 1;
      acc[cst].youth += ship.youth;
      return acc;
    }, {})
  ).sort((a, b) => {
    const aNumber = Number(a.cst);
    const bNumber = Number(b.cst);
    if (Number.isFinite(aNumber) && Number.isFinite(bNumber)) return aNumber - bNumber;
    if (Number.isFinite(aNumber)) return -1;
    if (Number.isFinite(bNumber)) return 1;
    return String(a.cst).localeCompare(String(b.cst));
  });
}

function renderCstLinks() {
  const target = byId("cstLinks");
  if (!target) return;
  target.innerHTML = sortedCstSummaries()
    .map((item) => {
      const active = String(item.cst) === String(state.cst);
      return `
        <a class="cst-link ${active ? "active" : ""}" href="cst.html?cst=${encodeURIComponent(item.cst)}"${active ? ' aria-current="page"' : ""}>
          <strong>CST ${escapeHtml(item.cst)}</strong>
          <span>${fmt.format(item.ships)} ships</span>
          <small>${fmt.format(item.youth)} youth</small>
        </a>
      `;
    })
    .join("");
}

function renderSummary(rows) {
  const ships = rows.length;
  const youth = sumBy(rows, "youth");
  const youthYoY = sumBy(rows, "youthYoY");
  const skipperRate = ships
    ? Math.round((rows.filter((ship) => ship.skipperTrained).length / ships) * 100)
    : 0;
  const committeeRate = ships
    ? Math.round((rows.filter((ship) => ship.committeeTrained).length / ships) * 100)
    : 0;
  const avgMetric = ships ? (sumBy(rows, "unitMetric") / ships).toFixed(2) : "0.00";
  const councilCount = new Set(rows.map((ship) => ship.council)).size;

  setText("shipCount", fmt.format(ships));
  setText("newShipCount", `${fmt.format(rows.filter((ship) => ship.status === "New").length)} new ships`);
  setText("youthCount", fmt.format(youth));
  setText("councilCount", fmt.format(councilCount));
  setText("trainingRate", `${skipperRate}% / ${committeeRate}%`);
  setText("avgMetric", avgMetric);
  byId("youthDelta").textContent = deltaText(youthYoY);
  byId("youthDelta").className = deltaClass(youthYoY);
  setText("filteredCount", `${fmt.format(ships)} ships in current view`);
}

function render() {
  const rows = state.data.ships.filter(matchesFilters);
  renderSummary(rows);
  setText("visibleCount", `${fmt.format(rows.length)} ships`);
  renderCstBoard({
    rows,
    data: state.data,
    state,
    groupTarget: byId("groupRows"),
    detailTarget: byId("shipDetail"),
  });
  renderBars("metricBars", countBy(rows, "metricBucket"), { limit: 8 });
  renderBars("focusBars", countBy(rows, "focus"), { limit: 8 });
  renderBars("auxBars", countBy(rows, "auxDistrict"), { limit: 8 });
  renderBars(
    "councilBars",
    Object.values(
      rows.reduce((acc, ship) => {
        acc[ship.council] ||= { name: ship.council, youth: 0 };
        acc[ship.council].youth += ship.youth;
        return acc;
      }, {})
    ).sort((a, b) => b.youth - a.youth),
    { valueKey: "youth", limit: 12 }
  );
  renderBars("renewalBars", countBy(rows, "renewal"), { limit: 10 });
}

function bindControls() {
  byId("searchInput").addEventListener("input", (event) => {
    state.filters.search = event.target.value;
    render();
  });
  byId("ownerFilter").addEventListener("change", (event) => {
    state.filters.owner = event.target.value;
    render();
  });
  byId("auxFilter").addEventListener("change", (event) => {
    state.filters.aux = event.target.value;
    render();
  });
  byId("focusFilter").addEventListener("change", (event) => {
    state.filters.focus = event.target.value;
    render();
  });
  document.querySelectorAll(".chip").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".chip").forEach((chip) => chip.classList.remove("active"));
      button.classList.add("active");
      state.filters.quick = button.dataset.filter;
      render();
    });
  });
  byId("collapseAll").addEventListener("click", () => {
    state.openCouncils.clear();
    state.selectedId = null;
    render();
  });
  byId("expandAll").addEventListener("click", () => {
    const rows = state.data.ships.filter(matchesFilters);
    rows.forEach((ship) => state.openCouncils.add(ship.council || "Unassigned"));
    render();
  });
  byId("groupRows").addEventListener("click", (event) => {
    const shipButton = event.target.closest("[data-ship-id]");
    const councilButton = event.target.closest("[data-council]");
    if (shipButton) {
      state.selectedId = shipButton.dataset.shipId;
      render();
      return;
    }
    if (councilButton) {
      const council = councilButton.dataset.council;
      if (state.openCouncils.has(council)) {
        state.openCouncils.delete(council);
        state.selectedId = null;
      } else {
        state.openCouncils.add(council);
      }
      render();
    }
  });
}

async function init() {
  state.cst = new URLSearchParams(window.location.search).get("cst") || "1";
  const response = await fetch("../data/dashboard-data.json");
  state.data = await response.json();
  document.title = `CST ${state.cst} Dashboard | National Sea Scout Dashboard`;
  setText("pageTitle", `CST ${state.cst} Dashboard`);
  const cstShips = state.data.ships.filter((ship) => String(ship.cst) === String(state.cst));
  if (!cstShips.length) {
    setText("updatedAt", "CST not found");
    return;
  }
  const generated = new Date(state.data.meta.generatedAt);
  setText(
    "updatedAt",
    `Updated ${generated.toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })}`
  );
  populateSelect("ownerFilter", cstShips.map((ship) => ship.owner));
  populateSelect("auxFilter", cstShips.map((ship) => ship.auxDistrict));
  populateSelect("focusFilter", cstShips.map((ship) => ship.focus));
  renderCstLinks();
  bindControls();
  render();
}

init().catch((error) => {
  console.error(error);
  setText("updatedAt", "Unable to load dashboard data");
});

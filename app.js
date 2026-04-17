(function () {
  const data = window.QUISH_VIZ_DATA;

  const listView = document.getElementById("list-view");
  const detailView = document.getElementById("detail-view");
  const householdList = document.getElementById("householdList");
  const detailBody = document.getElementById("detailBody");
  const searchInput = document.getElementById("searchInput");
  const backButton = document.getElementById("backButton");

  const state = {
    query: "",
    view: "list",
    selectedId: null,
    scrollY: 0,
  };

  // Flatten every household once, enrich with a "sibling" (same cluster, other year).
  const households = [];
  const householdById = new Map();

  data.clusters.forEach((cluster) => {
    cluster.households.forEach((h) => {
      households.push({
        ...h,
        clusterId: cluster.id,
      });
    });
  });

  households.forEach((h) => householdById.set(h.id, h));

  function siblingOf(h) {
    const cluster = data.clusters.find((c) => c.id === h.clusterId);
    if (!cluster || cluster.households.length < 2) return null;
    return (
      cluster.households.find(
        (other) => other.id !== h.id && other.census_year !== h.census_year
      ) || null
    );
  }

  function headMember(h) {
    return (
      h.members.find((m) =>
        String(m.relation || "").toLowerCase().includes("head")
      ) || h.members[0]
    );
  }

  function spouseMember(h) {
    return h.members.find((m) => {
      const r = String(m.relation || "").toLowerCase();
      return r.includes("wife") || r.includes("husband");
    });
  }

  function familyName(h) {
    const head = headMember(h);
    const spouse = spouseMember(h);
    if (head && spouse) {
      return `${head.firstname} & ${spouse.firstname} Quish`;
    }
    if (head) {
      return `${head.firstname} Quish`;
    }
    return "Quish household";
  }

  function placeLine(h) {
    const town = h.townland || h.label || "";
    const county = h.county || "";
    return [town, county].filter(Boolean).join(", ");
  }

  // ---------- List view ----------

  function matchesQuery(h) {
    if (!state.query) return true;
    const q = state.query.toLowerCase();
    const hay = [
      familyName(h),
      placeLine(h),
      String(h.census_year),
      ...h.names,
      ...h.members.map((m) => m.relation || ""),
    ]
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  }

  function sortHouseholds(list) {
    return list.slice().sort((a, b) => {
      const pa = placeLine(a).toLowerCase();
      const pb = placeLine(b).toLowerCase();
      if (pa !== pb) return pa.localeCompare(pb);
      return a.census_year - b.census_year;
    });
  }

  function renderList() {
    const visible = sortHouseholds(households.filter(matchesQuery));

    if (visible.length === 0) {
      householdList.innerHTML = `
        <div class="list-empty">
          No households found. Try a different name or place.
        </div>
      `;
      return;
    }

    householdList.innerHTML = visible
      .map((h) => {
        return `
          <button class="household-card" type="button" data-id="${h.id}">
            <div class="family-name">${familyName(h)}</div>
            <div class="place">${placeLine(h)}</div>
            <div class="meta">${h.census_year} · ${h.members.length} ${
          h.members.length === 1 ? "person" : "people"
        }</div>
          </button>
        `;
      })
      .join("");
  }

  householdList.addEventListener("click", (e) => {
    const card = e.target.closest(".household-card");
    if (!card) return;
    const id = card.getAttribute("data-id");
    openDetail(id);
  });

  searchInput.addEventListener("input", (e) => {
    state.query = e.target.value.trim();
    renderList();
  });

  // ---------- Detail view ----------

  function groupMembers(h) {
    const groups = { parents: [], children: [], other: [] };
    h.members.forEach((m) => {
      const r = String(m.relation || "").toLowerCase();
      if (r.includes("head") || r.includes("wife") || r.includes("husband")) {
        groups.parents.push(m);
      } else if (
        r.includes("son") ||
        r.includes("daughter") ||
        r.includes("grand") ||
        r.includes("step")
      ) {
        groups.children.push(m);
      } else {
        groups.other.push(m);
      }
    });
    return groups;
  }

  function prettyRelation(m) {
    if (!m.relation) return "";
    const r = m.relation.trim();
    return r.charAt(0).toUpperCase() + r.slice(1).toLowerCase();
  }

  function renderPerson(m) {
    const ageBits = m.age ? `, ${m.age}` : "";
    const relation = prettyRelation(m);
    const birth = m.birthplace ? `Born in ${m.birthplace}` : "";
    const occ = m.occupation ? m.occupation : "";
    const link = m.record_url
      ? `<a class="record-link" href="${m.record_url}" target="_blank" rel="noopener noreferrer">View original record</a>`
      : "";
    return `
      <div class="person">
        <div class="name">${m.firstname}${ageBits}</div>
        ${relation ? `<div class="relation">${relation}</div>` : ""}
        ${birth ? `<div class="birthplace">${birth}</div>` : ""}
        ${occ ? `<div class="occupation">${occ}</div>` : ""}
        ${link}
      </div>
    `;
  }

  function renderSection(title, members) {
    if (!members.length) return "";
    return `
      <section class="detail-section">
        <h2>${title}</h2>
        <div class="person-list">
          ${members.map(renderPerson).join("")}
        </div>
      </section>
    `;
  }

  function renderSibling(sibling) {
    if (!sibling) return "";
    return `
      <section class="detail-section">
        <button class="sibling-card" type="button" data-id="${sibling.id}">
          <div class="sibling-label">Likely the same family in ${sibling.census_year}</div>
          <div class="sibling-name">${familyName(sibling)}</div>
          <div class="sibling-meta">${placeLine(sibling)}</div>
        </button>
      </section>
    `;
  }

  function renderDetail(h) {
    const groups = groupMembers(h);
    const sibling = siblingOf(h);
    detailBody.innerHTML = `
      <h1 class="detail-title" id="detailTitle">${familyName(h)}</h1>
      <p class="detail-subtitle">${placeLine(h)} · ${h.census_year}</p>
      ${renderSection("Parents", groups.parents)}
      ${renderSection("Children", groups.children)}
      ${renderSection("Other relatives", groups.other)}
      ${renderSibling(sibling)}
    `;

    detailBody.querySelectorAll(".sibling-card").forEach((btn) => {
      btn.addEventListener("click", () => {
        openDetail(btn.getAttribute("data-id"));
      });
    });
  }

  // ---------- View transitions ----------

  function openDetail(id) {
    const h = householdById.get(id);
    if (!h) return;
    state.scrollY = window.scrollY;
    state.selectedId = id;
    state.view = "detail";
    renderDetail(h);
    swapViews(listView, detailView, "forward");
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "auto" }));
  }

  function closeDetail() {
    state.view = "list";
    swapViews(detailView, listView, "back");
    requestAnimationFrame(() =>
      window.scrollTo({ top: state.scrollY, behavior: "auto" })
    );
  }

  function swapViews(outgoing, incoming, direction) {
    incoming.classList.remove("view-visible");
    if (direction === "back") {
      incoming.classList.add("view-enter-from-left");
    } else {
      incoming.classList.remove("view-enter-from-left");
    }
    // Force a reflow so the initial state is applied before transition.
    void incoming.offsetWidth;

    outgoing.classList.remove("view-visible");
    outgoing.setAttribute("aria-hidden", "true");

    incoming.classList.add("view-visible");
    incoming.classList.remove("view-enter-from-left");
    incoming.setAttribute("aria-hidden", "false");
  }

  backButton.addEventListener("click", closeDetail);

  window.addEventListener("popstate", () => {
    if (state.view === "detail") closeDetail();
  });

  // ---------- Init ----------

  renderList();
})();

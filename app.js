(function () {
  const data = window.QUISH_VIZ_DATA;

  const state = {
    county: "All counties",
    query: "",
    showSingles: false,
    selectedHouseholdId: null,
  };

  const metricGrid = document.getElementById("metricGrid");
  const countyFilter = document.getElementById("countyFilter");
  const searchInput = document.getElementById("searchInput");
  const showSingles = document.getElementById("showSingles");
  const clusterList = document.getElementById("clusterList");
  const clusterCountLabel = document.getElementById("clusterCountLabel");
  const detailPanel = document.getElementById("detailPanel");
  const variantList = document.getElementById("variantList");

  function renderMetrics() {
    const metrics = [
      ["Exact census records", data.meta.exactRecordCount],
      ["Households", data.meta.householdCount],
      ["Connected clusters", data.meta.clusterCount],
      ["Standalone households", data.meta.standaloneCount],
    ];

    metricGrid.innerHTML = metrics
      .map(
        ([label, value]) => `
          <div class="metric-card">
            <span>${label}</span>
            <strong>${value}</strong>
          </div>
        `
      )
      .join("");
  }

  function renderCountyFilter() {
    countyFilter.innerHTML = [
      "All counties",
      ...data.meta.counties,
    ]
      .map(
        (county) =>
          `<option value="${county}" ${
            county === state.county ? "selected" : ""
          }>${county}</option>`
      )
      .join("");
  }

  function clusterMatches(cluster) {
    if (
      state.county !== "All counties" &&
      !cluster.counties.includes(state.county)
    ) {
      return false;
    }

    if (!state.showSingles && cluster.type === "single") {
      return false;
    }

    if (!state.query) {
      return true;
    }

    const haystack = [
      cluster.title,
      cluster.summary,
      ...cluster.households.map((household) => household.label),
      ...cluster.households.flatMap((household) => household.names),
      ...cluster.households.flatMap((household) =>
        household.members.map((member) => member.relation || "")
      ),
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(state.query.toLowerCase());
  }

  function getVisibleClusters() {
    return data.clusters.filter(clusterMatches);
  }

  function headMember(household) {
    return (
      household.members.find((member) =>
        String(member.relation || "").toLowerCase().includes("head")
      ) || household.members[0]
    );
  }

  function relationText(member) {
    return String(member.relation || "").toLowerCase();
  }

  function spouseMember(household) {
    return household.members.find((member) => {
      const relation = relationText(member);
      return relation.includes("wife") || relation.includes("husband");
    });
  }

  function householdFamilyLabel(household) {
    const head = headMember(household);
    const spouse = spouseMember(household);
    if (head && spouse) {
      return `${head.firstname} + ${spouse.firstname} Quish family`;
    }
    if (head) {
      return `${head.firstname} Quish household`;
    }
    return "Quish household";
  }

  function memberLinks(member) {
    const links = [];
    if (member.record_url) {
      links.push(
        `<a href="${member.record_url}" target="_blank" rel="noopener noreferrer">Record page</a>`
      );
    }
    if (member.form_a_pdf_url) {
      links.push(
        `<a href="${member.form_a_pdf_url}" target="_blank" rel="noopener noreferrer">Form A PDF</a>`
      );
    }
    return links.join("");
  }

  function classifyMembers(household) {
    const groups = {
      parents: [],
      children: [],
      otherRelatives: [],
      nonFamily: [],
    };

    household.members.forEach((member) => {
      const relation = relationText(member);
      if (
        relation.includes("head") ||
        relation.includes("wife") ||
        relation.includes("husband")
      ) {
        groups.parents.push(member);
      } else if (
        relation.includes("son") ||
        relation.includes("daughter") ||
        relation.includes("grand") ||
        relation.includes("step")
      ) {
        groups.children.push(member);
      } else if (
        relation.includes("brother") ||
        relation.includes("sister") ||
        relation.includes("aunt") ||
        relation.includes("uncle") ||
        relation.includes("niece") ||
        relation.includes("nephew") ||
        relation.includes("cousin") ||
        relation.includes("relative") ||
        relation.includes("father") ||
        relation.includes("mother")
      ) {
        groups.otherRelatives.push(member);
      } else {
        groups.nonFamily.push(member);
      }
    });

    return groups;
  }

  function renderTreePerson(member) {
    return `
      <article class="tree-person">
        <strong>
          <a href="${member.record_url}" target="_blank" rel="noopener noreferrer">
            ${member.firstname}${member.age ? `, ${member.age}` : ""}
          </a>
        </strong>
        <p>${member.relation || "relation not stated"}</p>
        <p>${member.birthplace || "birthplace not stated"}</p>
        <p>${member.occupation || "occupation not stated"}</p>
        <p class="record-links">${memberLinks(member)}</p>
      </article>
    `;
  }

  function renderBranch(title, members, branchClass) {
    if (!members.length) {
      return "";
    }

    return `
      <section class="tree-branch ${branchClass}">
        <p class="tree-branch-label">${title}</p>
        <div class="tree-generation">
          ${members.map(renderTreePerson).join("")}
        </div>
      </section>
    `;
  }

  function renderHouseholdTree(household, isSelected) {
    const groups = classifyMembers(household);
    return `
      <section class="household-tree ${isSelected ? "selected" : ""}">
        <div class="tree-household-head">
          <div>
            <p class="tree-year">${household.census_year}</p>
            <h3>${householdFamilyLabel(household)}</h3>
            <p class="muted">Townland / street: ${household.label}</p>
          </div>
          <div class="pill-row">
            <span class="pill">House ${household.house_number}</span>
            <span class="pill">${household.members.length} people</span>
          </div>
        </div>
        ${renderBranch("Parents / head", groups.parents, "parents")}
        ${
          groups.children.length
            ? `<div class="tree-spine" aria-hidden="true"></div>${renderBranch(
                "Children",
                groups.children,
                "children"
              )}`
            : ""
        }
        ${
          groups.otherRelatives.length
            ? renderBranch("Other relatives", groups.otherRelatives, "relatives")
            : ""
        }
        ${
          groups.nonFamily.length
            ? renderBranch("Boarders / non-family", groups.nonFamily, "non-family")
            : ""
        }
      </section>
    `;
  }

  function renderHouseholdCard(household, cluster) {
    const head = headMember(household);
    const activeClass =
      household.id === state.selectedHouseholdId ? "active" : "";
    const names = household.names.slice(0, 4).join(", ");
    const headLine = head.record_url
      ? `Head: <a href="${head.record_url}" target="_blank" rel="noopener noreferrer">${head.firstname}${head.age ? `, ${head.age}` : ""}</a>`
      : `Head: ${head.firstname}${head.age ? `, ${head.age}` : ""}`;
    const householdFormLink = household.members.find(
      (member) => member.form_a_pdf_url
    )?.form_a_pdf_url;
    return `
      <button class="household-card ${activeClass}" data-household-id="${household.id}" data-cluster-id="${cluster.id}">
        <h4>${householdFamilyLabel(household)}</h4>
        <p>Townland / street · ${household.county} · house ${household.house_number}</p>
        <p>${headLine}</p>
        <div class="pill-row">
          <span class="pill">${household.members.length} people</span>
          <span class="pill">${household.census_year}</span>
        </div>
        <div class="pill-row">
          <span class="pill">${names}</span>
        </div>
        ${
          householdFormLink
            ? `<p class="card-link-row"><a href="${householdFormLink}" target="_blank" rel="noopener noreferrer">Open household form</a></p>`
            : ""
        }
      </button>
    `;
  }

  function renderBridge(cluster) {
    if (cluster.type === "single") {
      return `
        <div class="bridge">
          <span class="type-badge single">single</span>
        </div>
      `;
    }

    const topEdge = cluster.edges[0];
    const scoreLabel = topEdge ? `score ${topEdge.score}` : "linked";
    return `
      <div class="bridge">
        <span class="type-badge connected">linked</span>
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <path d="M12 22 C40 22, 60 22, 88 22" fill="none" stroke="#8aa7a8" stroke-width="2" />
          <path d="M12 50 C40 50, 60 50, 88 50" fill="none" stroke="#8aa7a8" stroke-width="2" stroke-dasharray="4 4" />
          <path d="M12 78 C40 78, 60 78, 88 78" fill="none" stroke="#8aa7a8" stroke-width="2" />
          <circle cx="50" cy="50" r="8" fill="#ddeceb" stroke="#2d6a6d" />
        </svg>
        <span class="score-badge">${scoreLabel}</span>
      </div>
    `;
  }

  function renderClusters() {
    const visibleClusters = getVisibleClusters();
    clusterCountLabel.textContent = `${visibleClusters.length} shown`;

    if (visibleClusters.length === 0) {
      clusterList.innerHTML = `
        <div class="empty-state">
          No clusters match the current filters.
        </div>
      `;
      return;
    }

    clusterList.innerHTML = visibleClusters
      .map((cluster) => {
        const households1901 = cluster.households.filter(
          (household) => household.census_year === 1901
        );
        const households1911 = cluster.households.filter(
          (household) => household.census_year === 1911
        );

        return `
          <article class="cluster cluster-${cluster.type}">
            <div class="cluster-header">
              <div class="cluster-title">
                <h3>${cluster.title}</h3>
                <p>${cluster.summary}</p>
              </div>
              <span class="type-badge ${cluster.type}">
                ${cluster.type === "connected" ? "connected" : "single"}
              </span>
            </div>
            <div class="cluster-flow">
              <div class="year-stack">
                <p class="year-label">1901</p>
                ${
                  households1901.length
                    ? households1901
                        .map((household) => renderHouseholdCard(household, cluster))
                        .join("")
                    : `<div class="empty-state">No 1901 household in this cluster.</div>`
                }
              </div>
              ${renderBridge(cluster)}
              <div class="year-stack">
                <p class="year-label">1911</p>
                ${
                  households1911.length
                    ? households1911
                        .map((household) => renderHouseholdCard(household, cluster))
                        .join("")
                    : `<div class="empty-state">No 1911 household in this cluster.</div>`
                }
              </div>
            </div>
          </article>
        `;
      })
      .join("");

    clusterList.querySelectorAll("[data-household-id]").forEach((button) => {
      button.addEventListener("click", () => {
        state.selectedHouseholdId = button.getAttribute("data-household-id");
        renderClusters();
        renderDetails();
      });
    });
  }

  function findSelectedHousehold() {
    for (const cluster of data.clusters) {
      const household = cluster.households.find(
        (item) => item.id === state.selectedHouseholdId
      );
      if (household) {
        return { cluster, household };
      }
    }
    return null;
  }

  function renderDetails() {
    const selected = findSelectedHousehold();

    if (!selected) {
      detailPanel.innerHTML = `
        <div class="detail-empty">
          <h2>Household details</h2>
          <p>
            Click any household card to inspect the members, the place, and the
            continuity evidence for that cluster.
          </p>
        </div>
      `;
      return;
    }

    const { cluster, household } = selected;
    const relatedEdges = cluster.edges.filter(
      (edge) => edge.from === household.id || edge.to === household.id
    );
    const head = headMember(household);
    const clusterHouseholds = [...cluster.households].sort(
      (a, b) =>
        a.census_year - b.census_year ||
        a.townland.localeCompare(b.townland) ||
        String(a.house_number).localeCompare(String(b.house_number))
    );

    detailPanel.innerHTML = `
      <div class="detail-header">
        <span class="detail-kicker">${cluster.type} cluster</span>
        <h2>${householdFamilyLabel(household)}</h2>
        <p class="muted">Townland / street: ${household.label} · census year ${household.census_year}</p>
      </div>

      <div class="detail-grid">
        <div class="detail-block">
          <h4>Household summary</h4>
          <p class="meta-line">Head: <strong>${head.firstname}</strong></p>
          <p class="meta-line">Members: <strong>${household.members.length}</strong></p>
          <p class="meta-line">House number: <strong>${household.house_number}</strong></p>
          <p class="meta-line">Image group: <strong>${household.image_group}</strong></p>
        </div>

        <div class="detail-block">
          <h4>Continuity evidence</h4>
          ${
            relatedEdges.length
              ? relatedEdges
                  .map(
                    (edge) => `
                      <div class="member-item">
                        <strong>${edge.place}</strong>
                        <p>Shared names: ${edge.overlap.join(", ")}</p>
                        <p>
                          Score ${edge.score} = ${edge.score_breakdown.sharedNamePoints} shared-name points
                          + ${edge.score_breakdown.ageProgressionPoints} age-progression points
                          + ${edge.score_breakdown.headBonus} head bonus
                        </p>
                        <p>
                          Ages: ${
                            edge.plausible_age_progressions.length
                              ? edge.plausible_age_progressions
                                  .map(
                                    (progression) =>
                                      `${progression.name} ${progression.from}→${progression.to}`
                                  )
                                  .join(", ")
                              : "No clean age progression captured"
                          }
                        </p>
                      </div>
                    `
                  )
                  .join("")
              : `<p class="muted">This household is not linked to another household by the current continuity rules.</p>`
          }
        </div>

        <div class="detail-block">
          <h4>Score logic</h4>
          <p>${data.meta.scoreFormula}</p>
        </div>
      </div>

      <div class="detail-block">
        <h4>Family tree view</h4>
        <p class="muted tree-note">This can show parent, child, aunt, uncle, cousin, niece or nephew relationships only when the census explicitly states them inside the household.</p>
        <div class="tree-cluster">
          ${clusterHouseholds
            .map((item) =>
              renderHouseholdTree(item, item.id === household.id)
            )
            .join("")}
        </div>
      </div>
    `;
  }

  function renderVariants() {
    variantList.innerHTML = data.variants
      .map(
        (variant) => `
          <div class="variant-item">
            <strong>${variant.surname} · ${variant.census_year}</strong>
            <p>${variant.townland}, ${variant.county}</p>
            <p>House ${variant.house_number}</p>
            <p>${variant.members.map((member) => member.firstname).join(", ")}</p>
          </div>
        `
      )
      .join("");
  }

  function syncSelection() {
    const visibleClusters = getVisibleClusters();
    const householdIds = visibleClusters.flatMap((cluster) =>
      cluster.households.map((household) => household.id)
    );

    if (!householdIds.includes(state.selectedHouseholdId)) {
      state.selectedHouseholdId = householdIds[0] || null;
    }
  }

  function update() {
    syncSelection();
    renderClusters();
    renderDetails();
  }

  countyFilter.addEventListener("change", (event) => {
    state.county = event.target.value;
    update();
  });

  searchInput.addEventListener("input", (event) => {
    state.query = event.target.value.trim();
    update();
  });

  showSingles.addEventListener("change", (event) => {
    state.showSingles = event.target.checked;
    update();
  });

  renderMetrics();
  renderCountyFilter();
  renderVariants();
  update();
})();

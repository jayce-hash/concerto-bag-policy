let bagData = {};
let venuesList = [];

const searchInput = document.getElementById("venueSearch");
const searchResultsEl = document.getElementById("searchResults");

const infoPanel = document.getElementById("infoPanel");
const infoContent = document.querySelector(".info-content");
const infoEmptyEl = document.querySelector(".info-empty");
const browseListEl = document.getElementById("browseList");

const venueNameEl = document.getElementById("venueName");
const venueLocationEl = document.getElementById("venueLocation");

const bagSummaryEl = document.getElementById("bagSummary");
const allowedCardEl = document.getElementById("allowedCard");
const allowedListEl = document.getElementById("allowedList");
const notAllowedCardEl = document.getElementById("notAllowedCard");
const notAllowedListEl = document.getElementById("notAllowedList");
const extraCardEl = document.getElementById("extraCard");
const extraTextEl = document.getElementById("extraText");
const officialCardEl = document.getElementById("officialCard");
const bagLinkEl = document.getElementById("bagLink");

// Fetch JSON (Using absolute path so custom URLs don't break it)
fetch("/data/bag_policies.json")
  .then((res) => res.json())
  .then((data) => {
    bagData = data || {};
    venuesList = buildVenuesList(bagData);
    renderBrowseList();    // no-op now if there's no browseList element
    handleDeepLink();      // support clean URLs, hashes, and ?venue=slug
  })
  .catch((err) => {
    console.error("Error loading bag_policies.json", err);
  });

function buildVenuesList(data) {
  const items = [];
  for (const slug in data) {
    const v = data[slug] || {};

    // Prefer official venueName, fall back to prettified slug
    const displayName = v.venueName || prettifySlug(slug);

    const city = v.city || "";
    const state = v.state || "";

    let label = displayName;
    if (city || state) {
      const loc = [city, state].filter(Boolean).join(", ");
      label = `${displayName} — ${loc}`;
    }

    items.push({
      slug,
      label,
      city,
      state,
      displayName
    });
  }

  return items.sort((a, b) => a.displayName.localeCompare(b.displayName));
}

function prettifySlug(slug) {
  if (!slug) return "";
  return slug
    .split("_")
    .map((p) => (p ? p.charAt(0).toUpperCase() + p.slice(1) : ""))
    .join(" ");
}

function renderBrowseList() {
  if (!browseListEl || !venuesList.length) return;

  const shuffled = [...venuesList];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const sample = shuffled.slice(0, 12);

  browseListEl.innerHTML = sample
    .map(
      (v) =>
        `<div class="browse-item" data-slug="${v.slug}">
          ${v.label}
        </div>`
    )
    .join("");
}

// Search suggestions
searchInput.addEventListener("input", () => {
  const q = searchInput.value.trim().toLowerCase();
  if (!q) {
    searchResultsEl.classList.remove("visible");
    searchResultsEl.innerHTML = "";
    if (browseListEl) browseListEl.style.display = "block";
    return;
  }

  if (browseListEl) browseListEl.style.display = "none";

  const matches = venuesList.filter((v) =>
    v.displayName.toLowerCase().includes(q)
  );

  if (!matches.length) {
    searchResultsEl.classList.remove("visible");
    searchResultsEl.innerHTML = "";
    return;
  }

  searchResultsEl.innerHTML = matches
    .map(
      (v) =>
        `<div class="search-result-item" data-slug="${v.slug}">
          ${v.label}
        </div>`
    )
    .join("");

  searchResultsEl.classList.add("visible");
});

// Click on search result
searchResultsEl.addEventListener("click", (evt) => {
  const item = evt.target.closest(".search-result-item");
  if (!item) return;
  const slug = item.getAttribute("data-slug");
  const venue = venuesList.find((v) => v.slug === slug);
  if (!venue) return;

  searchInput.value = venue.displayName;
  searchResultsEl.classList.remove("visible");
  showVenue(slug);
});

// Click on browse item (safe even if browseListEl is missing)
if (browseListEl) {
  browseListEl.addEventListener("click", (evt) => {
    const item = evt.target.closest(".browse-item");
    if (!item) return;
    const slug = item.getAttribute("data-slug");
    showVenue(slug);
  });
}

// Hide dropdown when clicking away
document.addEventListener("click", (evt) => {
  if (!searchResultsEl.contains(evt.target) && evt.target !== searchInput) {
    searchResultsEl.classList.remove("visible");
  }
});

function showVenue(slug) {
  const v = bagData[slug];
  if (!v) return;

  infoPanel.classList.remove("info-panel--empty");
  infoContent.hidden = false;
  if (infoEmptyEl) infoEmptyEl.style.display = "none";

  // Use venueName first, fall back to slug prettified
  const displayName = v.venueName || prettifySlug(slug);
  venueNameEl.textContent = displayName;

  const locParts = [];
  if (v.city) locParts.push(v.city);
  if (v.state) locParts.push(v.state);
  venueLocationEl.textContent = locParts.join(", ");

  bagSummaryEl.textContent =
    v.summary ||
    "This venue follows a clear bag-style security policy. Check the official bag policy link for full details.";

  if (Array.isArray(v.allowed) && v.allowed.length) {
    allowedListEl.innerHTML = v.allowed.map((item) => `<li>${item}</li>`).join("");
    allowedCardEl.hidden = false;
  } else {
    allowedListEl.innerHTML = "";
    allowedCardEl.hidden = true;
  }

  if (Array.isArray(v.notAllowed) && v.notAllowed.length) {
    notAllowedListEl.innerHTML = v.notAllowed
      .map((item) => `<li>${item}</li>`)
      .join("");
    notAllowedCardEl.hidden = false;
  } else {
    notAllowedListEl.innerHTML = "";
    notAllowedCardEl.hidden = true;
  }

  if (v.note && v.note.trim().length) {
    extraTextEl.textContent = v.note;
    extraCardEl.hidden = false;
  } else {
    extraTextEl.textContent = "";
    extraCardEl.hidden = true;
  }

  if (v.fullLink) {
    bagLinkEl.href = v.fullLink;
    officialCardEl.hidden = false;
  } else {
    bagLinkEl.href = "#";
    officialCardEl.hidden = true;
  }

  // --- THE MAGIC LINK UPDATER ---
  // Transforms "madison_square_garden" into "#madisonsquaregarden" for the URL bar
  const cleanUrl = slug.replace(/_/g, '');
  window.history.replaceState({}, '', '#' + cleanUrl);
}

// Deep-link / Magic Link Checker
function handleDeepLink() {
  const params = new URLSearchParams(window.location.search);
  const incomingQuery = params.get("venue");

  const hashPath = window.location.hash.replace(/^#\/?/, '').toLowerCase(); 
  const urlPath = window.location.pathname.replace(/^\/|\/$/g, '').toLowerCase(); 

  let targetSlug = null;

  // 1. Check for old ?venue= queries
  if (incomingQuery && bagData[incomingQuery]) {
    targetSlug = incomingQuery;
  } else {
    // 2. Check for clean URLs by stripping all hyphens, spaces, and underscores
    const searchString = (hashPath || urlPath).replace(/[^a-z0-9]/g, '');
    
    if (searchString && searchString !== 'indexhtml') {
      const match = venuesList.find(v => {
        // Strip out the underscores from the JSON keys for a direct comparison
        const cleanSlug = v.slug.replace(/[^a-z0-9]/g, '');
        const cleanName = v.displayName.toLowerCase().replace(/[^a-z0-9]/g, '');
        return cleanSlug === searchString || cleanName === searchString;
      });
      if (match) targetSlug = match.slug;
    }
  }

  // 3. Trigger the UI if we found a match
  if (targetSlug) {
    const meta = venuesList.find((v) => v.slug === targetSlug);
    if (meta && searchInput) {
      searchInput.value = meta.displayName;
    }
    showVenue(targetSlug);
  }
}

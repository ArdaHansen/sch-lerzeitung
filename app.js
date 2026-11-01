const defaultSite = {
  theme: {
    title: "Artikel folgt.",
    text: "Der erste Artikel erscheint bald."
  },
  appearance: {
    brand: "WIDA ON PAPER",
    background: "#f4f3ed",
    textColor: "#1b211a",
    accentColor: "#b7d64a",
    alignment: "center"
  },
  blocks: []
};

const categories = ["Allgemein", "Wichtig", "Eilmeldung", "WIDA", "Interview", "Startseite"];
const editorDialog = document.querySelector("#editorDialog");
const loginView = document.querySelector("#loginView");
const editorView = document.querySelector("#editorView");
const loginMessage = document.querySelector("#loginMessage");
const editorMessage = document.querySelector("#editorMessage");
const articleMessage = document.querySelector("#articleMessage");
const storyDialog = document.querySelector("#storyDialog");
let site = {
  theme: { ...defaultSite.theme },
  appearance: { ...defaultSite.appearance },
  blocks: []
};
let posts = [];
let activeCategory = "Alle";
let featuredPosts = [];
let featuredIndex = 0;
let featuredTimer;
let siteLoaded = false;
let isLoggedIn = false;

function setMessage(element, message, isError = false) {
  element.textContent = message;
  element.classList.toggle("is-error", isError);
}

async function requestApi(action, payload) {
  const options = {
    method: payload === undefined ? "GET" : "POST",
    credentials: "same-origin"
  };
  if (payload instanceof FormData) {
    options.body = payload;
  } else if (payload !== undefined) {
    options.headers = { "Content-Type": "application/json" };
    options.body = JSON.stringify(payload);
  }

  const response = await fetch(`api.php?action=${encodeURIComponent(action)}`, options);
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Die Anfrage ist fehlgeschlagen.");
  return result;
}

function applySite() {
  document.querySelector("#siteBrand").textContent = site.appearance.brand;
  document.querySelector("#footerBrand").textContent = site.appearance.brand;
  document.querySelector("#siteTitle").textContent = site.theme.title;
  document.querySelector("#siteText").textContent = site.theme.text;
  document.body.style.setProperty("--accent", site.appearance.accentColor);
  document.querySelector('meta[name="theme-color"]').content = site.appearance.background;
  document.querySelector('meta[name="description"]').content = `${site.appearance.brand} — ${site.theme.title} ${site.theme.text}`.trim();
  document.title = `${site.appearance.brand} — ${site.theme.title}`;
}

function fillEditor() {
  document.querySelector("#brandInput").value = site.appearance.brand;
  document.querySelector("#titleInput").value = site.theme.title;
  document.querySelector("#textInput").value = site.theme.text;
  document.querySelector("#backgroundInput").value = site.appearance.background;
  document.querySelector("#textColorInput").value = site.appearance.textColor;
  document.querySelector("#accentInput").value = site.appearance.accentColor;
  document.querySelector("#alignmentInput").value = site.appearance.alignment;
  updateStartPageCount();
}

function addStoryImage(container, src, alt) {
  container.replaceChildren();
  container.hidden = container.id === "storyImage" && !src;
  if (!src) return;
  const image = document.createElement("img");
  image.src = src;
  image.alt = alt;
  image.loading = "lazy";
  image.decoding = "async";
  container.append(image);
}

function openStory(post) {
  document.querySelector("#storyTitle").textContent = post.title;
  document.querySelector("#storyMeta").textContent = `${post.category} · ${post.author}`;
  document.querySelector("#storyTeaser").textContent = post.teaser;
  document.querySelector("#storyContent").textContent = post.content;
  addStoryImage(document.querySelector("#storyImage"), post.image, post.title);
  storyDialog.showModal();
}

function createStoryCard(post) {
  const card = document.createElement("article");
  card.className = "story-card";

  const imageButton = document.createElement("button");
  imageButton.className = "card-image";
  imageButton.type = "button";
  imageButton.setAttribute("aria-label", `Artikel öffnen: ${post.title}`);
  if (post.image) {
    const image = document.createElement("img");
    image.src = post.image;
    image.alt = "";
    image.loading = "lazy";
    image.decoding = "async";
    imageButton.append(image);
  }
  imageButton.addEventListener("click", () => openStory(post));

  const copy = document.createElement("div");
  copy.className = "card-copy";
  const meta = document.createElement("div");
  meta.className = "story-meta";
  const mark = document.createElement("span");
  mark.className = "category-mark";
  mark.setAttribute("aria-hidden", "true");
  const category = document.createElement("span");
  category.textContent = post.category;
  const author = document.createElement("span");
  author.textContent = post.author;
  meta.append(mark, category, author);

  const title = document.createElement("h3");
  title.textContent = post.title;
  const teaser = document.createElement("p");
  teaser.textContent = post.teaser;
  const openButton = document.createElement("button");
  openButton.className = "story-link";
  openButton.type = "button";
  openButton.append(document.createTextNode("Weiterlesen "));
  const arrow = document.createElement("span");
  arrow.textContent = "→";
  arrow.setAttribute("aria-hidden", "true");
  openButton.append(arrow);
  openButton.addEventListener("click", () => openStory(post));

  copy.append(meta, title, teaser, openButton);
  card.append(imageButton, copy);
  return card;
}

function renderFilters() {
  const filters = document.querySelector("#categoryFilters");
  filters.replaceChildren();
  ["Alle", ...categories].forEach((category) => {
    const button = document.createElement("button");
    button.className = "filter-button";
    button.type = "button";
    button.textContent = category;
    button.setAttribute("aria-pressed", String(activeCategory === category));
    button.addEventListener("click", () => {
      activeCategory = category;
      renderFilters();
      renderStoryGrid();
    });
    filters.append(button);
  });
}

function renderStoryGrid() {
  const query = document.querySelector("#searchInput").value.trim().toLocaleLowerCase("de");
  const visiblePosts = posts.filter((post) => {
    const matchesCategory = activeCategory === "Alle" || post.category === activeCategory;
    const searchableText = `${post.title} ${post.teaser} ${post.author} ${post.content}`.toLocaleLowerCase("de");
    return matchesCategory && searchableText.includes(query);
  });
  const grid = document.querySelector("#storyGrid");
  grid.replaceChildren(...visiblePosts.map(createStoryCard));
  document.querySelector("#emptyState").hidden = visiblePosts.length > 0;
  document.querySelector("#storyCount").textContent = `${posts.length} Artikel`;
}

function updateStartPageCount() {
  const count = posts.filter((post) => post.category === "Startseite").length;
  document.querySelector("#startPageCount").textContent = `Startseite: ${count} von 4 Artikeln`;
  const option = document.querySelector('#articleCategory option[value="Startseite"]');
  option.disabled = count >= 4;
  if (option.disabled && document.querySelector("#articleCategory").value === "Startseite") {
    document.querySelector("#articleCategory").value = "Allgemein";
  }
}

function showFeatured(index) {
  if (!featuredPosts.length) return;
  featuredIndex = (index + featuredPosts.length) % featuredPosts.length;
  const post = featuredPosts[featuredIndex];
  addStoryImage(document.querySelector("#featuredImage"), post.image, post.title);
  document.querySelector("#featuredCategory").textContent = post.category;
  document.querySelector("#featuredAuthor").textContent = post.author;
  document.querySelector("#featuredTitle").textContent = post.title;
  document.querySelector("#featuredTeaser").textContent = post.teaser;
  document.querySelector("#featuredPosition").textContent = `${featuredIndex + 1} / ${featuredPosts.length}`;
  document.querySelectorAll("#featuredDots button").forEach((dot, dotIndex) => {
    dot.setAttribute("aria-current", String(dotIndex === featuredIndex));
  });
}

function renderFeatured() {
  featuredPosts = posts.filter((post) => post.category === "Startseite").slice(0, 4);
  const section = document.querySelector("#featuredSection");
  section.hidden = featuredPosts.length === 0;
  document.querySelector("#featuredControls").hidden = featuredPosts.length < 2;
  const dots = document.querySelector("#featuredDots");
  dots.replaceChildren(...featuredPosts.map((post, index) => {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.setAttribute("aria-label", `Startseiten-Artikel ${index + 1}: ${post.title}`);
    dot.setAttribute("aria-current", "false");
    dot.addEventListener("click", () => showFeatured(index));
    return dot;
  }));

  if (!featuredPosts.length) {
    window.clearInterval(featuredTimer);
    return;
  }
  showFeatured(Math.min(featuredIndex, featuredPosts.length - 1));
  window.clearInterval(featuredTimer);
  if (featuredPosts.length > 1 && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    featuredTimer = window.setInterval(() => showFeatured(featuredIndex + 1), 6500);
  }
}

function renderPosts() {
  renderFeatured();
  renderFilters();
  renderStoryGrid();
  updateStartPageCount();
}

async function loadSite() {
  try {
    const result = await requestApi("site");
    if (result.site?.theme && result.site?.appearance) {
      site = {
        theme: { ...defaultSite.theme, ...result.site.theme },
        appearance: { ...defaultSite.appearance, ...result.site.appearance },
        blocks: Array.isArray(result.site.blocks) ? result.site.blocks : []
      };
      siteLoaded = true;
      applySite();
    } else {
      throw new Error("Die gespeicherten Website-Daten haben ein ungültiges Format.");
    }
  } catch (error) {
    document.querySelector("#emptyState").textContent = `${error.message} Starte die Website mit start-local.bat.`;
    document.querySelector("#emptyState").hidden = false;
  }
}

async function loadPosts() {
  try {
    const result = await requestApi("posts");
    posts = Array.isArray(result.posts) ? result.posts : [];
    renderPosts();
  } catch (error) {
    document.querySelector("#emptyState").textContent = error.message;
    document.querySelector("#emptyState").hidden = false;
  }
}

document.querySelector("#editorButton").addEventListener("click", async () => {
  loginView.hidden = isLoggedIn;
  editorView.hidden = !isLoggedIn;
  setMessage(loginMessage, siteLoaded ? "" : "Die Website-Daten werden noch geladen.", !siteLoaded);
  setMessage(editorMessage, "");
  setMessage(articleMessage, "");
  if (isLoggedIn && siteLoaded) fillEditor();
  editorDialog.showModal();
  if (!isLoggedIn && siteLoaded) {
    try {
      isLoggedIn = (await requestApi("status")).authenticated === true;
      loginView.hidden = isLoggedIn;
      editorView.hidden = !isLoggedIn;
      if (isLoggedIn) fillEditor();
    } catch (error) {
      setMessage(loginMessage, error.message, true);
    }
  }
});

document.querySelector("#dialogClose").addEventListener("click", () => editorDialog.close());
document.querySelector("#storyClose").addEventListener("click", () => storyDialog.close());
document.querySelector("#featuredPrevious").addEventListener("click", () => showFeatured(featuredIndex - 1));
document.querySelector("#featuredNext").addEventListener("click", () => showFeatured(featuredIndex + 1));
document.querySelector("#searchInput").addEventListener("input", renderStoryGrid);

document.querySelector("#loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  setMessage(loginMessage, "");
  try {
    await requestApi("login", { password: new FormData(form).get("password") });
    isLoggedIn = true;
    loginView.hidden = true;
    editorView.hidden = false;
    form.reset();
    fillEditor();
  } catch (error) {
    setMessage(loginMessage, error.message, true);
  }
});

document.querySelector("#editorForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  setMessage(editorMessage, "Wird gespeichert …");
  const form = new FormData(event.currentTarget);
  const updatedSite = {
    theme: { title: form.get("title").trim(), text: form.get("text").trim() },
    appearance: {
      brand: form.get("brand").trim(),
      background: form.get("background"),
      textColor: form.get("textColor"),
      accentColor: form.get("accentColor"),
      alignment: form.get("alignment")
    },
    blocks: site.blocks
  };
  try {
    const result = await requestApi("saveSite", { site: updatedSite });
    site = result.site;
    applySite();
    setMessage(editorMessage, "Änderungen gespeichert.");
  } catch (error) {
    setMessage(editorMessage, error.message, true);
  }
});

document.querySelector("#articleForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  setMessage(articleMessage, "Artikel wird veröffentlicht …");
  try {
    const result = await requestApi("create", new FormData(form));
    posts.unshift(result.post);
    form.reset();
    renderPosts();
    setMessage(articleMessage, "Artikel veröffentlicht.");
  } catch (error) {
    setMessage(articleMessage, error.message, true);
  }
});

document.querySelector("#logoutButton").addEventListener("click", async () => {
  try {
    await requestApi("logout", {});
    isLoggedIn = false;
    editorView.hidden = true;
    loginView.hidden = false;
    setMessage(loginMessage, "Du bist abgemeldet.");
  } catch (error) {
    setMessage(editorMessage, error.message, true);
  }
});

document.querySelector("#featuredOpen").addEventListener("click", () => {
  if (featuredPosts[featuredIndex]) openStory(featuredPosts[featuredIndex]);
});

document.querySelector("#emptyState").textContent = "Noch keine Artikel veröffentlicht.";
applySite();
renderPosts();
loadSite();
loadPosts();
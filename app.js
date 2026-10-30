const defaultSite = {
  theme: {
    title: "Artikel folgt.",
    text: "Der erste Artikel erscheint bald."
  },
  appearance: {
    brand: "WIDA ON PAPER",
    background: "#000000",
    textColor: "#ffffff",
    accentColor: "#a0a0a0",
    alignment: "center"
  },
  blocks: []
};

const editorDialog = document.querySelector("#editorDialog");
const loginView = document.querySelector("#loginView");
const editorView = document.querySelector("#editorView");
const loginMessage = document.querySelector("#loginMessage");
const editorMessage = document.querySelector("#editorMessage");
const editorButton = document.querySelector("#editorButton");
let site = {
  theme: { ...defaultSite.theme },
  appearance: { ...defaultSite.appearance },
  blocks: []
};
let siteLoaded = false;
let isLoggedIn = false;

function applySite() {
  document.querySelector("#siteBrand").textContent = site.appearance.brand;
  document.querySelector("#siteTitle").textContent = site.theme.title;
  document.querySelector("#siteText").textContent = site.theme.text;
  document.body.style.setProperty("--page-background", site.appearance.background);
  document.body.style.setProperty("--page-text", site.appearance.textColor);
  document.body.style.setProperty("--page-accent", site.appearance.accentColor);
  document.querySelector("#siteMessage").className = `coming-soon-content align-${site.appearance.alignment}`;
  document.querySelector('meta[name="theme-color"]').content = site.appearance.background;
  document.querySelector('meta[name="description"]').content = `${site.appearance.brand} — ${site.theme.title} ${site.theme.text}`.trim();
  document.title = `${site.appearance.brand} — ${site.theme.title}`;
}

function setMessage(element, message, isError = false) {
  element.textContent = message;
  element.classList.toggle("is-error", isError);
}

async function requestApi(action, payload) {
  const response = await fetch(`api.php?action=${encodeURIComponent(action)}`, {
    method: payload === undefined ? "GET" : "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: payload === undefined ? undefined : JSON.stringify(payload)
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Die Anfrage ist fehlgeschlagen.");
  return result;
}

function fillEditor() {
  document.querySelector("#brandInput").value = site.appearance.brand;
  document.querySelector("#titleInput").value = site.theme.title;
  document.querySelector("#textInput").value = site.theme.text;
  document.querySelector("#backgroundInput").value = site.appearance.background;
  document.querySelector("#textColorInput").value = site.appearance.textColor;
  document.querySelector("#accentInput").value = site.appearance.accentColor;
  document.querySelector("#alignmentInput").value = site.appearance.alignment;
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
    setMessage(loginMessage, `${error.message} Starte die Website mit start-local.bat.`, true);
  }
}

editorButton.addEventListener("click", async () => {
  loginView.hidden = isLoggedIn;
  editorView.hidden = !isLoggedIn;
  setMessage(loginMessage, siteLoaded ? "" : "Der lokale Server ist noch nicht erreichbar.", !siteLoaded);
  setMessage(editorMessage, "");
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
editorDialog.addEventListener("click", (event) => {
  if (event.target === editorDialog) editorDialog.close();
});

document.querySelector("#loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  setMessage(loginMessage, "");
  try {
    await requestApi("login", { password: new FormData(event.currentTarget).get("password") });
    isLoggedIn = true;
    loginView.hidden = true;
    editorView.hidden = false;
    event.currentTarget.reset();
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
    theme: {
      title: form.get("title").trim(),
      text: form.get("text").trim()
    },
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

applySite();
loadSite();

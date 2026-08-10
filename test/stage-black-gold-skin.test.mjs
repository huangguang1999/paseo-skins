import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";

import {
  buildStageBlackGoldInjectionSource,
  buildStageBlackGoldResetSource,
  buildStageBlackGoldVerificationSource,
  STAGE_BLACK_GOLD_OVERLAY_ID,
  STAGE_BLACK_GOLD_STYLE_ID,
} from "../src/stage-black-gold-skin.mjs";

class FakeStyleDeclaration {
  constructor() {
    this.properties = new Map();
  }

  getPropertyPriority(property) {
    return this.properties.get(property)?.priority ?? "";
  }

  getPropertyValue(property) {
    return this.properties.get(property)?.value ?? "";
  }

  removeProperty(property) {
    this.properties.delete(property);
  }

  setProperty(property, value, priority = "") {
    this.properties.set(property, { priority, value });
  }
}

class FakeElement {
  constructor(tagName = "div") {
    this.attributes = new Map();
    this.children = [];
    this.parentElement = null;
    this.computedStyle = {
      backgroundColor: "rgba(0, 0, 0, 0)",
      color: "rgba(0, 0, 0, 0)",
      cursor: "auto",
    };
    this.rectangle = { bottom: 0, height: 0, left: 0, right: 0, top: 0, width: 0, x: 0, y: 0 };
    this.style = new FakeStyleDeclaration();
    this.tagName = tagName.toUpperCase();
    this.textContent = "";
  }

  append(child) {
    child.parentElement = this;
    this.children.push(child);
  }

  closest(selector) {
    let element = this;
    while (element) {
      if (
        (selector.startsWith("#") && element.id === selector.slice(1)) ||
        (!selector.startsWith("#") && element.matches(selector))
      ) {
        return element;
      }
      element = element.parentElement;
    }
    return null;
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  getBoundingClientRect() {
    return this.rectangle;
  }

  matches(selector) {
    const testIdentifier = this.getAttribute("data-testid") ?? "";
    return selector
      .split(",")
      .some((candidate) => {
        const normalizedCandidate = candidate.trim();
        const prefix = normalizedCandidate.match(/\[data-testid\^="([^"]+)"\]/)?.[1];
        if (prefix) return testIdentifier.startsWith(prefix);
        if (normalizedCandidate === this.tagName.toLowerCase()) return true;
        if (normalizedCandidate === "[aria-selected]") return this.getAttribute("aria-selected") !== null;
        const role = normalizedCandidate.match(/^\[role="([^"]+)"\]$/)?.[1];
        return role ? this.getAttribute("role") === role : false;
      });
  }

  querySelectorAll() {
    return this.children.flatMap((child) => [child, ...child.querySelectorAll("*")]);
  }

  remove() {
    if (!this.parentElement) return;
    this.parentElement.children = this.parentElement.children.filter((child) => child !== this);
    this.parentElement = null;
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  get id() {
    return this.getAttribute("id") ?? "";
  }

  set id(value) {
    this.setAttribute("id", value);
  }
}

function createRendererHarness({ flushAnimationFrames = false } = {}) {
  let routeIntervalCallback = null;
  let routeIntervalCleared = false;
  const documentElement = new FakeElement("html");
  const head = new FakeElement("head");
  const findById = (element, identifier) => {
    if (element.id === identifier) return element;
    for (const child of element.children) {
      const match = findById(child, identifier);
      if (match) return match;
    }
    return null;
  };
  const document = {
    body: null,
    createElement: (tagName) => new FakeElement(tagName),
    documentElement,
    getElementById: (identifier) =>
      findById(head, identifier) ?? findById(documentElement, identifier),
    head,
    readyState: "complete",
  };
  const window = {
    innerHeight: 900,
    innerWidth: 1440,
    location: { pathname: "/new" },
  };
  return {
    context: {
      cancelAnimationFrame() {},
      clearInterval() { routeIntervalCleared = true; },
      document,
      getComputedStyle: (element) => ({
        backgroundColor: element.style.getPropertyValue("background-color") || element.computedStyle.backgroundColor,
        color: element.style.getPropertyValue("color") || element.computedStyle.color,
        cursor: element.computedStyle.cursor,
        getPropertyValue: (property) =>
          element.style.getPropertyValue(property) || element.computedStyle[property] || "rgba(0, 0, 0, 0)",
      }),
      HTMLElement: FakeElement,
      Map,
      MutationObserver: class {
        disconnect() {}
        observe() {}
      },
      requestAnimationFrame: (callback) => {
        if (flushAnimationFrames) callback();
        return 1;
      },
      setInterval: (callback) => {
        routeIntervalCallback = callback;
        return 1;
      },
      Set,
      window,
    },
    document,
    get routeIntervalCleared() { return routeIntervalCleared; },
    runRouteInterval() {
      if (!routeIntervalCallback) throw new Error("Route interval was not registered");
      routeIntervalCallback();
    },
  };
}

function createTheme(background) {
  return {
    appearance: background === "#f6f6f6" ? "light" : "dark",
    id: "same-theme",
    name: "Same theme",
    art: { focusX: 0.5, focusY: 0.5, homeOpacity: 1, utilityOpacity: 0.4, workspaceOpacity: 0.2 },
    colors: {
      accent: "#308cca",
      background,
      glow: "#0099ff",
      line: "rgba(128, 200, 255, 0.6)",
      muted: "#696969",
      panel: "rgba(254, 254, 254, 0.9)",
      panelAlt: "rgba(233, 233, 233, 0.78)",
      text: "#000000",
    },
  };
}

test("stage black gold injection is a self-contained executable script", () => {
  const source = buildStageBlackGoldInjectionSource();

  assert.doesNotThrow(() => new Function(source));
  assert.match(source, new RegExp(STAGE_BLACK_GOLD_STYLE_ID));
  assert.match(source, new RegExp(STAGE_BLACK_GOLD_OVERLAY_ID));
  assert.match(source, /MutationObserver/);
  assert.match(source, /pointer-events:\s*none/);
  assert.match(source, /existingSkin\?\.destroy/);
  assert.match(source, /isBottomChromeSurface/);
  assert.doesNotMatch(source, /paseo-skin-center-beam|<svg/);
});

test("stage black gold reset always restores a hidden application root", () => {
  const source = buildStageBlackGoldResetSource();

  assert.doesNotThrow(() => new Function(source));
  assert.match(source, /removeProperty\("visibility"\)/);
  assert.match(source, /destroy/);
});

test("stage black gold injection embeds the project hero image", () => {
  const heroImageDataUrl = "data:image/png;base64,cGFzZW8=";
  const source = buildStageBlackGoldInjectionSource({ heroImageDataUrl });

  assert.doesNotThrow(() => new Function(source));
  assert.match(source, new RegExp(heroImageDataUrl));
  assert.match(source, /data-paseo-skin-layer=\\?"hero\\?"/);
});

test("renderer color scheme follows the manifest appearance", () => {
  const harness = createRendererHarness();
  vm.runInNewContext(
    buildStageBlackGoldInjectionSource({ theme: createTheme("#f6f6f6") }),
    harness.context,
  );
  const style = harness.document.getElementById(STAGE_BLACK_GOLD_STYLE_ID);
  assert.match(style.textContent, /color-scheme:\s*light/);
});

test("renderer route follows SPA pathname changes and cleans up its monitor", () => {
  const harness = createRendererHarness();
  vm.runInNewContext(buildStageBlackGoldInjectionSource(), harness.context);
  assert.equal(harness.document.documentElement.getAttribute("data-paseo-skin-route"), "home");

  harness.context.window.location.pathname = "/schedules";
  harness.runRouteInterval();
  assert.equal(harness.document.documentElement.getAttribute("data-paseo-skin-route"), "utility");

  harness.context.window.__PASEO_STAGE_BLACK_GOLD_SKIN__.destroy();
  assert.equal(harness.routeIntervalCleared, true);
});

test("reinjecting the same theme id replaces stale CSS when theme colors change", () => {
  const harness = createRendererHarness();
  const firstResult = vm.runInNewContext(
    buildStageBlackGoldInjectionSource({ theme: createTheme("#111111") }),
    harness.context,
  );
  const secondResult = vm.runInNewContext(
    buildStageBlackGoldInjectionSource({ theme: createTheme("#f6f6f6") }),
    harness.context,
  );
  const style = harness.document.getElementById(STAGE_BLACK_GOLD_STYLE_ID);

  assert.equal(firstResult, "installed");
  assert.equal(secondResult, "installed");
  assert.match(style.textContent, /#f6f6f6/);
  assert.doesNotMatch(style.textContent, /#111111/);
});

test("sidebar item backgrounds stay reversible across hover and selected states", () => {
  const harness = createRendererHarness({ flushAnimationFrames: true });
  const sidebarItem = new FakeElement("button");
  sidebarItem.setAttribute("aria-selected", "false");
  sidebarItem.setAttribute("data-testid", "sidebar-workspace-row-server:workspace");
  sidebarItem.computedStyle.backgroundColor = "rgb(233, 233, 236)";
  sidebarItem.rectangle = {
    bottom: 136,
    height: 36,
    left: 8,
    right: 437,
    top: 100,
    width: 429,
    x: 8,
    y: 100,
  };
  harness.document.documentElement.append(sidebarItem);

  vm.runInNewContext(buildStageBlackGoldInjectionSource({ theme: createTheme("#f6f6f6") }), harness.context);
  const style = harness.document.getElementById(STAGE_BLACK_GOLD_STYLE_ID);

  assert.equal(sidebarItem.style.getPropertyValue("background-color"), "");
  assert.match(style.textContent, /sidebar-workspace-row-[^}]+:hover/);
  assert.match(style.textContent, /sidebar-workspace-row-[^}]+\[aria-selected="true"\]/);
});

test("workspace row actions and scrims inherit the contextual row background", () => {
  const harness = createRendererHarness();

  vm.runInNewContext(buildStageBlackGoldInjectionSource({ theme: createTheme("#f6f6f6") }), harness.context);
  const style = harness.document.getElementById(STAGE_BLACK_GOLD_STYLE_ID);

  assert.match(
    style.textContent,
    /\[data-testid\^="sidebar-workspace-kebab-"\]\s*\{[^}]*background-color:\s*transparent\s*!important/,
  );
  assert.match(
    style.textContent,
    /\[data-testid\^="sidebar-workspace-row-"\]\s+\[id\^="sidebar-scrim-"\]\s+stop\s*\{[^}]*stop-color:\s*transparent\s*!important/,
  );
});

test("global sidebar navigation uses a visible themed hover state", () => {
  const harness = createRendererHarness();

  vm.runInNewContext(buildStageBlackGoldInjectionSource({ theme: createTheme("#f6f6f6") }), harness.context);
  const style = harness.document.getElementById(STAGE_BLACK_GOLD_STYLE_ID);

  assert.match(style.textContent, /sidebar-global-new-workspace[^}]+:hover[^}]+#308cca 14%/);
  assert.match(style.textContent, /sidebar-sessions[^}]+:hover[^}]+#308cca 14%/);
  assert.match(style.textContent, /sidebar-schedules[^}]+:hover[^}]+#308cca 14%/);
  assert.match(style.textContent, /settings-sidebar[^}]+button:hover[^}]+#308cca 14%/);
});

test("user message selections stay visible on accent-filled bubbles", () => {
  const harness = createRendererHarness();

  vm.runInNewContext(buildStageBlackGoldInjectionSource({ theme: createTheme("#f6f6f6") }), harness.context);
  const style = harness.document.getElementById(STAGE_BLACK_GOLD_STYLE_ID);

  assert.match(
    style.textContent,
    /\[data-testid="user-message"\]::selection,\s*#root \[data-testid="user-message"\] ::selection\s*\{[^}]*background:\s*#000000\s*!important;[^}]*color:\s*#f6f6f6\s*!important/,
  );
});

test("filled interactive control labels keep accessible foreground contrast", () => {
  const harness = createRendererHarness({ flushAnimationFrames: true });
  const fixtures = [
    ["rgb(26, 26, 30)", "Selected segment"],
    ["rgb(176, 65, 56)", "Destructive action"],
  ];
  const controls = fixtures.map(([backgroundColor, textContent], index) => {
    const button = new FakeElement("button");
    button.computedStyle.backgroundColor = backgroundColor;
    button.computedStyle.color = "rgb(0, 0, 0)";
    button.computedStyle.cursor = "pointer";
    button.rectangle = {
      bottom: 160 + index * 48,
      height: 32,
      left: 900,
      right: 1060,
      top: 128 + index * 48,
      width: 160,
      x: 900,
      y: 128 + index * 48,
    };
    const label = new FakeElement("div");
    label.computedStyle.color = "rgb(255, 255, 255)";
    label.textContent = textContent;
    button.append(label);
    harness.document.documentElement.append(button);
    return { button, label };
  });

  vm.runInNewContext(buildStageBlackGoldInjectionSource({ theme: createTheme("#f6f6f6") }), harness.context);

  for (const { button, label } of controls) {
    assert.equal(button.style.getPropertyValue("color"), "#ffffff");
    assert.equal(label.style.getPropertyValue("color"), "");
  }
});

test("neutral backgrounds on interactive items never become persistent inline styles", () => {
  const harness = createRendererHarness({ flushAnimationFrames: true });
  const fixtures = [
    ["button", "sidebar-global-new-workspace"],
    ["button", "schedule-row-schedule-id"],
    ["div", "agent-row-host-agent-id"],
    ["button", "settings-host-section-projects"],
  ];
  const interactiveItems = fixtures.map(([tagName, testIdentifier], index) => {
    const item = new FakeElement(tagName);
    item.setAttribute("data-testid", testIdentifier);
    item.computedStyle.backgroundColor = "rgb(244, 244, 245)";
    item.computedStyle.cursor = "pointer";
    item.rectangle = {
      bottom: 180 + index * 44,
      height: 40,
      left: 480,
      right: 1120,
      top: 140 + index * 44,
      width: 640,
      x: 480,
      y: 140 + index * 44,
    };
    harness.document.documentElement.append(item);
    return item;
  });
  const staticSurface = new FakeElement("div");
  staticSurface.computedStyle.backgroundColor = "rgb(244, 244, 245)";
  staticSurface.rectangle = {
    bottom: 440,
    height: 120,
    left: 480,
    right: 920,
    top: 320,
    width: 440,
    x: 480,
    y: 320,
  };
  harness.document.documentElement.append(staticSurface);

  vm.runInNewContext(buildStageBlackGoldInjectionSource({ theme: createTheme("#f6f6f6") }), harness.context);

  for (const item of interactiveItems) {
    assert.equal(item.style.getPropertyValue("background-color"), "", item.getAttribute("data-testid"));
  }
  assert.equal(staticSurface.style.getPropertyValue("background-color"), "rgba(254, 254, 254, 0.9)");
});

test("stage black gold verification checks renderer safety and theme identity", () => {
  const source = buildStageBlackGoldVerificationSource({ expectedThemeId: "stage-black-gold" });

  assert.doesNotThrow(() => new Function(source));
  assert.match(source, /rootVisibility/);
  assert.match(source, /overlayPointerEvents/);
  assert.match(source, /horizontalOverflow/);
  assert.match(source, /stage-black-gold/);
});

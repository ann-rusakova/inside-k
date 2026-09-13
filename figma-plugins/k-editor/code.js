const SETTINGS_KEY = "kontur-editor-settings";
const SIZE_KEY = "kontur-editor-window-size";
const CACHE_KEY = "kontur-editor-result-cache";
const DEFAULT_SIZE = { width: 400, height: 805 };
const MIN_SIZE = { width: 320, height: 480 };
const MAX_SIZE = { width: 900, height: 1200 };

function clampSize(size) {
  const width = Math.min(
    MAX_SIZE.width,
    Math.max(MIN_SIZE.width, Math.round(size.width) || DEFAULT_SIZE.width)
  );
  const height = Math.min(
    MAX_SIZE.height,
    Math.max(MIN_SIZE.height, Math.round(size.height) || DEFAULT_SIZE.height)
  );
  return { width, height };
}

async function getInitialSize() {
  try {
    const saved = await figma.clientStorage.getAsync(SIZE_KEY);
    if (saved && typeof saved.width === "number" && typeof saved.height === "number") {
      return clampSize(saved);
    }
  } catch (_) {}
  return DEFAULT_SIZE;
}

figma.showUI(__html__, {
  width: DEFAULT_SIZE.width,
  height: DEFAULT_SIZE.height,
  themeColors: true,
});

getInitialSize().then((size) => {
  if (size.width !== DEFAULT_SIZE.width || size.height !== DEFAULT_SIZE.height) {
    figma.ui.resize(size.width, size.height);
  }
});

function describeSelection() {
  const selection = figma.currentPage.selection || [];
  const textCount = selection.filter((node) => node.type === "TEXT").length;
  return { selectionCount: selection.length, textCount };
}

async function getSelectedTextNode() {
  const selection = figma.currentPage.selection;
  const info = describeSelection();
  if (!selection || selection.length !== 1) {
    return { error: "Выберите один текстовый слой.", ...info };
  }

  const node = selection[0];
  if (node.type !== "TEXT") {
    return { error: "Нужен именно текстовый слой.", ...info };
  }

  return { node, ...info };
}

function collectNeighbourTexts(targetNode) {
  if (!targetNode.parent || !("children" in targetNode.parent)) {
    return [];
  }

  const texts = [];
  for (const child of targetNode.parent.children) {
    if (child.type !== "TEXT" || child.id === targetNode.id) continue;
    const value = (child.characters || "").trim();
    if (!value) continue;
    texts.push(value);
    if (texts.length >= 8) break;
  }
  return texts;
}

const MAX_FRAME_TEXTS = 60;

function isContainerNode(node) {
  return Boolean(node) && node.type !== "TEXT" && "children" in node;
}

function nodePoint(node) {
  try {
    const t = node.absoluteTransform;
    return { x: t[0][2], y: t[1][2] };
  } catch (_) {
    return { x: node.x || 0, y: node.y || 0 };
  }
}

// Все текстовые слои контейнера в порядке чтения: сверху вниз, слева направо.
function collectFrameTexts(root) {
  const found = [];
  const walk = (node) => {
    if (found.length >= MAX_FRAME_TEXTS * 3) return;
    if (node.visible === false) return;
    if (node.type === "TEXT") {
      const value = node.characters || "";
      if (value.trim()) {
        const point = nodePoint(node);
        found.push({ id: node.id, name: node.name || "", text: value, x: point.x, y: point.y });
      }
      return;
    }
    if (!("children" in node)) return;
    for (const child of node.children) walk(child);
  };

  walk(root);
  found.sort((a, b) => (Math.abs(a.y - b.y) > 4 ? a.y - b.y : a.x - b.x));
  return found
    .slice(0, MAX_FRAME_TEXTS)
    .map((item) => ({ id: item.id, name: item.name, text: item.text }));
}

function frameRootFor(node) {
  // Ближайший контейнер-«экран»: поднимаемся до верхнего фрейма страницы.
  let current = node;
  let best = null;
  while (current && current.parent && current.parent.type !== "PAGE") {
    current = current.parent;
    if (isContainerNode(current)) best = current;
  }
  if (current && current.parent && current.parent.type === "PAGE" && isContainerNode(current)) {
    best = current;
  }
  return best;
}

async function getSelectionPayload() {
  const selection = figma.currentPage.selection || [];
  const info = describeSelection();

  // Выбран контейнер (фрейм, группа, компонент) — собираем весь текст внутри.
  if (selection.length === 1 && isContainerNode(selection[0])) {
    const root = selection[0];
    const frameTexts = collectFrameTexts(root);
    if (frameTexts.length) {
      return {
        selectedText: "",
        contextTexts: frameTexts.slice(0, 8).map((item) => item.text),
        frameTexts,
        frameName: root.name || "Фрейм",
        frameId: root.id,
        nodeId: null,
        error: "",
        ...info,
      };
    }
    return {
      selectedText: "",
      contextTexts: [],
      frameTexts: [],
      frameName: "",
      frameId: null,
      nodeId: null,
      error: "В этом слое нет текста.",
      ...info,
    };
  }

  const result = await getSelectedTextNode();
  if (result.error) {
    return {
      selectedText: "",
      contextTexts: [],
      frameTexts: [],
      frameName: "",
      frameId: null,
      nodeId: null,
      error: result.error,
      ...info,
    };
  }

  const node = result.node;
  const root = frameRootFor(node);
  const frameTexts = root ? collectFrameTexts(root) : [];
  return {
    selectedText: node.characters || "",
    contextTexts: collectNeighbourTexts(node),
    frameTexts,
    frameName: root ? root.name || "Фрейм" : "",
    frameId: root ? root.id : null,
    nodeId: node.id,
    error: "",
    ...info,
  };
}

async function loadNodeFonts(node) {
  if (node.fontName !== figma.mixed) {
    await figma.loadFontAsync(node.fontName);
    return;
  }

  const seen = new Set();
  const fonts = [];
  for (let i = 0; i < node.characters.length; i += 1) {
    const font = node.getRangeFontName(i, i + 1);
    if (font === figma.mixed) continue;
    const key = `${font.family}::${font.style}`;
    if (seen.has(key)) continue;
    seen.add(key);
    fonts.push(font);
  }

  await Promise.all(fonts.map((font) => figma.loadFontAsync(font)));
}

async function saveSettings(settings) {
  await figma.clientStorage.setAsync(SETTINGS_KEY, settings);
}

async function loadSettings() {
  const saved = await figma.clientStorage.getAsync(SETTINGS_KEY);
  return saved || null;
}

async function saveCache(cache) {
  await figma.clientStorage.setAsync(CACHE_KEY, cache);
}

async function loadCache() {
  const saved = await figma.clientStorage.getAsync(CACHE_KEY);
  return saved || null;
}

figma.on("selectionchange", async () => {
  const payload = await getSelectionPayload();
  figma.ui.postMessage({
    type: "selection-updated",
    payload,
  });
});

figma.ui.onmessage = async (msg) => {
  if (!msg || !msg.type) return;

  switch (msg.type) {
    case "get-selection": {
      const payload = await getSelectionPayload();
      figma.ui.postMessage({
        type: "selection-updated",
        payload,
      });
      break;
    }
    case "apply-variant": {
      const { text, nodeId, originalText } = msg.payload || {};
      if (!text || typeof text !== "string") break;

      try {
        let node = null;
        if (nodeId) {
          node = await figma.getNodeByIdAsync(nodeId);
          if (!node || node.type !== "TEXT") {
            throw new Error(
              "Исходный текстовый слой больше недоступен. Выберите слой и повторите анализ."
            );
          }
        }
        if (!node) {
          const result = await getSelectedTextNode();
          if (result.error) {
            figma.ui.postMessage({
              type: "action-error",
              payload: { message: result.error },
            });
            break;
          }
          node = result.node;
        }

        await loadNodeFonts(node);
        if (typeof originalText === "string" && node.characters !== originalText) {
          throw new Error("Текст слоя изменился. Повторите анализ перед применением варианта.");
        }
        node.characters = text;
        figma.ui.postMessage({ type: "variant-applied", payload: { nodeId: node.id, text } });
        figma.ui.postMessage({ type: "selection-updated", payload: await getSelectionPayload() });
      } catch (error) {
        figma.ui.postMessage({
          type: "action-error",
          payload: {
            message: `Не удалось применить текст: ${error && error.message ? error.message : "проверьте шрифт слоя"}`,
          },
        });
      }
      break;
    }
    case "select-node": {
      const { nodeId } = msg.payload || {};
      if (!nodeId) break;
      try {
        const node = await figma.getNodeByIdAsync(nodeId);
        if (node) {
          figma.currentPage.selection = [node];
          figma.viewport.scrollAndZoomIntoView([node]);
        }
      } catch (_) {}
      break;
    }
    case "save-settings": {
      try {
        await saveSettings(msg.payload || {});
        figma.ui.postMessage({ type: "settings-saved" });
      } catch (error) {
        figma.ui.postMessage({
          type: "action-error",
          payload: { message: "Не удалось сохранить настройки.", action: "save-settings" },
        });
      }
      break;
    }
    case "load-settings": {
      const settings = await loadSettings().catch(() => null);
      figma.ui.postMessage({ type: "settings-loaded", payload: settings });
      break;
    }
    case "save-cache": {
      saveCache(msg.payload || {}).catch(() => {});
      break;
    }
    case "load-cache": {
      const cache = await loadCache().catch(() => null);
      figma.ui.postMessage({ type: "cache-loaded", payload: cache });
      break;
    }
    case "resize": {
      const size = clampSize(msg.payload || {});
      figma.ui.resize(size.width, size.height);
      figma.clientStorage.setAsync(SIZE_KEY, size).catch(() => {});
      break;
    }
    case "close-plugin": {
      figma.closePlugin();
      break;
    }
    default:
      break;
  }
};

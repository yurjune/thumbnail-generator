const canvas = document.getElementById("thumbnailCanvas");
const ctx = canvas.getContext("2d");
const inputs = [
  document.getElementById("titleInput"),
  document.getElementById("verseInput"),
];
const saveBtn = document.getElementById("saveBtn");
const presetList = document.getElementById("presetList");

const THUMBNAIL_SIZE = 1024;
const EXPORT_SIZE = 1024;
const EXPORT_TYPE = "image/webp";
const EXPORT_QUALITY = 1;
const PRESETS = [
  "presets/thumbnail1.webp",
  "presets/thumbnail2.webp",
  "presets/thumbnail3.webp",
  "presets/thumbnail4.webp",
  "presets/thumbnail5.webp",
  "presets/thumbnail6.webp",
  "presets/thumbnail7.webp",
  "presets/thumbnail8.webp",
];

const MIDDLE_GAP = 96;

const FONT = '"Noto Sans KR", sans-serif';
const FONT_WEIGHT = 500;
const TITLE_FONT_SIZE = 120;
const VERSE_FONT_SIZE = 70;

const WRAP_TYPES = {
  character: "character",
  word: "word",
};
const WRAP_TYPE = WRAP_TYPES.word;

const state = {
  presetIndex: 0,
  color: "#f4f4ef",
  blocks: inputs.map((input) => input.value),
};

function createPresetButton(src, index) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `preset-item ${index === state.presetIndex ? "active" : ""}`;
  button.innerHTML = `<img src="${src}" alt="thumbnail" />`;
  button.addEventListener("click", () => {
    state.presetIndex = index;
    presetList
      .querySelectorAll(".preset-item")
      .forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    render();
  });
  return button;
}

function wrapTextByCharacter(text, maxWidth) {
  const lines = [];

  for (const rawLine of text.trim().split("\n")) {
    let current = "";
    for (const ch of rawLine.trim()) {
      if (ctx.measureText(current + ch).width <= maxWidth) {
        current += ch;
      } else {
        if (current) lines.push(current);
        current = ch;
      }
    }
    lines.push(current || "");
  }

  return lines.length ? lines : [""];
}

function wrapTextByWord(text, maxWidth) {
  const lines = [];

  for (const rawLine of text.trim().split("\n")) {
    const words = rawLine.trim().split(/\s+/).filter(Boolean);
    let current = "";

    if (!words.length) {
      lines.push("");
      continue;
    }

    for (const word of words) {
      const next = current ? `${current} ${word}` : word;
      if (ctx.measureText(next).width <= maxWidth) {
        current = next;
      } else {
        if (current) lines.push(current);
        current = word;
      }
    }

    lines.push(current || "");
  }

  return lines.length ? lines : [""];
}

function buildBlockMetrics(size, lines) {
  const safeSize = Math.max(24, Number(size) || 92);
  const lineHeight = safeSize * 1.3;
  return {
    safeSize,
    lineHeight,
    lines,
    height: lines.length * lineHeight,
  };
}

function getBlockMetrics(text, size) {
  const safeSize = Math.max(24, Number(size) || 92);
  ctx.font = `${FONT_WEIGHT} ${safeSize}px ${FONT}`;
  const lines =
    WRAP_TYPE === WRAP_TYPES.word
      ? wrapTextByWord(text || " ", THUMBNAIL_SIZE - 30 * 2)
      : wrapTextByCharacter(text || " ", THUMBNAIL_SIZE - 30 * 2);
  return buildBlockMetrics(size, lines);
}

function drawBlock(block, startY) {
  ctx.font = `${FONT_WEIGHT} ${block.safeSize}px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = state.color;
  ctx.shadowColor = "rgba(0, 0, 0, 0.16)";
  ctx.shadowBlur = 6;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 2;

  let yPos = startY + block.lineHeight / 2;
  for (const line of block.lines) {
    ctx.fillText(line, THUMBNAIL_SIZE / 2, yPos);
    yPos += block.lineHeight;
  }

  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
}

function render() {
  const image = new Image();
  image.onload = () => {
    ctx.clearRect(0, 0, THUMBNAIL_SIZE, THUMBNAIL_SIZE);
    ctx.drawImage(image, 0, 0, THUMBNAIL_SIZE, THUMBNAIL_SIZE);

    const [top, bottom] = state.blocks.map((text) => text.trim());
    if (bottom) {
      const topBlock = getBlockMetrics(top, TITLE_FONT_SIZE);
      const bottomBlock = getBlockMetrics(bottom, VERSE_FONT_SIZE);
      const outerSpacing =
        (THUMBNAIL_SIZE - topBlock.height - bottomBlock.height - MIDDLE_GAP) /
        2;
      drawBlock(topBlock, outerSpacing);
      drawBlock(bottomBlock, outerSpacing + topBlock.height + MIDDLE_GAP);
    } else {
      const block = getBlockMetrics(top, TITLE_FONT_SIZE);
      drawBlock(block, (THUMBNAIL_SIZE - block.height) / 2);
    }
  };
  image.src = PRESETS[state.presetIndex];
}

function syncInputs() {
  state.blocks = inputs.map((input) => input.value);
  render();
}

function canvasToBlob(targetCanvas, type, quality) {
  return new Promise((resolve, reject) => {
    targetCanvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
          return;
        }
        reject(new Error("Failed to create image blob."));
      },
      type,
      quality,
    );
  });
}

async function createExportBlob() {
  const exportCanvas = document.createElement("canvas");
  exportCanvas.width = EXPORT_SIZE;
  exportCanvas.height = EXPORT_SIZE;

  const exportCtx = exportCanvas.getContext("2d");
  exportCtx.drawImage(canvas, 0, 0, EXPORT_SIZE, EXPORT_SIZE);
  return canvasToBlob(exportCanvas, EXPORT_TYPE, EXPORT_QUALITY);
}

PRESETS.forEach((preset, index) => {
  presetList.appendChild(createPresetButton(preset, index));
});

inputs.forEach((input) => input.addEventListener("input", syncInputs));

saveBtn.addEventListener("click", async () => {
  const blob = await createExportBlob();
  const link = document.createElement("a");
  const objectUrl = URL.createObjectURL(blob);
  link.download = "thumbnail.webp";
  link.href = objectUrl;
  link.click();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
});

render();

if (document.fonts?.ready) {
  document.fonts.ready.then(render);
}

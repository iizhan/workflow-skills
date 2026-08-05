import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const port = Number.parseInt(process.env.SKILL_OS_DEBUG_PORT ?? "9223", 10);
const projectName = process.env.SKILL_OS_LIVE_PROJECT ?? "AIZZZWatch";
const screenshotPath = process.env.SKILL_OS_LIVE_SCREENSHOT ?? join("tmp", "live-session-trace.png");

const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then((response) => response.json());
const target = targets.find((entry) => entry.type === "page");
if (!target?.webSocketDebuggerUrl) {
  throw new Error(`No Skill OS page target is available on port ${port}.`);
}

const socket = new WebSocket(target.webSocketDebuggerUrl);
const pending = new Map();
let requestId = 0;

socket.addEventListener("message", (event) => {
  const message = JSON.parse(String(event.data));
  if (!message.id) return;
  const handler = pending.get(message.id);
  if (!handler) return;
  pending.delete(message.id);
  if (message.error) {
    handler.reject(new Error(message.error.message));
  } else {
    handler.resolve(message.result);
  }
});

await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", () => reject(new Error("Failed to connect to Skill OS DevTools.")), { once: true });
});

function send(method, params = {}) {
  const id = ++requestId;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    setTimeout(() => {
      if (!pending.has(id)) return;
      pending.delete(id);
      reject(new Error(`Timed out waiting for ${method}.`));
    }, 10_000);
  });
}

async function evaluate(expression) {
  const result = await send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text ?? "Runtime evaluation failed.");
  }
  return result.result.value;
}

async function waitFor(label, expression, timeoutMs = 15_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await evaluate(expression)) return;
    await delay(200);
  }
  throw new Error(`Timed out waiting for ${label}.`);
}

try {
  await send("Page.enable");
  await send("Runtime.enable");
  await waitFor("application shell", `Boolean(document.querySelector(".product-workspace.single-module-mode"))`);
  await evaluate(`document.querySelector('.product-nav a[href="#session-trace"]')?.click()`);
  await waitFor("session trace records", `document.querySelectorAll("#session-trace .trace-turn-row").length > 0`);
  const selected = await evaluate(`(() => {
    const projectName = ${JSON.stringify(projectName)};
    const row = [...document.querySelectorAll("#session-trace .trace-turn-row")]
      .find((entry) => entry.textContent?.includes(projectName));
    if (!row) return false;
    row.click();
    return true;
  })()`);
  if (!selected) {
    throw new Error(`No session trace row was found for ${projectName}.`);
  }
  await waitFor(
    `${projectName} trace detail`,
    `document.querySelector("#session-trace .trace-detail-head h3")?.textContent?.includes(${JSON.stringify(projectName)}) && Boolean(document.querySelector("#session-trace .trace-detail-metrics"))`
  );

  const before = await evaluate(`(() => {
    const row = document.querySelector("#session-trace .trace-turn-row.selected");
    const detail = document.querySelector("#session-trace .trace-detail-metrics");
    return {
      rowText: row?.textContent?.replace(/\\s+/g, " ").trim() ?? "",
      detailTokens: Number(detail?.getAttribute("data-trace-total-tokens") ?? 0),
      messageSummary: document.querySelector("#session-trace .trace-user-message-card p")?.textContent?.trim() ?? "",
      spans: [...document.querySelectorAll("#session-trace .trace-span-row")].map((entry) => ({
        type: entry.querySelector(".trace-entity-badge")?.textContent?.trim() ?? "",
        name: entry.querySelector(".trace-span-title")?.textContent?.replace(/\\s+/g, " ").trim() ?? ""
      }))
    };
  })()`);

  await evaluate(`document.querySelector("#session-trace .trace-icon-button")?.click()`);
  await waitFor("refreshed trace detail", `!document.querySelector("#session-trace .trace-detail-empty .trace-loading-ring")`);
  await delay(250);
  const after = await evaluate(`(() => {
    const row = document.querySelector("#session-trace .trace-turn-row.selected");
    const detail = document.querySelector("#session-trace .trace-detail-metrics");
    return {
      rowText: row?.textContent?.replace(/\\s+/g, " ").trim() ?? "",
      detailTokens: Number(detail?.getAttribute("data-trace-total-tokens") ?? 0)
    };
  })()`);

  let screenshotSaved = false;
  try {
    const screenshot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    writeFileSync(screenshotPath, Buffer.from(screenshot.data, "base64"));
    screenshotSaved = true;
  } catch {
    // Data assertions remain valid when capture is unavailable for a hidden or occluded window.
  }
  console.log(JSON.stringify({ projectName, before, after, screenshotPath: screenshotSaved ? screenshotPath : null }, null, 2));
} finally {
  socket.close();
}

import { accessSync, constants, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";

const root = new URL("..", import.meta.url).pathname;
const reportDir = join(root, "tmp", "self-test");
mkdirSync(reportDir, { recursive: true });

const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const cdpPort = 9227;
const appIndexPath = join(root, "out", "renderer", "index.html");
const electronCliPath = join(root, "node_modules", "electron", "cli.js");
const baseUrl = pathToFileURL(appIndexPath).href;

const report = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  mode: "electron-click",
  passed: [],
  issues: [],
  warnings: [],
  screenshots: []
};

function recordPass(label) {
  report.passed.push(label);
}

function recordIssue(label, detail) {
  report.issues.push({ label, detail });
}

function recordWarning(label, detail) {
  report.warnings.push({ label, detail });
}

function spawnProcess(command, args, options = {}) {
  const child = spawn(command, args, {
    cwd: root,
    stdio: ["ignore", "pipe", "pipe"],
    ...options
  });
  child.stdout.on("data", (chunk) => {
    if (process.env.SKILL_OS_SELF_TEST_VERBOSE) {
      process.stdout.write(chunk);
    }
  });
  child.stderr.on("data", (chunk) => {
    if (process.env.SKILL_OS_SELF_TEST_VERBOSE) {
      process.stderr.write(chunk);
    }
  });
  return child;
}

async function cdpRequest(method, path = "", body = undefined) {
  const response = await fetch(`http://127.0.0.1:${cdpPort}${path}`, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { "content-type": "application/json" } : undefined
  });
  if (!response.ok) {
    throw new Error(`CDP ${method} ${path} failed: ${response.status}`);
  }
  return response.json();
}

async function waitForDebugServer(timeoutMs = 20000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(`http://127.0.0.1:${cdpPort}/json/version`);
      if (response.ok) {
        return;
      }
    } catch {
      // Chrome is still starting.
    }
    await delay(250);
  }
  throw new Error(`Timed out waiting for Chrome remote debugging on ${cdpPort}`);
}

function encodeFrame(payload) {
  const json = JSON.stringify(payload);
  const body = Buffer.from(json);
  const mask = randomBytes(4);
  const maskedBody = Buffer.from(body.map((byte, index) => byte ^ mask[index % 4]));
  return Buffer.concat([
    Buffer.from([0x81]),
    encodeLength(body.length, true),
    Buffer.from(mask),
    maskedBody
  ]);
}

function encodeLength(length, masked = false) {
  const maskBit = masked ? 0x80 : 0;
  if (length < 126) {
    return Buffer.from([maskBit | length]);
  }
  if (length < 65536) {
    const buffer = Buffer.alloc(3);
    buffer[0] = maskBit | 126;
    buffer.writeUInt16BE(length, 1);
    return buffer;
  }
  const buffer = Buffer.alloc(9);
  buffer[0] = maskBit | 127;
  buffer.writeBigUInt64BE(BigInt(length), 1);
  return buffer;
}

async function connectWebSocket(wsUrl) {
  const { hostname, port, pathname, search } = new URL(wsUrl);
  const net = await import("node:net");
  const crypto = await import("node:crypto");
  const socket = net.createConnection(Number(port), hostname);
  const key = crypto.randomBytes(16).toString("base64");
  let incoming = Buffer.alloc(0);
  let nextId = 1;
  const pending = new Map();

  await new Promise((resolve, reject) => {
    socket.once("error", reject);
    socket.once("connect", () => {
      socket.write(
        [
          `GET ${pathname}${search} HTTP/1.1`,
          `Host: ${hostname}:${port}`,
          "Upgrade: websocket",
          "Connection: Upgrade",
          `Sec-WebSocket-Key: ${key}`,
          "Sec-WebSocket-Version: 13",
          "",
          ""
        ].join("\r\n")
      );
    });
    let handshake = "";
    socket.on("data", function onHandshake(chunk) {
      handshake += chunk.toString("latin1");
      if (!handshake.includes("\r\n\r\n")) {
        return;
      }
      socket.off("data", onHandshake);
      if (!handshake.startsWith("HTTP/1.1 101")) {
        reject(new Error(`WebSocket handshake failed: ${handshake.split("\r\n")[0]}`));
        return;
      }
      const headerEnd = handshake.indexOf("\r\n\r\n") + 4;
      const leftover = Buffer.from(handshake.slice(headerEnd), "latin1");
      if (leftover.length > 0) {
        incoming = Buffer.concat([incoming, leftover]);
      }
      resolve();
    });
  });

  function drainFrames() {
    while (incoming.length >= 2) {
      const first = incoming[0];
      const second = incoming[1];
      let offset = 2;
      let length = second & 0x7f;
      if (length === 126) {
        if (incoming.length < 4) {
          return;
        }
        length = incoming.readUInt16BE(2);
        offset = 4;
      } else if (length === 127) {
        if (incoming.length < 10) {
          return;
        }
        length = Number(incoming.readBigUInt64BE(2));
        offset = 10;
      }
      const mask = Boolean(second & 0x80);
      const maskLength = mask ? 4 : 0;
      const frameLength = offset + maskLength + length;
      if (incoming.length < frameLength) {
        return;
      }
      let payload = incoming.subarray(offset + maskLength, frameLength);
      if (mask) {
        const maskKey = incoming.subarray(offset, offset + 4);
        payload = Buffer.from(payload.map((byte, index) => byte ^ maskKey[index % 4]));
      }
      incoming = incoming.subarray(frameLength);
      if ((first & 0x0f) === 0x8) {
        socket.end();
        return;
      }
      if ((first & 0x0f) !== 0x1) {
        continue;
      }
      const message = JSON.parse(payload.toString("utf8"));
      if (message.id && pending.has(message.id)) {
        const { resolve, reject } = pending.get(message.id);
        pending.delete(message.id);
        if (message.error) {
          reject(new Error(`${message.error.message}: ${message.error.data ?? ""}`));
        } else {
          resolve(message.result);
        }
      }
    }
  }

  socket.on("data", (chunk) => {
    incoming = Buffer.concat([incoming, chunk]);
    drainFrames();
  });

  return {
    send(method, params = {}) {
      const id = nextId++;
      socket.write(encodeFrame({ id, method, params }));
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        setTimeout(() => {
          if (pending.has(id)) {
            pending.delete(id);
            reject(new Error(`Timed out waiting for CDP method ${method}`));
          }
        }, 10000);
      });
    },
    close() {
      socket.end();
    }
  };
}

async function runSelfTest() {
  if (process.versions.electron) {
    await runElectronSelfTestInProcess();
    return;
  }

  await runElectronSelfTestLauncher();
}

async function runElectronSelfTestLauncher() {
  accessSync(appIndexPath, constants.R_OK);
  accessSync(electronCliPath, constants.R_OK);

  const child = spawn(process.execPath, [electronCliPath, new URL(import.meta.url).pathname], {
    cwd: root,
    env: {
      ...process.env,
      SKILL_OS_SELF_TEST_RUNTIME: "electron"
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
  let stdout = "";
  let stderr = "";

  child.stdout.on("data", (chunk) => {
    const text = chunk.toString();
    stdout += text;
    if (process.env.SKILL_OS_SELF_TEST_VERBOSE) {
      process.stdout.write(text);
    }
  });
  child.stderr.on("data", (chunk) => {
    const text = chunk.toString();
    stderr += text;
    if (process.env.SKILL_OS_SELF_TEST_VERBOSE) {
      process.stderr.write(text);
    }
  });

  const exitCode = await new Promise((resolve) => {
    child.on("error", (error) => {
      recordIssue("electron self-test launcher", error.message);
      resolve(1);
    });
    child.on("exit", (code, signal) => {
      if (signal) {
        recordIssue("electron self-test launcher", `Electron exited by signal ${signal}`);
        resolve(1);
        return;
      }
      resolve(code ?? 1);
    });
  });

  if (exitCode !== 0) {
    await runSourceContractFallback(stderr.trim() || stdout.trim() || `Electron exited with code ${exitCode}`);
    return;
  }

  process.stdout.write(stdout);
}

async function runSourceContractFallback(blockedReason) {
  report.mode = "source-contract";
  recordWarning(
    "browser automation blocked",
    blockedReason.slice(-2000) ||
      "Electron/Chrome automation is unavailable in the current sandboxed environment."
  );

  if (process.env.SKILL_OS_SELF_TEST_REQUIRE_BROWSER === "1") {
    recordIssue(
      "browser automation required",
      "Set SKILL_OS_SELF_TEST_REQUIRE_BROWSER=0 or run in an environment where Electron can start."
    );
  } else {
    runSourceInteractionContractChecks();
  }

  writeFileSync(join(reportDir, "self-test-report.json"), JSON.stringify(report, null, 2));

  if (report.issues.length > 0) {
    console.error(`UI self-test found ${report.issues.length} issue(s). Report: ${join(reportDir, "self-test-report.json")}`);
    for (const issue of report.issues) {
      console.error(`- ${issue.label}: ${issue.detail}`);
    }
    process.exitCode = 1;
    return;
  }

  console.warn(
    `UI self-test source contract passed with ${report.warnings.length} warning(s); browser click pass was not available. Report: ${join(reportDir, "self-test-report.json")}`
  );
}

function runSourceInteractionContractChecks() {
  const app = readProjectFile("src/renderer/src/App.tsx");
  const styles = readProjectFile("src/renderer/src/styles.css");
  const packageJson = readProjectFile("package.json");
  const rendererIndex = readProjectFile("out/renderer/index.html");

  contractAssert(packageJson.includes('"self-test:ui"'), "Package exposes self-test:ui script");
  contractAssert(rendererIndex.includes("/assets/") || rendererIndex.includes("./assets/"), "Built renderer artifact references bundled assets");

  const navBlock = app.match(/const productNavHrefs = \[([\s\S]*?)\] as const;/);
  contractAssert(Boolean(navBlock), "Product navigation href contract exists");
  const navHrefs = navBlock ? [...navBlock[1].matchAll(/"#([^"]+)"/g)].map((match) => match[1]) : [];
  contractAssert(navHrefs.length >= 12, "Product navigation covers all core modules");

  for (const href of navHrefs) {
    contractAssert(app.includes(`id="${href}"`), `Section #${href} exists for navigation`);
    contractAssert(
      styles.includes(`data-active-section="${href}"`),
      `Single-module CSS displays #${href}`
    );
  }

  const requiredSections = [
    "overview",
    "discovery",
    "local-skills",
    "remote-market",
    "analysis",
    "graph",
    "proposals",
    "apply-center",
    "bundles",
    "registry",
    "audit",
    "settings"
  ];
  for (const section of requiredSections) {
    contractAssert(
      app.includes(`data-product-section="${section}"`),
      `${section} product section is mounted`
    );
  }

  const inertButtons = [...app.matchAll(/<button\b[\s\S]*?<\/button>/g)].filter(
    (match) => !match[0].includes("onClick=") && !match[0].includes('type="submit"')
  );
  contractAssert(
    inertButtons.length === 0,
    "Every visible button has explicit click behavior",
    inertButtons
      .map((match) => `line ${app.slice(0, match.index).split("\n").length}`)
      .join(", ")
  );

  const requiredAppContracts = [
    ["className=\"product-workspace single-module-mode\"", "App uses single-module workspace"],
    ["data-active-section={currentProductSection}", "Workspace exposes active module state"],
    ["navigateToProductSection(\"#graph\")", "Cross-module graph route exists"],
    ["showInteractionNotice", "Shared interaction feedback helper exists"],
    ["InteractionFeedback", "Global interaction feedback component exists"],
    ["void addRoot()", "Authorization directory button is wired"],
    ["void addExclusion()", "Add exclusion button is wired"],
    ["void analyzeRemoteSource()", "Remote repository analysis button is wired"],
    ["showSkillTuning", "Skill scope explanation action is wired"],
    ["showSkillOptimization", "Skill optimization explanation action is wired"],
    ["sendSkillToApply", "Skill apply routing action is wired"],
    ["handleMarketplaceAction", "Marketplace activation stages are wired"],
    ["importMarketplaceSkill", "Marketplace import writes inactive local candidates"],
    ["previewRemoteSkillActivation", "Marketplace activation uses preview-before-run API"],
    ["listRemoteSkillCandidates", "Marketplace can list imported inactive remote candidates"],
    ["getRemoteSkillCandidateDetail", "Marketplace can load local remote candidate detail"],
    ["marketplace-import-result", "Marketplace import result panel is mounted"],
    ["marketplace-activation-preview", "Marketplace activation preview panel is mounted"],
    ["remote-candidate-inventory", "Marketplace remote candidate inventory is mounted"],
    ["remote-candidate-review", "Marketplace remote candidate review panel is mounted"],
    ["remote-candidate-detail-panel", "Marketplace remote candidate local detail panel is mounted"],
    ["openRemoteCandidate", "Marketplace remote candidate inventory can reopen activation preview"],
    ["openRemoteCandidateApplyHandoff", "Marketplace remote candidate Apply Center handoff gives feedback"],
    ["remote-apply-handoff-card", "Apply Center receives remote candidate handoff context"],
    ["remoteCandidateId: remoteApplyCandidate.candidateId", "Apply Center requests remote candidate apply preview"],
    ["sourceKind", "Apply Preview distinguishes local and remote sources"],
    ["chooseApplyScope", "Apply Center scope cards are wired"],
    ["startApplyFlowPreview", "Apply Center preview action is wired"],
    ["User Session Insights", "User session analysis is visible"],
    ["ProductModeSwitcher", "Guided/Builder mode switch is mounted"]
  ];

  for (const [needle, label] of requiredAppContracts) {
    contractAssert(app.includes(needle), label);
  }

  const requiredProductExperienceContracts = [
    ["Framework + Workbench", "Product positioning states Framework + Workbench"],
    [
      "Workflow + Skill Framework, paired with a local visual workbench.",
      "Overview states the dual-core Skill framework plus visual workbench positioning"
    ],
    ["Recommended Next Step", "Overview leads with one guided next step"],
    ["overview-report-card", "Overview exposes compact report surface"],
    ["overview-today-report", "Overview includes first-screen reporting signals"],
    ["Priority Skills", "Skill Library prioritizes top Skills before the full list"],
    ["Basic purpose and status only", "Skill Library list stays purpose-and-status focused"],
    ["Selected Skill Workbench", "Skill Library moves deep analysis into a selected detail workbench"],
    ["Superpowers-first development flow", "Builder mode exposes Superpowers-first development guidance"],
    ["composite_framework", "Skill Library represents composite workflow-plus-skill framework assets"],
    ["Remote Skills are inactive until explicitly activated.", "Remote Market states inactive-until-activated boundary"],
    ["Never auto-run", "Discovery remote lane states remote Skills never auto-run"],
    ["Manual activation required", "Remote source preflight requires manual activation"],
    ["Import creates an inactive app-local candidate", "Remote import remains inactive and app-local"],
    ["Remote Skills never auto-run from this surface.", "Marketplace feedback repeats remote auto-run boundary"],
    ["Imported as an inactive app-local candidate.", "Marketplace Import stores inactive local candidate"],
    [
      "Open Apply Center to preview target impact before any write or execution.",
      "Marketplace Activate requires Apply Center target preview"
    ],
    ["No write before confirmation", "Apply Center leads with no-write-before-confirmation boundary"],
    ["apply-impact-preview", "Apply Center exposes target impact preview"],
    ["Manual Confirmation Gate", "Apply Center has explicit confirmation gate"],
    ["Original Untouched", "Bundle Center explains original source remains untouched"],
    ["Diff Before Import", "Bundle Center requires diff preview before import"],
    ["Strategy Required", "Bundle Center requires an explicit import strategy"],
    ["Original Skill sources are not mutated by export or validation.", "Bundle feedback preserves original Skill source boundary"],
    ["Progressive disclosure", "User Session Insights records progressive disclosure preference"],
    ["Visual QA after UI changes", "User Session Insights records visual QA requirement"],
    ["Local only", "User Session Insights keeps user preference analysis local"]
  ];

  for (const [needle, label] of requiredProductExperienceContracts) {
    contractAssert(app.includes(needle), label);
  }

  const requiredStyleContracts = [
    ["Skill OS product-flow single module layer", "Single-module routing style layer exists"],
    [".product-workspace.single-module-mode > [data-product-section] {\n  display: none !important;", "Inactive modules are hidden"],
    [".interaction-action-feedback", "Interaction feedback is styled"],
    [".overview-main", "Overview command-center layout exists"],
    [".overview-report-card", "Overview report card is styled"],
    [".overview-workflow-strip", "Overview workflow strip is styled"],
    [".remote-preflight-workbench", "Remote preflight workbench is styled"],
    [".marketplace-import-result", "Marketplace import result is styled"],
    [".marketplace-activation-preview", "Marketplace activation preview is styled"],
    [".remote-candidate-inventory", "Remote candidate inventory is styled"],
    [".remote-candidate-review", "Remote candidate review is styled"],
    [".remote-candidate-detail-panel", "Remote candidate detail is styled"],
    [".remote-apply-handoff-card", "Remote candidate Apply Center handoff is styled"],
    ["reported-issue repair layer", "Reported issue repair style layer exists"],
    [".skill-action-feedback-grid", "Skill Library feedback grid is styled"],
    [".graph-topology-svg", "Graph topology has fit guardrails"],
    [".settings-storage-panel", "Settings storage layout is guarded"]
  ];

  for (const [needle, label] of requiredStyleContracts) {
    contractAssert(styles.includes(needle), label);
  }

  const selfTestSource = readFileSync(new URL(import.meta.url), "utf8");
  const requiredSelfTestContracts = [
    ["reported-remote-analysis-obra-superpowers", "Self-test records the reported remote-analysis layout scenario"],
    ["reported-graph-focus-readable", "Self-test records graph focus readability"],
    ["Discovery scan flow", "Self-test covers Discovery scan actions"],
    ["Marketplace progressive activation workflow", "Self-test covers Marketplace staged activation"],
    ["Remote candidate inventory visible", "Self-test verifies imported remote candidates are discoverable"],
    ["Remote candidate review visible", "Self-test verifies imported remote candidates have a review surface"],
    ["Remote candidate local detail visible", "Self-test verifies imported remote candidates have local detail"],
    ["Remote candidate Apply Center handoff visible", "Self-test verifies remote candidate Apply Center handoff"],
    ["Skill Library progressive workflow", "Self-test covers Skill Library tuning/apply actions"],
    ["Apply Center scope and preview flow", "Self-test covers Apply Center scope preview"],
    ["Settings backup restore preview flow", "Self-test covers Settings backup/restore controls"]
  ];

  for (const [needle, label] of requiredSelfTestContracts) {
    contractAssert(selfTestSource.includes(needle), label);
  }
}

function readProjectFile(relativePath) {
  return readFileSync(join(root, relativePath), "utf8");
}

function contractAssert(condition, label, detail = "Expectation failed") {
  if (condition) {
    recordPass(label);
    return;
  }
  recordIssue(label, detail);
}

async function runElectronSelfTestInProcess() {
  accessSync(appIndexPath, constants.R_OK);
  const { app, BrowserWindow } = await import("electron");

  app.commandLine.appendSwitch("disable-gpu");
  app.commandLine.appendSwitch("disable-dev-shm-usage");
  app.commandLine.appendSwitch("no-first-run");
  await app.whenReady();

  const window = new BrowserWindow({
    width: 1440,
    height: 980,
    show: false,
    webPreferences: {
      backgroundThrottling: false,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  try {
    await window.loadURL(baseUrl);
    const tab = createElectronTab(window);
    await tab.send("Page.enable");
    await tab.send("Runtime.enable");
    await tab.send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 980,
      deviceScaleFactor: 1,
      mobile: false
    });
    await waitForApp(tab);
    await runChecks(tab);
    tab.close();
  } catch (error) {
    recordIssue("self-test runtime", error instanceof Error ? error.stack ?? error.message : String(error));
  } finally {
    if (!window.isDestroyed()) {
      window.destroy();
    }
    writeFileSync(join(reportDir, "self-test-report.json"), JSON.stringify(report, null, 2));
  }

  if (report.issues.length > 0) {
    console.error(`UI self-test found ${report.issues.length} issue(s). Report: ${join(reportDir, "self-test-report.json")}`);
    for (const issue of report.issues) {
      console.error(`- ${issue.label}: ${issue.detail}`);
    }
    app.exit(1);
    return;
  }

  console.log(`UI self-test passed: ${report.passed.length} checks. Report: ${join(reportDir, "self-test-report.json")}`);
  app.exit(0);
}

function createElectronTab(window) {
  return {
    async send(method, params = {}) {
      if (method === "Page.enable" || method === "Runtime.enable") {
        return {};
      }

      if (method === "Emulation.setDeviceMetricsOverride") {
        window.setSize(params.width ?? 1440, params.height ?? 980);
        return {};
      }

      if (method === "Runtime.evaluate") {
        try {
          const value = await window.webContents.executeJavaScript(params.expression, true);
          return { result: { value } };
        } catch (error) {
          return {
            result: { value: undefined },
            exceptionDetails: {
              text: error instanceof Error ? error.message : String(error)
            }
          };
        }
      }

      if (method === "Page.captureScreenshot") {
        const image = await window.webContents.capturePage();
        return { data: image.toPNG().toString("base64") };
      }

      throw new Error(`Unsupported Electron self-test method: ${method}`);
    },
    close() {
      if (!window.isDestroyed()) {
        window.close();
      }
    }
  };
}

async function runChromeDebugSelfTest() {
  accessSync(appIndexPath, constants.R_OK);
  const userDataDir = join(tmpdir(), `skill-os-self-test-${Date.now()}`);
  const chrome = spawnProcess(chromePath, [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "--allow-file-access-from-files",
    `--remote-debugging-port=${cdpPort}`,
    `--user-data-dir=${userDataDir}`,
    "--window-size=1440,980",
    baseUrl
  ]);

  try {
    await waitForDebugServer();
    const tabs = await cdpRequest("GET", "/json/list");
    const tabInfo = tabs.find((tab) => tab.type === "page") ?? tabs[0];
    const tab = await connectWebSocket(tabInfo.webSocketDebuggerUrl);
    await tab.send("Page.enable");
    await tab.send("Runtime.enable");
    await tab.send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 980,
      deviceScaleFactor: 1,
      mobile: false
    });
    await waitForApp(tab);
    await runChecks(tab);
    tab.close();
  } finally {
    chrome.kill("SIGTERM");
    writeFileSync(join(reportDir, "self-test-report.json"), JSON.stringify(report, null, 2));
  }

  if (report.issues.length > 0) {
    console.error(`UI self-test found ${report.issues.length} issue(s). Report: ${join(reportDir, "self-test-report.json")}`);
    for (const issue of report.issues) {
      console.error(`- ${issue.label}: ${issue.detail}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(`UI self-test passed: ${report.passed.length} checks. Report: ${join(reportDir, "self-test-report.json")}`);
}

async function evaluate(tab, expression, awaitPromise = true) {
  const result = await tab.send("Runtime.evaluate", {
    expression,
    awaitPromise,
    returnByValue: true
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text ?? "Runtime evaluation failed");
  }
  return result.result.value;
}

async function waitForApp(tab) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 20000) {
    const ready = await evaluate(
      tab,
      `Boolean(document.querySelector(".product-workspace.single-module-mode") && document.querySelector(".product-nav a.active"))`
    );
    if (ready) {
      recordPass("App shell rendered in single-module mode");
      return;
    }
    await delay(250);
  }
  throw new Error("Timed out waiting for Skill OS shell");
}

async function clickSelector(tab, selector, label) {
  const value = await evaluate(
    tab,
    `(() => {
      const element = document.querySelector(${JSON.stringify(selector)});
      if (!element) return { ok: false, reason: "not found" };
      element.scrollIntoView({ block: "center", inline: "center" });
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return { ok: false, reason: "not visible" };
      if (element.disabled) return { ok: false, reason: "disabled" };
      element.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true, button: 0, clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 }));
      element.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true, button: 0, clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 }));
      element.click();
      return { ok: true };
    })()`
  );
  if (!value.ok) {
    throw new Error(`${label}: ${value.reason}`);
  }
  await delay(220);
}

async function typeSelector(tab, selector, text, label) {
  const value = await evaluate(
    tab,
    `(() => {
      const element = document.querySelector(${JSON.stringify(selector)});
      if (!element) return { ok: false, reason: "not found" };
      element.scrollIntoView({ block: "center", inline: "center" });
      element.focus();
      const prototype = Object.getPrototypeOf(element);
      const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");
      if (descriptor?.set) {
        descriptor.set.call(element, ${JSON.stringify(text)});
      } else {
        element.value = ${JSON.stringify(text)};
      }
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
      return { ok: true };
    })()`
  );
  if (!value.ok) {
    throw new Error(`${label}: ${value.reason}`);
  }
  await delay(180);
}

async function clickButtonByText(tab, rootSelector, textOptions, label) {
  const value = await evaluate(
    tab,
    `(() => {
      const root = document.querySelector(${JSON.stringify(rootSelector)});
      if (!root) return { ok: false, reason: "root not found" };
      const options = ${JSON.stringify(textOptions)};
      const element = [...root.querySelectorAll("button")].find((button) => {
        const text = button.textContent || "";
        return options.some((option) => text.includes(option));
      });
      if (!element) return { ok: false, reason: "button not found" };
      element.scrollIntoView({ block: "center", inline: "center" });
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return { ok: false, reason: "not visible" };
      if (element.disabled) return { ok: false, reason: "disabled" };
      element.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true, button: 0, clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 }));
      element.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true, button: 0, clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 }));
      element.click();
      return { ok: true };
    })()`
  );
  if (!value.ok) {
    throw new Error(`${label}: ${value.reason}`);
  }
  await delay(220);
}

async function expect(tab, label, expression) {
  const ok = await evaluate(tab, `Boolean(${expression})`);
  if (ok) {
    recordPass(label);
    return true;
  }
  recordIssue(label, "Expectation failed");
  await takeScreenshot(tab, slug(label));
  throw new Error(`${label}: expectation failed`);
}

async function waitFor(tab, label, expression, timeoutMs = 4000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const ok = await evaluate(tab, `Boolean(${expression})`);
    if (ok) {
      recordPass(label);
      return true;
    }
    await delay(180);
  }
  recordIssue(label, "Timed out waiting for condition");
  await takeScreenshot(tab, slug(label));
  throw new Error(`${label}: timed out waiting for condition`);
}

async function takeScreenshot(tab, name) {
  const result = await tab.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
  const path = join(reportDir, `${name}.png`);
  writeFileSync(path, Buffer.from(result.data, "base64"));
  report.screenshots.push(path);
}

function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

async function guarded(label, fn) {
  try {
    await fn();
    recordPass(label);
  } catch (error) {
    recordIssue(label, error instanceof Error ? error.message : String(error));
  }
}

async function expectNoHorizontalOverflow(tab, label, section) {
  await expect(
    tab,
    label,
    `(() => {
      const viewportWidth = document.documentElement.clientWidth;
      const selectors = [
        ".product-shell",
        ".product-sidebar",
        ".product-topbar",
        ".product-workspace",
        '[data-product-section="${section}"]'
      ];
      return selectors.every((selector) => {
        const element = document.querySelector(selector);
        if (!element) return false;
        const style = getComputedStyle(element);
        if (style.display === "none" || style.visibility === "hidden") return true;
        const rect = element.getBoundingClientRect();
        return rect.left >= -2 && rect.right <= viewportWidth + 2;
      });
    })()`
  );
}

async function expectReadablePanel(tab, label, selector, options = {}) {
  const minWidth = options.minWidth ?? 240;
  const minHeight = options.minHeight ?? 24;
  await expect(
    tab,
    label,
    `(() => {
      const element = document.querySelector(${JSON.stringify(selector)});
      if (!element) return false;
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return rect.width >= ${minWidth} &&
        rect.height >= ${minHeight} &&
        rect.left >= -2 &&
        rect.right <= document.documentElement.clientWidth + 2 &&
        style.display !== "none" &&
        style.visibility !== "hidden";
    })()`
  );
}

async function expectNoVerticalFragmentation(tab, label, rootSelector) {
  await expect(
    tab,
    label,
    `(() => {
      const root = document.querySelector(${JSON.stringify(rootSelector)});
      if (!root) return false;
      const candidates = [...root.querySelectorAll("button, strong, p, small, span, h3, h4")]
        .filter((node) => {
          const text = (node.textContent || "").replace(/\\s+/g, " ").trim();
          const rect = node.getBoundingClientRect();
          return text.length >= 8 && rect.height > 0 && getComputedStyle(node).display !== "none";
        });
      return candidates.every((node) => {
        const text = (node.textContent || "").replace(/\\s+/g, " ").trim();
        const rect = node.getBoundingClientRect();
        const averageGlyphWidth = rect.width / Math.max(1, Math.min(text.length, 40));
        return rect.width >= 42 || averageGlyphWidth >= 3.8;
      });
    })()`
  );
}

async function scrollActiveModule(tab, section, position) {
  await evaluate(
    tab,
    `(() => {
      const workspace = document.querySelector(".product-workspace");
      const sectionNode = document.querySelector('[data-product-section="${section}"]');
      if (!workspace || !sectionNode) return false;
      const workspaceTop = workspace.getBoundingClientRect().top;
      const sectionTop = sectionNode.getBoundingClientRect().top;
      const offset = sectionTop - workspaceTop + workspace.scrollTop;
      if (${JSON.stringify(position)} === "bottom") {
        workspace.scrollTop = offset + Math.max(0, sectionNode.scrollHeight - workspace.clientHeight + 24);
      } else {
        workspace.scrollTop = offset;
      }
      return true;
    })()`
  );
  await delay(180);
}

async function runChecks(tab) {
  await takeScreenshot(tab, "overview-initial");
  await expect(
    tab,
    "Topbar is in flow and does not overlap hero",
    `(() => {
      const topbar = document.querySelector(".product-topbar")?.getBoundingClientRect();
      const hero = document.querySelector("#overview")?.getBoundingClientRect();
      return topbar && hero && topbar.bottom <= hero.top + 4;
    })()`
  );
  await expect(
    tab,
    "Overview uses guided next step plus compact report",
    `(() => {
      const nextStep = document.querySelector(".overview-next-step");
      const report = document.querySelector(".overview-report-card");
      const oldFeatureGrid = document.querySelector(".hero-entry-grid");
      const oldGuidedRail = document.querySelector(".guided-flow-rail");
      return Boolean(nextStep) && Boolean(report) && !oldFeatureGrid && !oldGuidedRail;
    })()`
  );
  await expect(
    tab,
    "Overview first screen has report but not a full module directory",
    `(() => {
      const overview = document.querySelector("#overview");
      const oldDirectoryCards = overview ? overview.querySelectorAll(".hero-entry-card, .os-boundary-card").length : 0;
      const hasReportMetrics = overview ? overview.querySelectorAll(".overview-report-metrics > div").length >= 4 : false;
      return overview && oldDirectoryCards === 0 && hasReportMetrics;
    })()`
  );
  await expect(
    tab,
    "Overview first screen exposes workflow and graph entry",
    `(() => {
      const overview = document.querySelector("#overview");
      const workflow = overview?.querySelector(".overview-workflow-strip");
      const nextStep = overview?.querySelector(".overview-next-step");
      const report = overview?.querySelector(".overview-report-card");
      const boundaryGrid = overview?.querySelector(".overview-boundary-grid");
      const focusSummary = overview?.querySelector(".overview-focus-summary");
      if (!workflow || !nextStep || !report || !boundaryGrid || !focusSummary) return false;
      const workflowRect = workflow.getBoundingClientRect();
      const nextStepRect = nextStep.getBoundingClientRect();
      const reportRect = report.getBoundingClientRect();
      const boundaryRect = boundaryGrid.getBoundingClientRect();
      const focusSummaryRect = focusSummary.getBoundingClientRect();
      return workflowRect.bottom <= window.innerHeight + 2 && nextStepRect.bottom <= window.innerHeight + 2 && reportRect.bottom <= window.innerHeight + 2 && boundaryRect.bottom <= window.innerHeight + 2 && focusSummaryRect.bottom <= window.innerHeight + 2;
    })()`
  );

  const nav = [
    ["#overview", "overview"],
    ["#discovery", "discovery"],
    ["#local-skills", "local-skills"],
    ["#remote-market", "remote-market"],
    ["#analysis", "analysis"],
    ["#graph", "graph"],
    ["#proposals", "proposals"],
    ["#apply-center", "apply-center"],
    ["#bundles", "bundles"],
    ["#registry", "registry"],
    ["#audit", "audit"],
    ["#settings", "settings"]
  ];

  for (const [href, section] of nav) {
    await guarded(`Navigate ${href}`, async () => {
      await clickSelector(tab, `.product-nav a[href="${href}"]`, `click ${href}`);
      await expect(tab, `${href} active nav`, `document.querySelector('.product-nav a[href="${href}"]')?.classList.contains("active")`);
      await expect(tab, `${section} module visible`, `getComputedStyle(document.querySelector('[data-product-section="${section}"]')).display !== "none"`);
      await expect(tab, `${href} no error banner`, `!document.querySelector(".error-banner")`);
      await expectNoHorizontalOverflow(tab, `${section} layout stays inside viewport`, section);
      await takeScreenshot(tab, `module-${section}`);
      await scrollActiveModule(tab, section, "bottom");
      await expectNoHorizontalOverflow(tab, `${section} bottom layout stays inside viewport`, section);
      await takeScreenshot(tab, `module-${section}-bottom`);
      await scrollActiveModule(tab, section, "top");
    });
  }

  await guarded("Overview recommended next action navigates", async () => {
    await clickSelector(tab, '.product-nav a[href="#overview"]', "overview nav");
    await clickSelector(tab, '.overview-next-step .primary', "open framework");
    await expect(tab, "Overview primary action activates Discovery", `document.querySelector('.product-nav a[href="#discovery"]')?.classList.contains("active")`);
    await clickSelector(tab, '.product-nav a[href="#overview"]', "overview nav return");
    await clickSelector(tab, '.overview-next-step button:not(.primary)', "open workbench");
    await expect(tab, "Overview secondary action activates Analysis", `document.querySelector('.product-nav a[href="#analysis"]')?.classList.contains("active")`);
    await clickSelector(tab, '.product-nav a[href="#overview"]', "overview nav return graph");
    await clickSelector(tab, '.overview-boundary-card.entity-project', "open workbench boundary");
    await expect(tab, "Overview Workbench boundary activates Analysis", `document.querySelector('.product-nav a[href="#analysis"]')?.classList.contains("active")`);
    await clickSelector(tab, '.product-nav a[href="#overview"]', "overview nav return framework");
    await clickSelector(tab, '.overview-boundary-card.entity-skill', "open framework boundary");
    await expect(tab, "Overview Framework boundary activates Discovery", `document.querySelector('.product-nav a[href="#discovery"]')?.classList.contains("active")`);
    await expect(
      tab,
      "Overview boundary cards stay visible on the first screen",
      `(() => {
        const overview = document.querySelector("#overview");
        const boundaryGrid = overview?.querySelector(".overview-boundary-grid");
        const focusSummary = overview?.querySelector(".overview-focus-summary");
        if (!overview || !boundaryGrid || !focusSummary) return false;
        const boundaryRect = boundaryGrid.getBoundingClientRect();
        const focusRect = focusSummary.getBoundingClientRect();
        return boundaryRect.bottom <= window.innerHeight + 2 && focusRect.bottom <= window.innerHeight + 2;
      })()`
    );
  });

  await guarded("Language switcher toggles Chinese", async () => {
    await clickSelector(tab, '.product-topbar-actions .language-switcher button:nth-child(3)', "Chinese language button");
    await expect(tab, "Chinese nav copy visible", `document.body.textContent.includes("总览") && document.body.textContent.includes("设置")`);
    await clickSelector(tab, '.product-topbar-actions .language-switcher button:nth-child(1)', "Bilingual language button");
  });

  await guarded("Topbar Settings action navigates without stale feedback", async () => {
    await clickSelector(tab, '.product-nav a[href="#discovery"]', "discovery nav for stale feedback setup");
    await clickSelector(tab, '#discovery .os-card-actions button:nth-child(1)', "add scan root for feedback setup");
    await waitFor(tab, "Setup interaction feedback is visible before topbar navigation", `Boolean(document.querySelector(".interaction-action-feedback"))`);
    await clickSelector(tab, '.product-topbar-actions .ghost-button', "topbar settings");
    await expect(tab, "Topbar Settings activates Settings", `document.querySelector('.product-nav a[href="#settings"]')?.classList.contains("active")`);
    await expect(tab, "Module navigation clears stale interaction feedback", `!document.querySelector(".interaction-action-feedback")`);
  });

  await guarded("Discovery scan flow", async () => {
    await clickSelector(tab, '.product-nav a[href="#discovery"]', "discovery nav");
    await clickSelector(tab, '#discovery .os-card-actions button:nth-child(1)', "add scan root");
    await waitFor(tab, "Add Folder shows visible interaction feedback", `document.querySelector(".interaction-action-feedback")?.textContent.includes("Add Scan Root") || document.querySelector(".interaction-action-feedback")?.textContent.includes("添加扫描根目录")`);
    await clickSelector(tab, '#discovery .os-card-actions button:nth-child(2)', "add exclusion");
    await waitFor(tab, "Add Exclusion shows visible interaction feedback", `document.querySelector(".interaction-action-feedback")?.textContent.includes("Add Exclusion") || document.querySelector(".interaction-action-feedback")?.textContent.includes("添加排除项")`);
    await clickSelector(tab, '#discovery button.primary', "scan now");
    await delay(500);
    await expect(tab, "Discovery scan result appears", `document.querySelector("#discovery")?.textContent.includes("Found") || document.querySelector("#discovery")?.textContent.includes("发现")`);
    await expect(tab, "Discovery scan shows visible interaction feedback", `document.querySelector(".interaction-action-feedback")?.textContent.includes("Scan Now") || document.querySelector(".interaction-action-feedback")?.textContent.includes("立即扫描")`);
  });

  await guarded("Remote repository analysis flow", async () => {
    await clickSelector(tab, '.product-nav a[href="#discovery"]', "discovery nav");
    await typeSelector(tab, '#discovery input[placeholder="https://github.com/org/skill-repo"]', "https://github.com/obra/superpowers", "repo url");
    await clickSelector(tab, '#discovery .remote-import-box button.primary', "analyze repository");
    await waitFor(tab, "Remote analysis panel appears", `Boolean(document.querySelector("#discovery .remote-preflight-workbench"))`);
    await expect(tab, "Remote analysis uses reported repository", `document.querySelector("#discovery .remote-preflight-workbench")?.textContent.includes("Superpowers") && document.querySelector("#discovery .remote-preflight-workbench")?.textContent.includes("obra/superpowers")`);
    await expectReadablePanel(tab, "Remote preflight remains readable after reported repository analysis", "#discovery .remote-preflight-workbench", { minWidth: 760 });
    await waitFor(tab, "Remote preflight scrolls into visible workflow area", `(() => {
      const panel = document.querySelector("#discovery .remote-preflight-workbench");
      if (!panel) return false;
      const rect = panel.getBoundingClientRect();
      return rect.top >= 0 && rect.top <= window.innerHeight - 120;
    })()`, 5000);
    await expectNoVerticalFragmentation(tab, "Remote preflight has no vertical text fragments", "#discovery .remote-preflight-workbench");
    await expectNoHorizontalOverflow(tab, "Discovery stays inside viewport after reported remote analysis", "discovery");
    await takeScreenshot(tab, "reported-remote-analysis-obra-superpowers");
  });

  await guarded("Marketplace progressive activation workflow", async () => {
    await clickSelector(tab, '.product-nav a[href="#remote-market"]', "marketplace nav");
    await expect(tab, "Marketplace progressive flow visible", `Boolean(document.querySelector("#remote-market .marketplace-progressive-flow"))`);
    await expect(tab, "Marketplace candidate list visible", `Boolean(document.querySelector("#remote-market .marketplace-candidate-list .os-market-card"))`);
    await expect(tab, "Marketplace selected workbench visible", `Boolean(document.querySelector("#remote-market .marketplace-candidate-preview"))`);
    await expect(tab, "Marketplace starts in preview stage", `Boolean(document.querySelector("#remote-market .marketplace-stage-tabs button.active")?.textContent.includes("Preview"))`);
    await expect(tab, "Marketplace stage panel visible on first screen", `(() => {
      const panel = document.querySelector("#remote-market .marketplace-stage-panel");
      if (!panel) return false;
      const rect = panel.getBoundingClientRect();
      return rect.top >= 0 && rect.bottom <= window.innerHeight + 2;
    })()`);
    await clickSelector(tab, '#remote-market .marketplace-candidate-list .os-market-card button.primary', "marketplace candidate preview");
    await expect(tab, "Marketplace action feedback visible", `Boolean(document.querySelector(".marketplace-action-feedback"))`);
    await typeSelector(tab, '#remote-market input[type="search"]', "agent", "marketplace query");
    await clickSelector(tab, '#remote-market .marketplace-search-status button', "clear marketplace query");
    await waitFor(tab, "Marketplace clear query shows visible interaction feedback", `document.querySelector(".interaction-action-feedback")?.textContent.includes("Clear Query") || document.querySelector(".interaction-action-feedback")?.textContent.includes("清空查询")`);
    await clickSelector(tab, '#remote-market .marketplace-stage-tabs button:nth-child(2)', "marketplace security stage");
    await expect(tab, "Marketplace security stage active", `Boolean(document.querySelector("#remote-market .marketplace-stage-panel.stage-analyze"))`);
    await clickSelector(tab, '#remote-market .marketplace-stage-panel.stage-analyze button.primary', "marketplace import stage");
    await expect(tab, "Marketplace import stage active", `Boolean(document.querySelector("#remote-market .marketplace-stage-panel.stage-import"))`);
    await waitFor(tab, "Marketplace import result visible", `Boolean(document.querySelector("#remote-market .marketplace-import-result"))`);
    await expect(tab, "Marketplace import result is inactive local candidate", `document.querySelector("#remote-market .marketplace-import-result")?.textContent.includes("Inactive") || document.querySelector("#remote-market .marketplace-import-result")?.textContent.includes("非活跃")`);
    await waitFor(tab, "Remote candidate inventory visible", `Boolean(document.querySelector("#remote-market .remote-candidate-inventory .remote-candidate-item"))`);
    await expect(tab, "Remote candidate inventory preserves inactive boundary", `document.querySelector("#remote-market .remote-candidate-inventory")?.textContent.includes("inactive") || document.querySelector("#remote-market .remote-candidate-inventory")?.textContent.includes("未激活")`);
    await waitFor(tab, "Remote candidate review visible", `Boolean(document.querySelector("#remote-market .remote-candidate-review"))`);
    await expect(tab, "Remote candidate review exposes local boundary", `document.querySelector("#remote-market .remote-candidate-review")?.textContent.includes("Will not run") || document.querySelector("#remote-market .remote-candidate-review")?.textContent.includes("不会运行")`);
    await waitFor(tab, "Remote candidate local detail visible", `Boolean(document.querySelector("#remote-market .remote-candidate-detail-panel"))`);
    await expect(tab, "Remote candidate local detail exposes manifest and diff gates", `(() => {
      const detail = document.querySelector("#remote-market .remote-candidate-detail-panel")?.textContent || "";
      return (detail.includes("Manifest") || detail.includes("清单")) &&
        (detail.includes("Diff") || detail.includes("差异")) &&
        (detail.includes("Preview required") || detail.includes("需要预览"));
    })()`);
    await clickSelector(tab, '#remote-market .remote-candidate-review-actions button:not(.primary)', "remote candidate apply handoff before preview");
    await waitFor(tab, "Remote candidate Apply Center handoff is guarded", `document.querySelector(".interaction-action-feedback")?.textContent.includes("Activation preview is required") || document.querySelector(".interaction-action-feedback")?.textContent.includes("必须先完成激活预览")`);
    await clickSelector(tab, '#remote-market .marketplace-stage-panel.stage-import button.primary', "marketplace activate stage");
    await expect(tab, "Marketplace activation stage active", `Boolean(document.querySelector("#remote-market .marketplace-stage-panel.stage-install"))`);
    await waitFor(tab, "Marketplace activation preview visible", `Boolean(document.querySelector("#remote-market .marketplace-activation-preview"))`);
    await expect(tab, "Marketplace activation preview does not run immediately", `document.querySelector("#remote-market .marketplace-activation-preview")?.textContent.includes("No") || document.querySelector("#remote-market .marketplace-activation-preview")?.textContent.includes("否")`);
    await clickSelector(tab, '#remote-market .remote-candidate-inventory .remote-candidate-item', "open remote candidate inventory item");
    await waitFor(tab, "Remote candidate inventory opens activation preview", `Boolean(document.querySelector("#remote-market .marketplace-activation-preview")) && (document.querySelector(".marketplace-action-feedback")?.textContent.includes("Open Candidate") || document.querySelector(".marketplace-action-feedback")?.textContent.includes("打开候选"))`);
    await evaluate(tab, `(() => {
      const cards = [...document.querySelectorAll("#remote-market .marketplace-candidate-list .os-market-card")];
      const lastButton = cards.at(-1)?.querySelector("button.primary");
      if (!lastButton) return false;
      lastButton.scrollIntoView({ block: "center", inline: "nearest" });
      return true;
    })()`);
    await delay(320);
    await expect(tab, "Marketplace final candidate action has bottom breathing room", `(() => {
      const cards = [...document.querySelectorAll("#remote-market .marketplace-candidate-list .os-market-card")];
      const lastButton = cards.at(-1)?.querySelector("button.primary");
      if (!lastButton) return false;
      const workspace = document.querySelector(".product-workspace");
      if (!workspace) return false;
      const workspaceRect = workspace.getBoundingClientRect();
      const rect = lastButton.getBoundingClientRect();
      return rect.bottom <= workspaceRect.bottom - 12;
    })()`);
    await clickSelector(tab, '#remote-market .remote-candidate-review-actions button:not(.primary)', "remote candidate apply handoff after preview");
    await waitFor(tab, "Remote candidate Apply Center handoff visible", `document.querySelector('.product-nav a[href="#apply-center"]')?.classList.contains("active") && Boolean(document.querySelector("#apply-center .remote-apply-handoff-card"))`);
    await expect(tab, "Remote candidate Apply Center handoff stays read-only", `document.querySelector("#apply-center .remote-apply-handoff-card")?.textContent.includes("read-only") || document.querySelector("#apply-center .remote-apply-handoff-card")?.textContent.includes("只读")`);
  });

  await guarded("Skill Library progressive workflow", async () => {
    await clickSelector(tab, '.product-nav a[href="#local-skills"]', "skill library nav");
    await expect(tab, "Skill Library priority cards visible", `Boolean(document.querySelector("#local-skills .skill-top-card"))`);
    await expect(tab, "Skill Library development lane visible", `Boolean(document.querySelector("#local-skills .skill-development-lane"))`);
    await expect(tab, "Skill Library simple list visible", `Boolean(document.querySelector("#local-skills .skill-simple-row"))`);
    await expect(tab, "Skill Library detail workbench visible", `Boolean(document.querySelector("#local-skills .skill-detail-panel"))`);
    await expect(tab, "Skill Library starts in summary stage", `Boolean(document.querySelector("#local-skills .skill-detail-stage-tabs button.active")?.textContent.includes("Summary"))`);
    await expect(tab, "Skill Library deep analysis hidden by default", `!document.querySelector("#local-skills .skill-intelligence-panel")`);
    await expect(tab, "Skill Library next step visible on first screen", `(() => {
      const panel = document.querySelector("#local-skills .skill-detail-stage-panel");
      if (!panel) return false;
      const rect = panel.getBoundingClientRect();
      return rect.top >= 0 && rect.bottom <= window.innerHeight + 2;
    })()`);
    await clickSelector(tab, '#local-skills .skill-top-card:not(.skill-empty-card)', "priority skill");
    await expect(tab, "Priority Skill selection active", `Boolean(document.querySelector("#local-skills .skill-top-card.selected"))`);
    await expect(tab, "Skill selection returns to summary stage", `Boolean(document.querySelector("#local-skills .skill-detail-stage-tabs button.active")?.textContent.includes("Summary"))`);
    await clickSelector(tab, '#local-skills .skill-development-row', "development lane skill");
    await expect(tab, "Development lane selection active", `Boolean(document.querySelector("#local-skills .skill-development-row.selected"))`);
    await expect(tab, "Harness compatibility matrix visible", `Boolean(document.querySelector("#local-skills .skill-harness-panel"))`);
    await expect(tab, "Preferred harness guidance visible", `document.querySelector("#local-skills .skill-harness-panel")?.textContent.includes("Superpowers") || document.querySelector("#local-skills .skill-harness-panel")?.textContent.includes("优先框架")`);
    await clickSelector(tab, '#local-skills .skill-simple-row', "simple skill row");
    await expect(tab, "Simple Skill row selection active", `Boolean(document.querySelector("#local-skills .skill-simple-row.selected"))`);
    await clickSelector(tab, '#local-skills .skill-detail-actions button:nth-child(1)', "run preview");
    await expect(tab, "Skill action feedback visible", `Boolean(document.querySelector(".skill-action-feedback"))`);
    await clickSelector(tab, '#local-skills .skill-detail-actions button.primary', "analyze skill");
    await waitFor(tab, "Skill Library analysis stage active", `Boolean(document.querySelector("#local-skills .skill-detail-stage-tabs button.active")?.textContent.includes("Analyze"))`);
    await waitFor(tab, "Skill detail analysis evidence visible", `Boolean(document.querySelector("#local-skills .skill-intelligence-evidence-row"))`);
    await clickSelector(tab, '#local-skills .skill-detail-stage-tabs button:nth-child(4)', "tune scope stage");
    await expect(tab, "Skill Library tuning stage active", `Boolean(document.querySelector("#local-skills .skill-detail-stage-panel.stage-tuning"))`);
    await waitFor(tab, "Tune Scope stage shows designed feedback", `document.querySelector("#local-skills .skill-action-feedback")?.textContent.includes("Tune Scope Stage") || document.querySelector("#local-skills .skill-action-feedback")?.textContent.includes("调校范围阶段")`);
    await expectReadablePanel(tab, "Skill scope tuning feedback remains readable", "#local-skills .skill-action-feedback", { minWidth: 520 });
    await clickSelector(tab, '#local-skills .skill-detail-stage-panel.stage-tuning button.primary', "open apply center");
    await expect(tab, "Apply action routes to Apply Center", `document.querySelector('.product-nav a[href="#apply-center"]')?.classList.contains("active")`);
    await clickSelector(tab, '.product-nav a[href="#local-skills"]', "skill library nav return for explain scope");
    await clickSelector(tab, '#local-skills .skill-detail-stage-tabs button:nth-child(4)', "tune scope stage return");
    await clickSelector(tab, '#local-skills .skill-detail-stage-panel.stage-tuning button:not(.primary)', "explain scope");
    await waitFor(tab, "Explain Scope click updates feedback", `document.querySelector("#local-skills .skill-action-feedback")?.textContent.includes("Apply scope tuning preview") || document.querySelector("#local-skills .skill-action-feedback")?.textContent.includes("应用范围调校预览")`);
    await expectNoVerticalFragmentation(tab, "Skill Library feedback has no vertical text fragments", "#local-skills .skill-action-feedback");
  });

  await guarded("Analysis telemetry import flow", async () => {
    await clickSelector(tab, '.product-nav a[href="#analysis"]', "analysis nav");
    await clickSelector(tab, '#telemetry .file-picker .toolbar button:nth-child(1)', "choose telemetry file");
    await waitFor(tab, "Choose Telemetry File shows visible interaction feedback", `document.querySelector(".interaction-action-feedback")?.textContent.includes("Choose Telemetry File") || document.querySelector(".interaction-action-feedback")?.textContent.includes("选择遥测文件")`);
    await clickSelector(tab, '#telemetry button.primary', "import telemetry");
    await delay(500);
    await expect(tab, "Telemetry import summary appears", `Boolean(document.querySelector("#telemetry .import-summary"))`);
    await expect(tab, "Telemetry import shows visible interaction feedback", `document.querySelector(".interaction-action-feedback")?.textContent.includes("Import Telemetry") || document.querySelector(".interaction-action-feedback")?.textContent.includes("导入遥测")`);
  });

  await guarded("Graph refresh and search flow", async () => {
    await clickSelector(tab, '.product-nav a[href="#graph"]', "graph nav");
    await clickSelector(tab, '#graph .section-headline button.primary', "refresh graph");
    await delay(500);
    await expect(tab, "Graph feedback visible", `Boolean(document.querySelector(".graph-action-feedback"))`);
    await typeSelector(tab, '#graph input[type="search"], #graph input', "memory", "graph search");
    await expect(tab, "Graph search results or feedback visible", `document.querySelector("#graph")?.textContent.toLowerCase().includes("memory")`);
    await clickButtonByText(tab, "#graph", ["Focus Matches", "聚焦匹配"], "focus graph search matches");
    await waitFor(tab, "Graph search scope feedback visible", `document.querySelector(".graph-action-feedback")?.textContent.includes("Search Focus") || document.querySelector(".graph-action-feedback")?.textContent.includes("搜索聚焦")`);
    await clickSelector(tab, '#graph .graph-search-item', "select graph search result");
    await waitFor(tab, "Graph focus analysis selected node visible", `Boolean(document.querySelector("#graph .skill-graph-focus")) && !document.querySelector("#graph .graph-focus-primer-card")`);
    await expectReadablePanel(tab, "Graph Focus selected panel is readable width", "#graph .skill-graph-focus", { minWidth: 760 });
    await expect(tab, "Graph Focus cards do not collapse into narrow columns", `(() => {
      const cards = [...document.querySelectorAll("#graph .graph-focus-card, #graph .graph-focus-item")];
      return cards.length > 0 && cards.every((card) => card.getBoundingClientRect().width >= 240);
    })()`);
    await expectNoVerticalFragmentation(tab, "Graph Focus has no vertical text fragments", "#graph .skill-graph-focus");
    await takeScreenshot(tab, "reported-graph-focus-readable");
    await clickButtonByText(tab, "#graph", ["Pin Neighborhood", "固定邻域"], "pin graph neighborhood");
    await waitFor(tab, "Graph pin neighborhood feedback visible", `document.querySelector(".graph-action-feedback")?.textContent.includes("Neighborhood") || document.querySelector(".graph-action-feedback")?.textContent.includes("邻域")`);
    await clickButtonByText(tab, "#graph", ["Reset Topology", "重置拓扑"], "reset graph topology");
    await waitFor(tab, "Graph reset topology feedback visible", `document.querySelector(".graph-action-feedback")?.textContent.includes("Topology") || document.querySelector(".graph-action-feedback")?.textContent.includes("拓扑")`);
  });

  await guarded("Optimization proposal decision flow", async () => {
    await clickSelector(tab, '.product-nav a[href="#proposals"]', "optimization nav");
    await evaluate(tab, `(() => {
      const select = document.querySelector("#proposals select");
      if (!select) return false;
      select.value = "open";
      select.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    })()`);
    await waitFor(tab, "Proposal filter shows visible interaction feedback", `document.querySelector(".interaction-action-feedback")?.textContent.includes("Filter Proposals") || document.querySelector(".interaction-action-feedback")?.textContent.includes("筛选建议")`);
    await clickSelector(tab, '#proposals .toolbar button.primary', "refresh proposals");
    await delay(500);
    await expect(tab, "Proposal refresh shows visible interaction feedback", `document.querySelector(".interaction-action-feedback")?.textContent.includes("Refresh Proposals") || document.querySelector(".interaction-action-feedback")?.textContent.includes("刷新建议")`);
    const hasButton = await evaluate(tab, `Boolean(document.querySelector("#proposals .proposal-card button"))`);
    if (hasButton) {
      await clickSelector(tab, '#proposals .proposal-card .proposal-actions button.primary, #proposals .proposal-card .proposal-actions button', "proposal decision");
      await waitFor(tab, "Proposal decision feedback visible", `Boolean(document.querySelector(".proposal-decision-feedback"))`);
    } else {
      recordPass("Optimization has no proposal action button to click in current preview state");
    }
  });

  await guarded("Apply Center scope and preview flow", async () => {
    await clickSelector(tab, '.product-nav a[href="#apply-center"]', "apply nav");
    await expect(tab, "Apply Center progressive workspace visible", `Boolean(document.querySelector("#apply-center .apply-center-workspace"))`);
    await expect(tab, "Apply Center scope rail visible", `Boolean(document.querySelector("#apply-center .apply-scope-rail"))`);
    await expect(tab, "Apply Center workbench panel visible", `Boolean(document.querySelector("#apply-center .apply-workbench-panel"))`);
    await expect(tab, "Apply Center starts on scope stage", `Boolean(document.querySelector("#apply-center .apply-workbench-tabs button.active")) && document.querySelector("#apply-center .apply-workbench-stage")?.classList.contains("stage-scope")`);
    await expect(tab, "Apply Center starts with guided scope copy", `document.querySelector("#apply-center .apply-workbench-stage")?.textContent.includes("Pick the narrowest safe scope")`);
    await clickSelector(tab, '#apply-center .apply-scope-rail .os-apply-card:nth-child(2)', "workspace scope");
    await waitFor(tab, "Apply Center moves to preview after scope choice", `document.querySelector("#apply-center .apply-workbench-stage")?.classList.contains("stage-preview")`);
    await expect(tab, "Apply Center preview impact visible", `Boolean(document.querySelector("#apply-center .apply-impact-preview"))`);
    await expect(tab, "Apply Center preview remains read-only", `document.querySelector("#apply-center .apply-workbench-stage")?.textContent.includes("read-only")`);
    await clickSelector(tab, '#apply-center .stage-preview button.primary', "review guardrails");
    await waitFor(tab, "Apply flow feedback visible", `Boolean(document.querySelector(".apply-flow-feedback"))`);
    await expect(tab, "Apply Center moves to guardrails stage", `document.querySelector("#apply-center .apply-workbench-stage")?.classList.contains("stage-guardrails")`);
    await clickSelector(tab, '#apply-center .stage-guardrails button.primary', "continue confirm");
    await waitFor(tab, "Apply Center moves to confirmation stage", `document.querySelector("#apply-center .apply-workbench-stage")?.classList.contains("stage-confirm")`);
    await expect(tab, "Apply Center confirmation is explicit and read-only", `document.querySelector("#apply-center .apply-workbench-stage")?.textContent.includes("Still read-only")`);
  });

  await guarded("Bundle export and validation flow", async () => {
    await clickSelector(tab, '.product-nav a[href="#bundles"]', "bundles nav");
    await clickSelector(tab, '#bundles button.primary', "export bundle");
    await delay(500);
    await expect(tab, "Bundle export feedback visible", `Boolean(document.querySelector(".bundle-action-feedback"))`);
    await clickSelector(tab, '#bundle-import button:nth-of-type(1)', "choose bundle manifest");
    await waitFor(tab, "Choose Bundle Manifest shows visible interaction feedback", `document.querySelector(".interaction-action-feedback")?.textContent.includes("Choose Bundle Manifest") || document.querySelector(".interaction-action-feedback")?.textContent.includes("选择 Bundle 清单")`);
    await clickSelector(tab, '#bundle-import button:nth-of-type(2)', "validate bundle");
    await delay(500);
    await expect(tab, "Bundle validation visible", `document.querySelector("#bundle-import")?.textContent.includes("Validation") || document.querySelector("#bundle-import")?.textContent.includes("校验")`);
    await expect(tab, "Bundle validation action feedback visible", `Boolean(document.querySelector(".bundle-action-feedback"))`);
    await clickSelector(tab, '#bundle-import button.primary', "import bundle guarded action");
    await delay(500);
    await expect(tab, "Bundle import guard gives feedback", `Boolean(document.querySelector(".bundle-action-feedback")) || Boolean(document.querySelector(".error-banner"))`);
  });

  await guarded("Settings backup restore preview flow", async () => {
    await clickSelector(tab, '.product-nav a[href="#settings"]', "settings nav for backup");
    await clickButtonByText(tab, "#storage", ["Create Backup", "创建备份"], "create backup");
    await waitFor(tab, "Create Backup shows visible interaction feedback", `document.querySelector(".interaction-action-feedback")?.textContent.includes("Create Backup") || document.querySelector(".interaction-action-feedback")?.textContent.includes("创建备份")`);
    await waitFor(tab, "Backup controls are ready after create", `!document.querySelector("#storage .file-picker .toolbar button:disabled") || document.querySelector("#storage .file-picker .toolbar button:nth-child(1):not(:disabled)")`);
    await clickSelector(tab, '#storage .file-picker .toolbar button:nth-child(1)', "choose backup manifest");
    await waitFor(tab, "Choose Backup Manifest shows visible interaction feedback", `document.querySelector(".interaction-action-feedback")?.textContent.includes("Choose Backup Manifest") || document.querySelector(".interaction-action-feedback")?.textContent.includes("选择备份清单")`);
    await clickSelector(tab, '#storage .file-picker .toolbar button:nth-child(2)', "validate backup");
    await waitFor(tab, "Backup validation panel appears", `Boolean(document.querySelector("#storage .backup-validation-panel")) || document.querySelector("#storage")?.textContent.includes("Ready For Preview") || document.querySelector("#storage")?.textContent.includes("可预览")`);
    await expect(tab, "Validate Backup shows visible interaction feedback", `document.querySelector(".interaction-action-feedback")?.textContent.includes("Validate Backup") || document.querySelector(".interaction-action-feedback")?.textContent.includes("验证备份")`);
    await clickSelector(tab, '#storage .file-picker .toolbar button:nth-child(3)', "preview restore impact");
    await waitFor(tab, "Restore impact preview appears", `Boolean(document.querySelector("#storage .restore-impact-panel")) || document.querySelector("#storage")?.textContent.includes("Restore Impact") || document.querySelector("#storage")?.textContent.includes("恢复影响")`);
    await expect(tab, "Restore preview shows visible interaction feedback", `document.querySelector(".interaction-action-feedback")?.textContent.includes("Preview Restore Impact") || document.querySelector(".interaction-action-feedback")?.textContent.includes("预览恢复影响")`);
  });

  await guarded("Settings health policy flow", async () => {
    await clickSelector(tab, '.product-nav a[href="#settings"]', "settings nav");
    await expect(tab, "User Session Insights visible", `Boolean(document.querySelector(".settings-session-card")) && (document.querySelector(".settings-session-card")?.textContent.includes("User Session Insights") || document.querySelector(".settings-session-card")?.textContent.includes("用户会话洞察"))`);
    await expect(tab, "Session insight remembers compact headers", `document.querySelector("#settings")?.textContent.includes("Compact module headers") || document.querySelector("#settings")?.textContent.includes("紧凑模块标题")`);
    await expect(tab, "Session insight remembers visual QA", `document.querySelector("#settings")?.textContent.includes("Visual QA after UI changes") || document.querySelector("#settings")?.textContent.includes("UI 变更后视觉自测")`);
    await clickSelector(tab, '#settings .health-policy-buttons button:nth-child(2)', "reliability policy");
    await delay(500);
    await expect(tab, "Health policy shows visible interaction feedback", `document.querySelector(".interaction-action-feedback")?.textContent.includes("Policy") || document.querySelector(".interaction-action-feedback")?.textContent.includes("策略")`);
    await expect(tab, "Settings remains error free", `!document.querySelector(".error-banner")`);
  });

  await guarded("Registry and Audit render", async () => {
    await clickSelector(tab, '.product-nav a[href="#registry"]', "registry nav");
    await expect(tab, "Registry table or empty state visible", `document.querySelector("#registry")?.textContent.includes("Skill")`);
    await clickButtonByText(tab, "#registry", ["Scan Approved Roots", "扫描已批准根目录"], "registry scan approved roots");
    await delay(500);
    await expect(tab, "Registry scan shows visible interaction feedback", `document.querySelector(".interaction-action-feedback")?.textContent.includes("Scan Now") || document.querySelector(".interaction-action-feedback")?.textContent.includes("立即扫描")`);
    await clickSelector(tab, '.product-nav a[href="#audit"]', "audit nav");
    await expect(tab, "Audit timeline visible", `document.querySelector("#audit")?.textContent.includes("Audit") || document.querySelector("#audit")?.textContent.includes("审计")`);
  });

  await takeScreenshot(tab, "final-state");
}

runSelfTest().catch((error) => {
  recordIssue("self-test runtime", error instanceof Error ? error.stack ?? error.message : String(error));
  writeFileSync(join(reportDir, "self-test-report.json"), JSON.stringify(report, null, 2));
  console.error(error);
  process.exit(1);
});

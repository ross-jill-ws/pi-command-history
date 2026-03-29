/**
 * Folder-based Command History
 *
 * Persists editor history per working directory so you can retrieve
 * previous commands across sessions. As long as you're in the same folder,
 * you can cycle through all commands ever entered there.
 *
 * Keybindings:
 *   ctrl+up   - Previous command in folder history
 *   ctrl+down - Next command in folder history
 *
 * History is stored in ~/.pi/folder-history/<path-with-dashes>.jsonl
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { existsSync, mkdirSync, readFileSync, appendFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const HISTORY_DIR = join(homedir(), ".pi", "folder-history");
const MAX_HISTORY = 500;

function getHistoryFile(cwd: string): string {
  const name = cwd.replace(/\//g, "-");
  return join(HISTORY_DIR, `${name}.jsonl`);
}

function loadHistory(cwd: string): string[] {
  const file = getHistoryFile(cwd);
  if (!existsSync(file)) return [];

  try {
    const lines = readFileSync(file, "utf-8")
      .split("\n")
      .filter((l) => l.trim());

    const entries: string[] = [];
    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        if (entry.text && entry.cwd === cwd) {
          entries.push(entry.text);
        }
      } catch {
        // skip malformed lines
      }
    }

    // Deduplicate keeping last occurrence, then trim to max
    const seen = new Map<string, number>();
    entries.forEach((text, i) => seen.set(text, i));
    const unique = [...seen.entries()]
      .sort((a, b) => a[1] - b[1])
      .map(([text]) => text);

    return unique.slice(-MAX_HISTORY);
  } catch {
    return [];
  }
}

function appendHistory(cwd: string, text: string): void {
  mkdirSync(HISTORY_DIR, { recursive: true });
  const file = getHistoryFile(cwd);
  const entry = JSON.stringify({ cwd, text, ts: Date.now() });
  appendFileSync(file, entry + "\n", "utf-8");
}

export default function (pi: ExtensionAPI) {
  let history: string[] = [];
  let historyIndex = -1; // -1 = not browsing, 0 = most recent, 1 = second most recent, etc.
  let savedEditorText = ""; // text before history browsing started
  let currentCwd = "";

  pi.on("session_start", (_event, ctx) => {
    currentCwd = ctx.cwd;
    history = loadHistory(currentCwd);
    historyIndex = -1;
    savedEditorText = "";

    ctx.ui.setStatus(
      "folder-history",
      history.length > 0
        ? `📜 ${history.length} cmds (ctrl+↑/↓)`
        : undefined
    );
  });

  // Save new commands to history file
  pi.on("input", (event, _ctx) => {
    const text = event.text?.trim();
    if (!text || !currentCwd) return;

    appendHistory(currentCwd, text);

    // Add to in-memory history (deduplicate)
    const idx = history.indexOf(text);
    if (idx !== -1) history.splice(idx, 1);
    history.push(text);
    if (history.length > MAX_HISTORY) history.shift();

    // Reset browsing state
    historyIndex = -1;
    savedEditorText = "";

    return { action: "continue" as const };
  });

  // ctrl+up: go back in history (older)
  pi.registerShortcut("ctrl+up", {
    description: "Previous command from folder history",
    handler: (ctx) => {
      if (history.length === 0) return;

      if (historyIndex === -1) {
        // Starting to browse - save current editor text
        savedEditorText = ctx.ui.getEditorText();
      }

      const nextIndex = historyIndex + 1;
      if (nextIndex >= history.length) return; // already at oldest

      historyIndex = nextIndex;
      // history is oldest-first, so most recent is at the end
      ctx.ui.setEditorText(history[history.length - 1 - historyIndex]);
    },
  });

  // ctrl+down: go forward in history (newer)
  pi.registerShortcut("ctrl+down", {
    description: "Next command from folder history",
    handler: (ctx) => {
      if (historyIndex <= -1) return; // not browsing

      historyIndex--;

      if (historyIndex === -1) {
        // Back to current text
        ctx.ui.setEditorText(savedEditorText);
      } else {
        ctx.ui.setEditorText(history[history.length - 1 - historyIndex]);
      }
    },
  });
}

/**
 * evaluator.js — Smart Unix Path & Command Evaluator + Folder Tree Renderer
 * Runs 100% client-side in the browser for GitHub Pages (omerfarukbay.com/fununix/)
 */

export function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function formatInlineMd(text) {
  let s = escapeHtml(text);
  s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  return s;
}

export function normalizePosixPath(p) {
  const parts = String(p || "").split("/");
  const stack = [];
  for (const seg of parts) {
    if (!seg || seg === ".") continue;
    if (seg === "..") stack.pop();
    else stack.push(seg);
  }
  return "/" + stack.join("/");
}

export function resolveUnixPath(cwd, home, rawPath) {
  let p = String(rawPath || "").trim().replace(/^["']|["']$/g, "");
  if (p === "~" || p === "~/") return home;
  if (p.startsWith("~/")) {
    p = home + "/" + p.slice(2);
  } else if (!p.startsWith("/")) {
    p = cwd.replace(/\/+$/, "") + "/" + p;
  }
  return normalizePosixPath(p);
}

export function pathExistsInTree(tree, normPath) {
  if (!tree || !normPath) return false;
  if (Object.prototype.hasOwnProperty.call(tree, normPath)) return true;
  const idx = normPath.lastIndexOf("/");
  const parent = idx <= 0 ? "/" : normPath.slice(0, idx);
  const base = normPath.slice(idx + 1);
  if (Object.prototype.hasOwnProperty.call(tree, parent) && Array.isArray(tree[parent])) {
    return tree[parent].includes(base);
  }
  return false;
}

export function evaluateCommand(q, rawCmd) {
  let cmd = String(rawCmd || "").trim().replace(/\s+/g, " ");
  if (!cmd) {
    return {
      correct: false,
      feedback: "Please type a Unix command before submitting.",
      resolved_path: null,
    };
  }

  // Strip leading '$ ' if a student typed the prompt symbol
  if (cmd.startsWith("$")) {
    cmd = cmd.slice(1).trim();
  }

  const cwd = q.cwd;
  const home = q.home;
  const target = q.target;
  const tree = q.tree || {};
  const constraint = q.constraint || "any";
  const cmdType = q.cmd_type || "exact";

  // 1. Direct match against accepted_cmds
  const normalizedAccepted = (q.accepted_cmds || []).map((a) => String(a).trim().replace(/\s+/g, " "));
  if (normalizedAccepted.includes(cmd)) {
    return {
      correct: true,
      feedback: `✅ Correct! ${q.explanation}`,
      resolved_path: target,
    };
  }

  const parts = cmd.split(" ");
  const firstWord = parts[0];
  const knownCmds = new Set(["pwd", "ls", "cd", "cat", "mkdir", "touch", "cp", "mv", "rm", "grep", "sort", "wc", "head", "tail"]);

  if (knownCmds.has(firstWord.toLowerCase()) && firstWord !== firstWord.toLowerCase()) {
    return {
      correct: false,
      feedback: `❌ Unix is case sensitive! Write \`${firstWord.toLowerCase()}\` in lowercase instead of \`${firstWord}\`.`,
      resolved_path: null,
    };
  }

  // 2. Smart evaluation for 'cd' missions
  if (cmdType === "cd") {
    if (firstWord !== "cd") {
      return {
        correct: false,
        feedback: `❌ This mission asks you to **move** into a folder using \`cd\` (you typed \`${firstWord}\`).`,
        resolved_path: null,
      };
    }
    const arg = parts.length > 1 ? parts[1] : "~";
    if (parts.length > 2) {
      return {
        correct: false,
        feedback: "❌ `cd` takes only ONE path argument (do not put spaces inside a path).",
        resolved_path: null,
      };
    }

    const resolved = resolveUnixPath(cwd, home, arg);
    if (resolved === target) {
      if (constraint === "relative" && (arg.startsWith("/") || arg.startsWith("~"))) {
        return {
          correct: false,
          feedback: `⚠️ \`${cmd}\` reaches \`${target}\`, great! However, this mission asks for a **relative path** (starting from \`${cwd}\` without \`/\` or \`~\` at the start). Try \`${q.expected_cmd}\`!`,
          resolved_path: resolved,
        };
      }
      if (constraint === "tilde" && !arg.startsWith("~")) {
        return {
          correct: false,
          feedback: `⚠️ \`${cmd}\` reaches \`${target}\`, but this mission specifically asks you to start with your home shortcut **\`~\`**. Try \`${q.expected_cmd}\`!`,
          resolved_path: resolved,
        };
      }
      if (constraint === "root_abs" && !arg.startsWith("/")) {
        return {
          correct: false,
          feedback: `⚠️ \`${cmd}\` reaches \`${target}\`, but this mission asks for the **full absolute path starting with \`/\`**. Try \`${q.expected_cmd}\`!`,
          resolved_path: resolved,
        };
      }
      return {
        correct: true,
        feedback: `✅ Correct! \`${cmd}\` moves you to \`${target}\`. ${q.explanation}`,
        resolved_path: resolved,
      };
    } else {
      const exists = pathExistsInTree(tree, resolved);
      if (!exists) {
        if (arg.startsWith("/") && !arg.startsWith("/Users")) {
          return {
            correct: false,
            feedback: `❌ \`No such file or directory: ${arg}\`. Starting with \`/\` means the very top **Root** directory! Your command looked for \`${resolved}\`.`,
            resolved_path: resolved,
          };
        }
        return {
          correct: false,
          feedback: `❌ \`No such file or directory: ${arg}\`. Because you are standing in \`${cwd}\`, your command looked for \`${resolved}\`, which does not exist on the map! Hint: ${q.hint}`,
          resolved_path: resolved,
        };
      } else {
        return {
          correct: false,
          feedback: `📍 \`${cmd}\` moves you to \`${resolved}\`, but the target is \`${target}\`! Hint: ${q.hint}`,
          resolved_path: resolved,
        };
      }
    }
  }

  // 3. Smart evaluation for single-argument file/folder commands (ls, cat, touch)
  if (cmdType === "arg_path") {
    const expectedName = q.cmd_name || "";
    const targetPath = q.target_path || target;
    if (firstWord === "cd") {
      return {
        correct: false,
        feedback: `❌ Do **not** use \`cd\` in this mission! Keep your feet in \`${cwd}\` and use \`${expectedName}\` with a path.`,
        resolved_path: null,
      };
    }
    if (firstWord !== expectedName) {
      return {
        correct: false,
        feedback: `❌ Use the \`${expectedName}\` command for this mission (you typed \`${firstWord}\`).`,
        resolved_path: null,
      };
    }
    if (parts.length < 2) {
      return {
        correct: false,
        feedback: `❌ Give \`${expectedName}\` the path to the target item as an argument.`,
        resolved_path: null,
      };
    }
    const arg = parts[parts.length - 1];
    const resolved = resolveUnixPath(cwd, home, arg);
    if (resolved === targetPath) {
      if (constraint === "relative" && (arg.startsWith("/") || arg.startsWith("~"))) {
        return {
          correct: false,
          feedback: `⚠️ \`${cmd}\` works, but this mission asks for a **relative path** (without \`/\` or \`~\` at the start). Try \`${q.expected_cmd}\`!`,
          resolved_path: resolved,
        };
      }
      return {
        correct: true,
        feedback: `✅ Correct! ${q.explanation}`,
        resolved_path: resolved,
      };
    } else {
      return {
        correct: false,
        feedback: `❌ Because you are standing in \`${cwd}\`, \`${arg}\` points to \`${resolved}\` instead of \`${targetPath}\`! Hint: ${q.hint}`,
        resolved_path: resolved,
      };
    }
  }

  // 4. Helpful diagnostics for grep
  if (String(q.expected_cmd || "").includes("grep") && firstWord === "grep") {
    const lastClean = parts[parts.length - 1].replace(/^["']|["']$/g, "");
    if (parts.length >= 3 && ["exam", "lab", "^URGENT", "error"].includes(lastClean)) {
      return {
        correct: false,
        feedback: "❌ You swapped the word and the file! In `grep`, always put `grep -options \"WORD\" FILE_PATH` (word first, file path second).",
        resolved_path: null,
      };
    }
  }

  return {
    correct: false,
    feedback: `❌ Not quite right. Remember you are standing in \`${cwd}\`. Hint: ${q.hint}`,
    resolved_path: null,
  };
}

export function renderFolderTree(tree, cwd, home, target, triedPath) {
  if (!tree) return "";
  const roots = Object.keys(tree).sort((a, b) => a.length - b.length);
  if (roots.length === 0) return "";
  const topRoot = roots[0];

  const lines = [];

  function badgeFor(fullPath) {
    const badges = [];
    if (fullPath === cwd) {
      badges.push('<span class="tree-node-cwd">📍 YOU ARE HERE (pwd)</span>');
    }
    if (target && fullPath === target) {
      badges.push('<span class="tree-node-target">🎯 TARGET</span>');
    }
    if (triedPath && fullPath === triedPath && triedPath !== target) {
      badges.push('<span class="tree-node-tried">❌ YOUR COMMAND LANDED HERE</span>');
    }
    return badges.length ? "  " + badges.join(" ") : "";
  }

  const homeHint = topRoot === home ? " (~)" : "";
  lines.push(`📁 <strong>${escapeHtml(topRoot)}</strong>${homeHint}${badgeFor(topRoot)}`);

  function walk(dirPath, prefix) {
    const children = tree[dirPath] || [];
    children.forEach((name, idx) => {
      const isLast = idx === children.length - 1;
      const branch = isLast ? "└── " : "├── ";
      const childFull = dirPath.replace(/\/$/, "") + "/" + name;
      const isDir = Object.prototype.hasOwnProperty.call(tree, childFull);
      const icon = isDir ? "📁" : name.startsWith(".") ? "🕵️" : "📄";
      const label = isDir ? `<strong>${escapeHtml(name)}/</strong>` : escapeHtml(name);
      lines.push(`${prefix}${branch}${icon} ${label}${badgeFor(childFull)}`);
      if (isDir) {
        const nextPrefix = prefix + (isLast ? "    " : "│   ");
        walk(childFull, nextPrefix);
      }
    });
  }

  walk(topRoot, "");
  return lines.join("\n");
}

export const CONSTRAINT_LABELS = {
  relative: "🔀 Relative Path Required (no / or ~ at start)",
  tilde: "🏠 Home Shortcut (~) Required",
  root_abs: "🌳 Full Root Path (/) Required",
  no_cd: "✋ Stay in Current Folder (Do NOT use cd)",
  any: "⚡ Any Valid Command",
};


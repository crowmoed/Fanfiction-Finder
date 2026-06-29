#!/usr/bin/env node
/**
 * next.cjs — cross-platform wrapper that runs the Next CLI with the Node 24
 * readlink shim preloaded (see node24-readlink-shim.cjs). Avoids needing
 * cross-env to set NODE_OPTIONS on Windows/PowerShell.
 *
 * Usage (via package.json): node scripts/next.cjs <build|start|dev> [...args]
 */
"use strict";

const path = require("path");
const { spawn } = require("child_process");

const shim = path.join(__dirname, "node24-readlink-shim.cjs");
const nextBin = require.resolve("next/dist/bin/next");

const nodeOptions = [process.env.NODE_OPTIONS, `--require ${shim}`]
  .filter(Boolean)
  .join(" ");

const child = spawn(process.execPath, [nextBin, ...process.argv.slice(2)], {
  stdio: "inherit",
  env: { ...process.env, NODE_OPTIONS: nodeOptions },
});

child.on("exit", (code) => process.exit(code ?? 0));

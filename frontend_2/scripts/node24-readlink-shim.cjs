/**
 * node24-readlink-shim.cjs — Windows + Node 24 build fix.
 *
 * On Node 24 (Windows), fs.readlink* on a *regular file* throws EISDIR. Older
 * Node threw EINVAL, which webpack / Next's module resolver (and styled-jsx)
 * catch as "not a symlink → use the real path." With EISDIR uncaught, the
 * production build aborts:
 *
 *   Error: EISDIR: illegal operation on a directory, readlink '.../index.js'
 *
 * This shim restores the pre-Node-24 contract by remapping EISDIR → EINVAL for
 * readlink only. It is scoped to readlink and changes nothing else. Loaded via
 * NODE_OPTIONS=--require in the build/start scripts; it is a no-op on platforms
 * where the bug isn't present.
 *
 * Remove this once Node ships a fix or the project moves to a Node version
 * without the regression. See package.json "build"/"start" scripts.
 */
"use strict";

const fs = require("fs");

function remap(err) {
  if (err && err.code === "EISDIR" && err.syscall === "readlink") {
    err.code = "EINVAL";
    err.errno = -22;
  }
  return err;
}

for (const name of ["readlinkSync", "readlink"]) {
  const orig = fs[name];
  if (typeof orig !== "function") continue;
  fs[name] = function patched(...args) {
    if (name === "readlinkSync") {
      try {
        return orig.apply(this, args);
      } catch (err) {
        throw remap(err);
      }
    }
    // async (callback) form
    const cb = args[args.length - 1];
    if (typeof cb === "function") {
      args[args.length - 1] = (err, ...rest) =>
        cb(err ? remap(err) : err, ...rest);
    }
    return orig.apply(this, args);
  };
}

if (fs.promises && typeof fs.promises.readlink === "function") {
  const origP = fs.promises.readlink;
  fs.promises.readlink = function patched(...args) {
    return origP.apply(this, args).catch((err) => {
      throw remap(err);
    });
  };
}

// Polyfills for JS features newer than some WebViews the app runs in.
//
// Tauri uses the OS's system WebView, so the available JS depends on the user's
// OS version, not the build machine. pdf.js v6 uses the TC39 "Map.prototype.
// getOrInsert" proposal methods (`getOrInsert` / `getOrInsertComputed`), which
// only exist on very recent engines (Safari/WebKit ~18.4+). On older macOS the
// method is missing and PDF rendering throws
// "getOrInsertComputed is not a function". Define them if absent.
//
// Imported first in `main.tsx` so it runs before pdf.js loads.

type Ctor = { prototype: { getOrInsert?: unknown; getOrInsertComputed?: unknown } };

function install(ctor: Ctor | undefined) {
  if (!ctor) return;
  const proto = ctor.prototype as {
    has(key: unknown): boolean;
    get(key: unknown): unknown;
    set(key: unknown, value: unknown): unknown;
    getOrInsert?: unknown;
    getOrInsertComputed?: unknown;
  };
  if (typeof proto.getOrInsert !== "function") {
    Object.defineProperty(proto, "getOrInsert", {
      value: function (key: unknown, value: unknown) {
        if (this.has(key)) return this.get(key);
        this.set(key, value);
        return value;
      },
      writable: true,
      configurable: true,
    });
  }
  if (typeof proto.getOrInsertComputed !== "function") {
    Object.defineProperty(proto, "getOrInsertComputed", {
      value: function (key: unknown, callbackFn: (key: unknown) => unknown) {
        if (this.has(key)) return this.get(key);
        const value = callbackFn(key);
        this.set(key, value);
        return value;
      },
      writable: true,
      configurable: true,
    });
  }
}

install(typeof Map !== "undefined" ? (Map as unknown as Ctor) : undefined);
install(typeof WeakMap !== "undefined" ? (WeakMap as unknown as Ctor) : undefined);

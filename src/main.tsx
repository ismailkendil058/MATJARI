import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./mobile/mobile.css";
import { initDb } from "./lib/db.ts";

function isTauriApp() {
  return typeof window !== "undefined"
    && "__TAURI_INTERNALS__" in window
    && typeof (window as typeof window & { __TAURI_INTERNALS__?: { invoke?: unknown } }).__TAURI_INTERNALS__?.invoke === "function";
}

if (isTauriApp() && "serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(registration => {
      registration.unregister().catch(error => {
        console.error("Service worker unregister failed:", error);
      });
    });
  });

  if ("caches" in window) {
    caches.keys().then(keys => {
      keys.forEach(key => {
        caches.delete(key).catch(error => {
          console.error("Cache delete failed:", error);
        });
      });
    });
  }
}

createRoot(document.getElementById("root")!).render(<App />);

initDb().catch(err => {
  console.error("Critical error during DB initialization:", err);
});

if (!isTauriApp() && "serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(error => {
      console.error("Service worker registration failed:", error);
    });
  });
}

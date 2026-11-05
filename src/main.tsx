import { createRoot } from "react-dom/client";
import { StoreProvider } from "./lib/store";
import { App } from "./App";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StoreProvider>
    <App />
  </StoreProvider>,
);

if ("serviceWorker" in navigator && location.protocol === "https:") {
  window.addEventListener("load", () => { navigator.serviceWorker.register("./sw.js").catch(() => {}); });
}

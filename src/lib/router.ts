// Tiny hash router: "#/tree/abc" -> { name: "tree", id: "abc" }. Hash URLs work on GitHub Pages
// and inside the installed app without any server setup.
import { useEffect, useState } from "react";

export type RouteName = "home" | "tree" | "add" | "build" | "quests" | "calendar" | "settings" | "welcome";
export interface Route { name: RouteName; id?: string; query: URLSearchParams }

const NAMES: RouteName[] = ["home", "tree", "add", "build", "quests", "calendar", "settings", "welcome"];

export function parseHash(hash: string): Route {
  const [path, qs = ""] = hash.replace(/^#\/?/, "").split("?");
  const [name, id] = path.split("/");
  const n = (NAMES.includes(name as RouteName) ? name : "home") as RouteName;
  return { name: n, id: id ? decodeURIComponent(id) : undefined, query: new URLSearchParams(qs) };
}

export const navigate = (path: string) => {
  const target = `#${path.startsWith("/") ? path : `/${path}`}`;
  if (window.location.hash !== target) window.location.hash = target;
  window.scrollTo({ top: 0 });
};

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseHash(window.location.hash));
  useEffect(() => {
    const on = () => setRoute(parseHash(window.location.hash));
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return route;
}

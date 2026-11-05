import { useEffect } from "react";
import { useRoute, navigate, parseHash } from "./lib/router";
import { useStore } from "./lib/store";
import { progressCount } from "./lib/state";
import { Dialog, LevelUp, TabBar, Toast } from "./components/ui";
import { Home } from "./screens/Home";
import { TreeScreen } from "./screens/TreeScreen";
import { AddTree } from "./screens/AddTree";
import { Builder } from "./screens/Builder";
import { SideQuests } from "./screens/SideQuests";
import { Calendar } from "./screens/Calendar";
import { Settings } from "./screens/Settings";
import { Welcome } from "./screens/Welcome";

export function App() {
  const route = useRoute();
  const { state } = useStore();
  const onboarding = !state.profile.onboarded;

  // New players go through the welcome flow first (the goal builder is part of it).
  // Read the live hash: a screen may have just navigated in the same tick as a state change.
  useEffect(() => {
    const live = parseHash(window.location.hash).name;
    if (onboarding && live !== "welcome" && live !== "build") navigate("/welcome");
    if (!onboarding && live === "welcome") navigate("/");
  }, [onboarding, route.name]);

  let screen;
  switch (route.name) {
    case "welcome": screen = <Welcome />; break;
    case "tree": screen = <TreeScreen id={route.id ?? ""} first={route.query.get("first") === "1"} />; break;
    case "add": screen = <AddTree />; break;
    case "build": screen = <Builder />; break;
    case "quests": screen = <SideQuests />; break;
    case "calendar": screen = <Calendar />; break;
    case "settings": screen = <Settings />; break;
    default: screen = <Home />;
  }

  const showTabs = !onboarding && route.name !== "welcome";
  return (
    <>
      <main className={`app ${showTabs ? "with-tabs" : ""}`}>{screen}</main>
      {showTabs && <TabBar current={route.name} />}
      <ConflictDialog />
      <LevelUp />
      <Toast />
    </>
  );
}

/** Asked once, the first time a device with progress signs in to an account that has progress too. */
function ConflictDialog() {
  const { conflict, resolveConflict, state } = useStore();
  if (!conflict) return null;
  const r = conflict.remote;
  return (
    <Dialog title="Which progress should we keep?" onClose={() => resolveConflict("account")}>
      <p>This device has progress that isn't in your account yet. Pick one to keep. The other will be replaced.</p>
      <div className="stack">
        <button type="button" className="choice" onClick={() => resolveConflict("account")}>
          <b>Your account</b>
          <span>{r.trees.length} tree{r.trees.length === 1 ? "" : "s"} · {progressCount(r)} completed</span>
        </button>
        <button type="button" className="choice" onClick={() => resolveConflict("device")}>
          <b>This device</b>
          <span>{state.trees.length} tree{state.trees.length === 1 ? "" : "s"} · {progressCount(state)} completed</span>
        </button>
      </div>
    </Dialog>
  );
}

import type { Role } from "./types";

export function parseRoute(hash: string) {
  const [profile, view = "home", id = ""] = hash.replace(/^#\/?/, "").split("/");
  if (view === "agent" || view === "call") {
    return { role: "senior" as Role, view: "home", id: "", canonicalHash: "#senior/home" };
  }
  return {
    role: profile === "intern" ? "intern" as Role : "senior" as Role,
    view: view || "home",
    id,
    canonicalHash: "",
  };
}

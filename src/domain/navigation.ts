import type { Role } from "./types";

export function parseRoute(hash: string) {
  const [profile, view = "home", id = ""] = hash.replace(/^#\/?/, "").split("/");
  const role: Role = profile === "intern" ? "intern" : "senior";
  if (view === "agent" || view === "call") {
    return { role, view: "home", id: "", canonicalHash: "#" + role + "/home" };
  }
  return {
    role,
    view: view || "home",
    id,
    canonicalHash: "",
  };
}

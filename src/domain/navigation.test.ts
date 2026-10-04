import { describe, expect, it } from "vitest";
import { parseRoute } from "./navigation";

describe("navigation to the personal agent space", () => {
  it.each([["#senior/agent", "senior"], ["#intern/agent", "intern"],
    ["#senior/call", "senior"], ["#/intern/call/old-room", "intern"]])(
    "redirects the retired route %s to its own profile without opening a room",
    (hash, role) => {
      expect(parseRoute(hash)).toEqual({ role, view: "home", id: "", canonicalHash: "#" + role + "/home" });
    },
  );

  it("keeps direct process links and the intern's library intact", () => {
    expect(parseRoute("#senior/processes/conv_123")).toMatchObject({ role: "senior", view: "processes", id: "conv_123" });
    expect(parseRoute("#intern/library")).toMatchObject({ role: "intern", view: "library", id: "" });
    expect(parseRoute("")).toMatchObject({ role: "senior", view: "home" });
  });
});

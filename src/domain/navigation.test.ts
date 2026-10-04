import { describe, expect, it } from "vitest";
import { parseRoute } from "./navigation";

describe("navigation to the personal agent space", () => {
  it.each(["#senior/agent", "#intern/agent", "#senior/call", "#/intern/call/old-room"])(
    "redirects the retired route %s to Mi espacio without opening a room",
    (hash) => {
      expect(parseRoute(hash)).toEqual({ role: "senior", view: "home", id: "", canonicalHash: "#senior/home" });
    },
  );

  it("keeps direct process links and the intern's library intact", () => {
    expect(parseRoute("#senior/processes/conv_123")).toMatchObject({ role: "senior", view: "processes", id: "conv_123" });
    expect(parseRoute("#intern/library")).toMatchObject({ role: "intern", view: "library", id: "" });
    expect(parseRoute("")).toMatchObject({ role: "senior", view: "home" });
  });
});

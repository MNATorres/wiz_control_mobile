import { describe, expect, it } from "vitest";
import { getPilotMessage, setPilotMessage } from "./protocol";

describe("getPilotMessage", () => {
  it("builds a getPilot message with empty params", () => {
    expect(getPilotMessage()).toEqual({ method: "getPilot", params: {} });
  });
});

describe("setPilotMessage", () => {
  it("builds a setPilot message carrying the given params", () => {
    expect(setPilotMessage({ state: true, dimming: 50 })).toEqual({
      method: "setPilot",
      params: { state: true, dimming: 50 },
    });
  });

  it("passes RGB, temperature and scene params through untouched", () => {
    const params = { r: 255, g: 0, b: 0, temp: 2700, sceneId: 4, speed: 100 };
    expect(setPilotMessage(params).params).toEqual(params);
  });
});

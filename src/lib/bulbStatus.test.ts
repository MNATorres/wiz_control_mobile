import { describe, expect, it } from "vitest";
import { shouldShowErrorMessage } from "./bulbStatus";

describe("shouldShowErrorMessage", () => {
  it("hides the message when the bulb is offline (pilot null), even with an error", () => {
    expect(shouldShowErrorMessage(null, "timed out")).toBe(false);
  });

  it("hides the message when the bulb is offline and there is no error", () => {
    expect(shouldShowErrorMessage(null, null)).toBe(false);
  });

  it("shows the message when the bulb is reachable and an error occurred", () => {
    expect(shouldShowErrorMessage({}, "setState failed")).toBe(true);
  });

  it("hides the message when the bulb is reachable and there is no error", () => {
    expect(shouldShowErrorMessage({}, null)).toBe(false);
  });
});

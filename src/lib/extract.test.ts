import { describe, expect, it } from "vitest";
import { extractFromMessage } from "./extract";

describe("extractFromMessage (phone only)", () => {
  it.each([
    ["Call me at 555-777-1234 thanks", "555-777-1234"],
    ["number is (555) 201-4410", "(555) 201-4410"],
    ["ring 555.415.7720 after 2pm", "555.415.7720"],
    ["+1 555 774 0193 is my cell", "+1 555 774 0193"],
    ["5557771234", "5557771234"],
  ])("finds the phone number in %j", (message, phone) => {
    expect(extractFromMessage(message).phone).toBe(phone);
  });

  it("returns null when there's no phone number", () => {
    expect(extractFromMessage("Our walk-in freezer stopped working, can someone come tomorrow?").phone).toBeNull();
  });

  it("doesn't mistake part of a longer number for a phone", () => {
    expect(extractFromMessage("Order 123456789012345 is late").phone).toBeNull();
  });
});

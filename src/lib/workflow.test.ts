import { describe, expect, it } from "vitest";
import { ACTIVE_STATUSES } from "./types";
import { DEFAULT_NEXT_ACTION, OUTCOMES, outcomesFor } from "./workflow";

describe("What happened? options", () => {
  it("offers every active status at least one real answer, plus snooze and 'something else'", () => {
    for (const status of ACTIVE_STATUSES) {
      const keys = outcomesFor(status).map((o) => o.key);
      expect(keys.length).toBeGreaterThan(2);
      expect(keys.slice(-2)).toEqual(["snoozed", "other"]);
    }
  });

  it("offers nothing for closed jobs (they're reopened instead)", () => {
    expect(outcomesFor("done")).toEqual([]);
    expect(outcomesFor("lost")).toEqual([]);
  });

  it("matches the brief: approved moves forward, declined closes as lost", () => {
    const answers = outcomesFor("waiting_on_customer");
    expect(answers.find((o) => o.key === "customer_approved")?.toStatus).toBe("needs_scheduling");
    expect(answers.find((o) => o.key === "customer_declined")?.toStatus).toBe("lost");
  });

  it("uses status-specific wording", () => {
    expect(outcomesFor("scheduled").find((o) => o.key === "customer_declined")?.label).toBe("Customer cancelled");
  });

  it("gives every answer that keeps a job open a next step", () => {
    for (const o of Object.values(OUTCOMES)) {
      const staysOpen = o.toStatus !== "done" && o.toStatus !== "lost";
      const hasNextStep = Boolean(o.nextAction) || o.toStatus === null || DEFAULT_NEXT_ACTION[o.toStatus] !== null;
      if (staysOpen) expect(hasNextStep, o.key).toBe(true);
    }
  });

  it("requires a visit time when a visit is booked", () => {
    expect(OUTCOMES.job_scheduled.schedule).toBe("required");
  });
});

import { describe, expect, it } from "vitest";
import { effectivePermissionsFor, inviteTeamMember, getTeamMember } from "../team/store";
import { ConflictError, ValidationError } from "../shared/errors";
import { completeStep, startOffboarding, startOnboarding } from "./store";

let counter = 0;
function newHire() {
  counter += 1;
  return inviteTeamMember({ name: `Test Hire ${counter}`, email: `hire${counter}@example.com`, role: "sales_manager" }, "sandbox-executive");
}

describe("onboarding", () => {
  it("a fresh hire starts in onboarding with a narrow, role-independent permission set", () => {
    const hire = newHire();
    expect(hire.status).toBe("onboarding");
    expect(effectivePermissionsFor(hire)).toEqual(["onboarding.view", "attendance.view"]);
  });

  it("completing every required step activates the account with its real role permissions", () => {
    const hire = newHire();
    const onboardingCase = startOnboarding(hire.id, "sandbox-hr", "Ngozi Adeyemi");
    const requiredSteps = onboardingCase.steps.filter((step) => step.required);

    for (const step of requiredSteps.slice(0, -1)) {
      const updated = completeStep(onboardingCase.id, step.id, "sandbox-hr", "Ngozi Adeyemi");
      expect(updated.status).toBe("in_progress");
      expect(getTeamMember(hire.id).status).toBe("onboarding");
    }

    const last = requiredSteps[requiredSteps.length - 1];
    const finished = completeStep(onboardingCase.id, last.id, "sandbox-hr", "Ngozi Adeyemi");
    expect(finished.status).toBe("completed");

    const activated = getTeamMember(hire.id);
    expect(activated.status).toBe("active");
    expect(effectivePermissionsFor(activated).length).toBeGreaterThan(2);
  });

  it("an optional step being left undone doesn't block completion", () => {
    const hire = newHire();
    const onboardingCase = startOnboarding(hire.id, "sandbox-hr", "Ngozi Adeyemi");
    const optionalStep = onboardingCase.steps.find((step) => !step.required);
    const requiredSteps = onboardingCase.steps.filter((step) => step.required);

    let finalCase = onboardingCase;
    for (const step of requiredSteps) {
      finalCase = completeStep(onboardingCase.id, step.id, "sandbox-hr", "Ngozi Adeyemi");
    }

    expect(finalCase.status).toBe("completed");
    if (optionalStep) expect(finalCase.steps.find((s) => s.id === optionalStep.id)?.completedAt).toBeNull();
  });

  it("refuses a second onboarding case while one is already open", () => {
    const hire = newHire();
    startOnboarding(hire.id, "sandbox-hr", "Ngozi Adeyemi");
    expect(() => startOnboarding(hire.id, "sandbox-hr", "Ngozi Adeyemi")).toThrow(ConflictError);
  });
});

describe("offboarding", () => {
  it("revokes access immediately -- before a single checklist step is touched", () => {
    const hire = newHire();
    const onboardingCase = startOnboarding(hire.id, "sandbox-hr", "Ngozi Adeyemi");
    for (const step of onboardingCase.steps.filter((s) => s.required)) {
      completeStep(onboardingCase.id, step.id, "sandbox-hr", "Ngozi Adeyemi");
    }
    expect(getTeamMember(hire.id).status).toBe("active");

    const offboardingCase = startOffboarding(hire.id, "Resigned", "sandbox-hr", "Ngozi Adeyemi");
    const locked = getTeamMember(hire.id);
    expect(locked.status).toBe("offboarding");
    expect(effectivePermissionsFor(locked)).toEqual([]);

    const accessStep = offboardingCase.steps.find((step) => step.category === "access");
    expect(accessStep?.completedAt).not.toBeNull();
  });

  it("requires a reason", () => {
    const hire = newHire();
    expect(() => startOffboarding(hire.id, "   ", "sandbox-hr", "Ngozi Adeyemi")).toThrow(ValidationError);
  });

  it("completing the remaining steps terminates the account", () => {
    const hire = newHire();
    const offboardingCase = startOffboarding(hire.id, "Resigned", "sandbox-hr", "Ngozi Adeyemi");

    let finalCase = offboardingCase;
    for (const step of offboardingCase.steps.filter((s) => s.required && !s.completedAt)) {
      finalCase = completeStep(offboardingCase.id, step.id, "sandbox-hr", "Ngozi Adeyemi");
    }

    expect(finalCase.status).toBe("completed");
    const departed = getTeamMember(hire.id);
    expect(departed.status).toBe("terminated");
    expect(effectivePermissionsFor(departed)).toEqual([]);
  });
});

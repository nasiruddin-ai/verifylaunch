import { describe, expect, it } from "vitest";
import { extractWorkDomain, hashPassword, verifyPassword } from "../auth";

describe("password and identity helpers", () => {
  it("hashes passwords with unique salts and verifies correctly", () => {
    const h1 = hashPassword("correct-horse-battery");
    const h2 = hashPassword("correct-horse-battery");

    expect(h1).not.toBe(h2);
    expect(h1.startsWith("scrypt$")).toBe(true);
    expect(verifyPassword("correct-horse-battery", h1)).toBe(true);
    expect(verifyPassword("wrong-password", h1)).toBe(false);
    expect(verifyPassword("correct-horse-battery", "malformed")).toBe(false);
  });

  it("distinguishes corporate work domains from free email providers", () => {
    expect(extractWorkDomain("founder@acme-ops.io")).toBe("acme-ops.io");
    expect(extractWorkDomain("nasiruddinniad@gmail.com")).toBeNull();
    expect(extractWorkDomain("user@outlook.com")).toBeNull();
  });
});

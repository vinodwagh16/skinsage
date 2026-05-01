import { hashPassword, verifyPassword, generateJwt, verifyJwt } from "../src/services/auth";

describe("auth service", () => {
  it("hashes and verifies a password", async () => {
    const hash = await hashPassword("secret123");
    expect(await verifyPassword("secret123", hash)).toBe(true);
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });

  it("generates and verifies a JWT", () => {
    const token = generateJwt({ userId: "abc-123" });
    const payload = verifyJwt(token);
    expect(payload.userId).toBe("abc-123");
  });

  it("throws on invalid JWT", () => {
    expect(() => verifyJwt("bad.token.here")).toThrow();
  });
});

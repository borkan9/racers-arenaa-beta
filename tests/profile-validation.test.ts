import test from "node:test";
import assert from "node:assert/strict";
import { UpdateProfileSchema } from "../lib/validators/user.schema.ts";

test("profile username is normalized to lowercase", () => {
  const parsed = UpdateProfileSchema.parse({ username: "BORKAN_7" });
  assert.equal(parsed.username, "borkan_7");
});

test("profile username rejects unsupported characters", () => {
  const parsed = UpdateProfileSchema.safeParse({ username: "bad name!" });
  assert.equal(parsed.success, false);
});

test("profile bio is trimmed and length-limited", () => {
  const parsed = UpdateProfileSchema.parse({ bio: "  fast racer  " });
  assert.equal(parsed.bio, "fast racer");

  const tooLong = UpdateProfileSchema.safeParse({ bio: "x".repeat(161) });
  assert.equal(tooLong.success, false);
});

test("profile avatar must be a valid URL", () => {
  assert.equal(UpdateProfileSchema.safeParse({ avatar: "not-a-url" }).success, false);
  assert.equal(UpdateProfileSchema.safeParse({ avatar: "https://example.com/avatar.png" }).success, true);
});

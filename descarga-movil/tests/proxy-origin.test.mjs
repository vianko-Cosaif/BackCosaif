import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { canonicalRequest } from "../lib/environment.ts";
import { requireSameOrigin, sessionCookie, sessionToken } from "../lib/auth.ts";

test("nginx requests use the configured HTTPS origin for CSRF and encrypted cookies", async () => {
  const origin = "https://cosaif-download.vianko.cloud";
  const internal = new Request("http://127.0.0.1:3016/api/auth/login", {
    method: "POST", headers: { origin, "x-cosaif-request": "1" }, body: "fixture",
  });
  const publicRequest = canonicalRequest(internal, origin);
  assert.equal(publicRequest.url, origin + "/api/auth/login");
  requireSameOrigin(publicRequest);
  assert.equal(await publicRequest.text(), "fixture");
  const environment = { SESSION_SECRET: randomBytes(32).toString("base64url") };
  const cookie = sessionCookie(publicRequest, "fixture-session", environment);
  assert.match(cookie, /^__Host-cosaif-download=/);
  assert.match(cookie, /; Secure/);
  const session = canonicalRequest(new Request("http://127.0.0.1:3016/api/auth/session", { headers: { cookie: cookie.split(";")[0] } }), origin);
  assert.equal(sessionToken(session, environment), "fixture-session");
  const attacker = canonicalRequest(new Request("http://127.0.0.1:3016/api/auth/login", { method: "POST", headers: { origin: "https://elsewhere.example", "x-cosaif-request": "1" } }), origin);
  assert.throws(() => requireSameOrigin(attacker), { status: 403 });
});

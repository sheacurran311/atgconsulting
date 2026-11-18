import test from "node:test";
import assert from "node:assert/strict";
import { parseConnections, classifyError, explainInitializationError, runConnectorProbe } from "./connectorProbe";

test("connection enumeration understands Replit SDK response wrappers", () => {
  assert.deepEqual(parseConnections({ connections: [{ id: "a", connector_name: "gmail" }] }), [{ id: "a", connector_name: "gmail" }]);
  assert.deepEqual(parseConnections({ data: { items: [{ id: "b", connectorName: "google-sheet" }] } }), [{ id: "b", connector_name: "google-sheet" }]);
  assert.deepEqual(parseConnections({ data: { items: [{ id: 3, connectorName: "gmail" }] } }), []);
});
test("probe sends only GET-style read paths and reports no mailbox contents", async () => {
  const calls: string[] = [];
  const mock = {
    listConnections: async () => ({ connections: [
      { id: "gmail", connector_name: "gmail" },
      { id: "sheets", connector_name: "google-sheet" },
      { id: "drive", connector_name: "google-drive" },
    ] }),
    proxy: async (_name: string, path: string) => { calls.push(path); return new Response(null, { status: 200 }); },
  };
  const result = await runConnectorProbe(mock, { sheetId: "test-sheet" });
  assert.equal(result.find(x => x.service === "Gmail")?.state, "pass");
  assert.equal(result.find(x => x.service === "Google Sheets")?.state, "pass");
  assert.equal(result.find(x => x.service === "Google Docs")?.state, "not_connected");
  assert.ok(calls.every(path => path.startsWith("/") && !/send|modify|batchupdate|append|draft/i.test(path)));
  assert.ok(!JSON.stringify(result).includes("never print"));
});
test("Sheet remains untested until a sheet ID is supplied", async () => {
  let count = 0;
  const result = await runConnectorProbe({
    listConnections: async () => [{ id: "sheet", connector_name: "google-sheet" }],
    proxy: async () => { count++; return new Response(null, { status: 200 }); },
  });
  assert.equal(count, 0);
  assert.equal(result.find(x => x.service === "Google Sheets")?.state, "needs_test_document");
});
test("errors do not leak raw provider payload or credentials", () => {
  assert.match(classifyError({ status: 403, message: "SECRET_TOKEN" }), /403/);
  assert.ok(!classifyError({ status: 403, message: "SECRET_TOKEN" }).includes("SECRET_TOKEN"));
});

test("initialization error reporting identifies phase and safe status without leaking messages", () => {
  assert.equal(explainInitializationError({name:"TypeError",message:"SECRET_TOKEN"}, "discovery"),
    "phase=discovery | category=TypeError | hint=SDK method signature may not match the installed package");
  assert.equal(explainInitializationError({name:"AuthenticationError",status:401,body:{token:"SECRET_TOKEN"}}, "discovery"),
    "phase=discovery | category=AuthenticationError | http=401 | hint=connector identity may not be granted to this Repl");
  assert.ok(!explainInitializationError(new Error("SECRET_TOKEN"), "constructor").includes("SECRET_TOKEN"));
});

test("recognizes the Replit project-level google-mail connector", async () => {
  const seen: string[] = [];
  const output = await runConnectorProbe({
    listConnections: async () => ({ connections: [{ id: "mail", connector_name: "google-mail" }] }),
    proxy: async (connector, path) => {
      seen.push(`${connector}:${path}`);
      return new Response(null, { status: 200 });
    },
  });
  assert.equal(output.find(x => x.service === "Gmail")?.state, "pass");
  assert.deepEqual(seen, ["google-mail:/gmail/v1/users/me/profile"]);
});

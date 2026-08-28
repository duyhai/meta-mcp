import test from "node:test";
import assert from "node:assert/strict";
import { waitForContainerStatus } from "../src/services/container-polling.js";

test("container polling resolves only after FINISHED", async () => {
  const statuses = ["IN_PROGRESS", "IN_PROGRESS", "FINISHED"];
  let calls = 0;
  await waitForContainerStatus(async () => statuses[calls++], {
    intervalMs: 2_000,
    maxWaitMs: 4_000,
    sleep: async () => undefined,
    label: "Test container",
  });
  assert.equal(calls, 3);
});

test("container polling fails on API error status", async () => {
  await assert.rejects(
    waitForContainerStatus(async () => "ERROR", {
      intervalMs: 2_000,
      maxWaitMs: 4_000,
      sleep: async () => undefined,
      label: "Test container",
    }),
    /processing failed/
  );
});

test("container polling throws instead of publishing after timeout", async () => {
  let calls = 0;
  await assert.rejects(
    waitForContainerStatus(
      async () => {
        calls += 1;
        return "IN_PROGRESS";
      },
      {
        intervalMs: 2_000,
        maxWaitMs: 4_000,
        sleep: async () => undefined,
        label: "Test container",
      }
    ),
    /timed out/
  );
  assert.equal(calls, 3);
});

test("container polling rejects invalid timing configuration", async () => {
  await assert.rejects(
    waitForContainerStatus(async () => "FINISHED", {
      intervalMs: 0,
      maxWaitMs: 1_000,
    }),
    /intervalMs/
  );
});

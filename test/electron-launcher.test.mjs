import assert from "node:assert/strict";
import test from "node:test";

import { buildPaseoLaunchEnvironment, mergeElectronFlags } from "../src/electron-launcher.mjs";

test("mergeElectronFlags preserves unrelated flags and owns the local CDP endpoint", () => {
  const result = mergeElectronFlags(
    "--disable-gpu --remote-debugging-port=9000 --remote-debugging-address=0.0.0.0",
    9224,
  );

  assert.equal(
    result,
    "--disable-gpu --remote-debugging-address=127.0.0.1 --remote-debugging-port=9224",
  );
});

test("buildPaseoLaunchEnvironment does not mutate the caller environment", () => {
  const environment = {
    HOME: "/tmp/example-home",
    PASEO_ELECTRON_FLAGS: "--disable-gpu",
  };

  const result = buildPaseoLaunchEnvironment(environment, 9334);

  assert.deepEqual(environment, {
    HOME: "/tmp/example-home",
    PASEO_ELECTRON_FLAGS: "--disable-gpu",
  });
  assert.equal(result.HOME, "/tmp/example-home");
  assert.equal(
    result.PASEO_ELECTRON_FLAGS,
    "--disable-gpu --remote-debugging-address=127.0.0.1 --remote-debugging-port=9334",
  );
});

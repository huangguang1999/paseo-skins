import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Paseo agent skill exposes valid discovery metadata and safety rules", async () => {
  const skill = await readFile(
    new URL("../skills/paseo-skins/SKILL.md", import.meta.url),
    "utf8",
  );

  assert.match(skill, /^---\nname: paseo-skins\ndescription: .+\n---\n/);
  assert.match(skill, /Never force-quit Paseo/);
  assert.match(skill, /verify.*pass: true/s);
  assert.match(skill, /https:\/\/huangguang1999\.github\.io\/paseo-skins\/catalog\.json/);
});

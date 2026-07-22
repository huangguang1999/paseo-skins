import assert from "node:assert/strict";
import test from "node:test";

import {
  buildStageBlackGoldInjectionSource,
  buildStageBlackGoldResetSource,
  buildStageBlackGoldVerificationSource,
  STAGE_BLACK_GOLD_OVERLAY_ID,
  STAGE_BLACK_GOLD_STYLE_ID,
} from "../src/stage-black-gold-skin.mjs";

test("stage black gold injection is a self-contained executable script", () => {
  const source = buildStageBlackGoldInjectionSource();

  assert.doesNotThrow(() => new Function(source));
  assert.match(source, new RegExp(STAGE_BLACK_GOLD_STYLE_ID));
  assert.match(source, new RegExp(STAGE_BLACK_GOLD_OVERLAY_ID));
  assert.match(source, /MutationObserver/);
  assert.match(source, /pointer-events:\s*none/);
  assert.match(source, /existingSkin\?\.destroy/);
  assert.match(source, /isBottomChromeSurface/);
  assert.doesNotMatch(source, /paseo-skin-center-beam|<svg/);
});

test("stage black gold reset always restores a hidden application root", () => {
  const source = buildStageBlackGoldResetSource();

  assert.doesNotThrow(() => new Function(source));
  assert.match(source, /removeProperty\("visibility"\)/);
  assert.match(source, /destroy/);
});

test("stage black gold injection embeds the project hero image", () => {
  const heroImageDataUrl = "data:image/png;base64,cGFzZW8=";
  const source = buildStageBlackGoldInjectionSource({ heroImageDataUrl });

  assert.doesNotThrow(() => new Function(source));
  assert.match(source, new RegExp(heroImageDataUrl));
  assert.match(source, /data-paseo-skin-layer=\\?"hero\\?"/);
});

test("stage black gold verification checks renderer safety and theme identity", () => {
  const source = buildStageBlackGoldVerificationSource({ expectedThemeId: "stage-black-gold" });

  assert.doesNotThrow(() => new Function(source));
  assert.match(source, /rootVisibility/);
  assert.match(source, /overlayPointerEvents/);
  assert.match(source, /horizontalOverflow/);
  assert.match(source, /stage-black-gold/);
});

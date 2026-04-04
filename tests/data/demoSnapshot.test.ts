import test from "node:test";
import assert from "node:assert/strict";
import { getDemoSnapshotBundle, getDemoSourceLabel } from "../../src/data/demoSnapshot";
import { generateLocalPath } from "../../src/data/localGraph";

test("demo snapshot bundle exposes a stable offline source label", () => {
  assert.equal(getDemoSourceLabel(), "the built-in offline demo dataset");
});

test("demo snapshot bundle contains levels and graph indexes for offline play", () => {
  const bundle = getDemoSnapshotBundle();
  const games = bundle.snapshot.levels.flatMap((levelGroup) => levelGroup.games);

  assert.equal(bundle.loadedFrom, "demo");
  assert.equal(bundle.snapshot.levels.length, 2);
  assert.equal(games.length, 6);
  assert.equal(bundle.indexes.actorsById.size, 8);
  assert.equal(bundle.indexes.moviesById.size, 5);
});

test("demo levels stay within short one-movie or two-movie routes", () => {
  const bundle = getDemoSnapshotBundle();
  const games = bundle.snapshot.levels.flatMap((levelGroup) => levelGroup.games);

  for (const level of games) {
    const actorAId = bundle.indexes.actorNameToId.get(level.startNode.label.toLowerCase());
    const actorBId = bundle.indexes.actorNameToId.get(level.targetNode.label.toLowerCase());

    assert.notEqual(actorAId, undefined);
    assert.notEqual(actorBId, undefined);

    const path = generateLocalPath(
      { id: actorAId!, type: "actor", label: level.startNode.label },
      { id: actorBId!, type: "actor", label: level.targetNode.label },
      bundle.indexes,
    );

    assert.equal(path.reason, null);
    assert.ok(path.steps === 2 || path.steps === 4);
  }
});
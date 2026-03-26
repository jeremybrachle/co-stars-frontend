import test from "node:test";
import assert from "node:assert/strict";
import { getTopWriteInMatches, getWriteInMatchScore } from "../../src/utils/writeInMatching";

test("getWriteInMatchScore prefers exact matches over prefix and fuzzy matches", () => {
  const exact = getWriteInMatchScore("Ocean's Eleven", "Ocean's Eleven");
  const prefix = getWriteInMatchScore("Ocean's Eleven", "Ocean");
  const fuzzy = getWriteInMatchScore("Ocean's Eleven", "ocn 11");

  assert.notEqual(exact, null);
  assert.notEqual(prefix, null);
  assert.notEqual(fuzzy, null);
  assert.ok(exact! > prefix!);
  assert.ok(prefix! > fuzzy!);
});

test("getWriteInMatchScore normalizes number words and digits", () => {
  const score = getWriteInMatchScore("Ocean's Eleven", "Ocean 11");

  assert.notEqual(score, null);
  assert.ok(score! > 0);
});

test("getTopWriteInMatches filters to the closest normalized matches first", () => {
  const result = getTopWriteInMatches([
    "Ocean's Eleven",
    "Ocean's Twelve",
    "Ocean's Thirteen",
    "The Mexican",
  ], "oce 12", 3);

  assert.deepEqual(result, ["Ocean's Twelve"]);
});

test("getTopWriteInMatches returns an empty list for empty queries", () => {
  assert.deepEqual(getTopWriteInMatches(["Ocean's Eleven"], "   "), []);
});
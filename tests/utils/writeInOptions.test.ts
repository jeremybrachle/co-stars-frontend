import test from "node:test";
import assert from "node:assert/strict";
import { getVisibleWriteInOptions, resolveWriteInOption } from "../../src/utils/writeInOptions";
import type { GameNode } from "../../src/types";

const relevantOptions: GameNode[] = [
  { id: 1, label: "Ocean's Eleven", type: "movie", releaseDate: "2001-12-07", imageUrl: "https://example.com/oceans11.jpg" },
  { id: 2, label: "Ocean's Twelve", type: "movie", releaseDate: "2004-12-10", imageUrl: "https://example.com/oceans12.jpg" },
  { id: 3, label: "The Mexican", type: "movie", releaseDate: "2001-03-02" },
];

test("getVisibleWriteInOptions returns the full relevant list when the query is empty", () => {
  const result = getVisibleWriteInOptions(relevantOptions, "");

  assert.deepEqual(result.map((option) => option.label), ["Ocean's Eleven", "Ocean's Twelve", "The Mexican"]);
});

test("getVisibleWriteInOptions brings closer fuzzy matches to the top as the query narrows", () => {
  const result = getVisibleWriteInOptions(relevantOptions, "oce 12");

  assert.equal(result[0]?.label, "Ocean's Twelve");
});

test("resolveWriteInOption only resolves values from the relevant option list", () => {
  const matched = resolveWriteInOption("ocean's 11", relevantOptions, true);
  const missing = resolveWriteInOption("The Matrix", relevantOptions, true);

  assert.equal(matched?.label, "Ocean's Eleven");
  assert.equal(missing, null);
});

test("resolveWriteInOption requires an exact relevant match when autosuggest is disabled", () => {
  const exact = resolveWriteInOption("Ocean's Twelve", relevantOptions, false);
  const fuzzy = resolveWriteInOption("oceans 12", relevantOptions, false);

  assert.equal(exact?.label, "Ocean's Twelve");
  assert.equal(fuzzy, null);
});
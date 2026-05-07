import test from "node:test";
import assert from "node:assert/strict";

import {
  buildEditableEntries,
  buildTimelineEntries,
  calculateBmr,
  calculateProfileMetrics,
  createSampleState,
  estimateExerciseCalories,
  estimateMealItems,
  listLoggedDateKeys,
  summarizeDay,
  summarizeRange,
} from "../src/health-core.js";
import {
  buildMealPrompt,
  extractJsonObject,
  parseMealJson,
} from "../src/server-core.mjs";

test("estimateMealItems recognizes known foods and sums calories", () => {
  const estimate = estimateMealItems("2 个鸡蛋，一杯牛奶，一片面包");

  assert.equal(estimate.items.length, 3);
  assert.equal(estimate.totalCalories, 366);
});

test("estimateExerciseCalories uses MET-based rounding", () => {
  assert.equal(estimateExerciseCalories(75, "stairs", 30), 330);
  assert.equal(estimateExerciseCalories(75, "yoga", 60), 225);
});

test("summaries aggregate data for current day and recent range", () => {
  const fixedNow = new Date("2026-05-07T12:00:00+08:00");
  const state = createSampleState(fixedNow);
  const today = summarizeDay(state, fixedNow);
  const week = summarizeRange(state, 7, fixedNow);

  assert.equal(today.caloriesIn, 852);
  assert.equal(today.caloriesOut, 283);
  assert.equal(today.netCalories, 569);
  assert.equal(week.completionDays, 7);
});

test("timeline merges weight, meals, and exercises in descending time order", () => {
  const fixedNow = new Date("2026-05-07T12:00:00+08:00");
  const state = createSampleState(fixedNow);
  const timeline = buildTimelineEntries(state, fixedNow);

  assert.equal(timeline.length, 4);
  assert.equal(timeline[0].kind, "exercise");
  assert.equal(timeline[timeline.length - 1].kind, "weight");
});

test("history helpers expose recorded dates and editable entries", () => {
  const fixedNow = new Date("2026-05-07T12:00:00+08:00");
  const state = createSampleState(fixedNow);
  const keys = listLoggedDateKeys(state);
  const editable = buildEditableEntries(state, fixedNow);

  assert.deepEqual(keys.slice(0, 2), ["2026-05-07", "2026-05-06"]);
  assert.equal(editable[0].entryKind, "exercise");
  assert.equal(editable.some((item) => item.entryKind === "meal"), true);
});

test("server helpers extract JSON from model text robustly", () => {
  const fenced = '```json\n{"totalCalories": 420, "items": []}\n```';
  const plain = '{"totalCalories": 420, "items": []}';

  assert.equal(extractJsonObject(fenced), '{"totalCalories": 420, "items": []}');
  assert.equal(parseMealJson(plain).totalCalories, 420);
  assert.equal(buildMealPrompt({ description: "鸡蛋和牛奶", profile: { goalWeightKg: 70 } }).includes("鸡蛋和牛奶"), true);
});

test("profile metrics derive daily targets from personal info", () => {
  const bmr = calculateBmr({
    sex: "male",
    weightKg: 75,
    heightCm: 175,
    age: 30,
  });

  const metrics = calculateProfileMetrics(
    {
      sex: "male",
      heightCm: 175,
      age: 30,
      goalWeightKg: 70,
      dailyCalorieTarget: 0,
    },
    75,
  );

  assert.equal(bmr, 1699);
  assert.equal(metrics.targetCalories > metrics.bmr, true);
  assert.equal(metrics.goalGapKg, 5);
  assert.equal(metrics.suggestedStrategy, "减脂");
});

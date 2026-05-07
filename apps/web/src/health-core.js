export const STORAGE_KEY = "daily-health-tracker-state-v1";

export const EXERCISE_LIBRARY = [
  { type: "stairs", label: "爬楼", met: 8.8 },
  { type: "jump-rope", label: "跳绳", met: 11.8 },
  { type: "walk", label: "快走", met: 4.3 },
  { type: "run", label: "慢跑", met: 8.3 },
  { type: "cycling", label: "骑行", met: 7.5 },
  { type: "strength", label: "力量训练", met: 6.0 },
  { type: "yoga", label: "瑜伽", met: 3.0 },
];

export const FOOD_LIBRARY = [
  { keyword: "鸡蛋", label: "鸡蛋", calories: 78, amount: "1 个" },
  { keyword: "米饭", label: "米饭", calories: 116, amount: "100 g" },
  { keyword: "牛奶", label: "牛奶", calories: 120, amount: "250 ml" },
  { keyword: "酸奶", label: "酸奶", calories: 130, amount: "1 杯" },
  { keyword: "燕麦", label: "燕麦", calories: 150, amount: "40 g" },
  { keyword: "面包", label: "全麦面包", calories: 90, amount: "2 片" },
  { keyword: "香蕉", label: "香蕉", calories: 95, amount: "1 根" },
  { keyword: "苹果", label: "苹果", calories: 85, amount: "1 个" },
  { keyword: "鸡胸", label: "鸡胸肉", calories: 165, amount: "100 g" },
  { keyword: "沙拉", label: "蔬菜沙拉", calories: 110, amount: "1 份" },
  { keyword: "面条", label: "面条", calories: 280, amount: "1 碗" },
  { keyword: "可乐", label: "可乐", calories: 140, amount: "330 ml" },
  { keyword: "咖啡", label: "拿铁咖啡", calories: 135, amount: "1 杯" },
  { keyword: "豆浆", label: "豆浆", calories: 95, amount: "300 ml" },
  { keyword: "红薯", label: "红薯", calories: 110, amount: "100 g" },
];

const DAY_MS = 24 * 60 * 60 * 1000;

export function createInitialState() {
  return {
    profile: {
      name: "自己",
      heightCm: 175,
      age: 30,
      sex: "male",
      goalWeightKg: 70,
      dailyCalorieTarget: 1850,
      timezone: "Asia/Shanghai",
    },
    weightLogs: [],
    mealLogs: [],
    exerciseLogs: [],
  };
}

export function createSampleState(now = new Date()) {
  const state = createInitialState();
  const dayOffsets = [12, 10, 8, 6, 5, 4, 3, 2, 1, 0];

  state.weightLogs = dayOffsets.map((offset, index) => ({
    id: `weight-${offset}`,
    loggedAt: setTime(addDays(now, -offset), 7, 12),
    weightKg: round1(75.6 - index * 0.18 + (index % 2 === 0 ? 0.12 : -0.08)),
    isFasted: true,
    note: index === dayOffsets.length - 1 ? "昨晚稍微吃多了点" : "",
  }));

  state.mealLogs = [
    {
      id: "meal-breakfast-today",
      mealType: "breakfast",
      loggedAt: setTime(now, 8, 15),
      description: "2 个鸡蛋，一杯牛奶，一片全麦面包",
      photoDataUrl: "",
      estimatedCalories: 366,
      items: estimateMealItems("2 个鸡蛋，一杯牛奶，一片全麦面包").items,
    },
    {
      id: "meal-lunch-today",
      mealType: "lunch",
      loggedAt: setTime(now, 12, 38),
      description: "米饭，鸡胸肉，沙拉，香蕉",
      photoDataUrl: "",
      estimatedCalories: 486,
      items: estimateMealItems("米饭，鸡胸肉，沙拉，香蕉").items,
    },
    {
      id: "meal-dinner-yesterday",
      mealType: "dinner",
      loggedAt: setTime(addDays(now, -1), 19, 8),
      description: "面条，鸡蛋，豆浆",
      photoDataUrl: "",
      estimatedCalories: 453,
      items: estimateMealItems("面条，鸡蛋，豆浆").items,
    },
  ];

  state.exerciseLogs = [
    {
      id: "exercise-yesterday",
      exerciseType: "jump-rope",
      durationMinutes: 20,
      count: 1200,
      note: "节奏稳定",
      loggedAt: setTime(addDays(now, -1), 20, 20),
      estimatedCaloriesBurned: estimateExerciseCalories(75, "jump-rope", 20),
    },
    {
      id: "exercise-today",
      exerciseType: "stairs",
      durationMinutes: 26,
      count: 35,
      note: "下班后爬楼",
      loggedAt: setTime(now, 19, 20),
      estimatedCaloriesBurned: estimateExerciseCalories(74.1, "stairs", 26),
    },
  ];

  return state;
}

export function estimateMealItems(description) {
  const normalized = description.trim();
  const segments = normalized
    .split(/[，,、；;。]/)
    .map((item) => item.trim())
    .filter(Boolean);

  if (!normalized) {
    return {
      items: [],
      totalCalories: 0,
      message: "先写一点描述，比如“鸡蛋、牛奶、米饭”。",
    };
  }

  const items = [];

  FOOD_LIBRARY.forEach((food) => {
    if (normalized.includes(food.keyword)) {
      const quantity = detectQuantity(segments, food.keyword);
      items.push({
        name: food.label,
        amount: quantity ?? food.amount,
        estimatedCalories: round0(food.calories * detectMultiplier(quantity)),
      });
    }
  });

  if (items.length === 0) {
    return {
      items: [
        {
          name: "未命中词库的餐食",
          amount: "1 份",
          estimatedCalories: 320,
        },
      ],
      totalCalories: 320,
      message: "没有识别到词库食物，先给出一份保守估算。",
    };
  }

  const totalCalories = items.reduce((sum, item) => sum + item.estimatedCalories, 0);

  return {
    items,
    totalCalories,
    message: `已根据描述识别 ${items.length} 项食物。`,
  };
}

export function estimateExerciseCalories(weightKg, exerciseType, durationMinutes) {
  const entry = EXERCISE_LIBRARY.find((item) => item.type === exerciseType);
  const met = entry?.met ?? 5;
  const hours = durationMinutes / 60;
  return round0(met * weightKg * hours);
}

export function summarizeDay(state, dateInput) {
  const dateKey = toDateKey(dateInput);
  const meals = state.mealLogs.filter((item) => toDateKey(item.loggedAt) === dateKey);
  const exercises = state.exerciseLogs.filter((item) => toDateKey(item.loggedAt) === dateKey);
  const weights = state.weightLogs.filter((item) => toDateKey(item.loggedAt) === dateKey);
  const weight = pickLatestWeight(weights)?.weightKg ?? null;
  const caloriesIn = meals.reduce((sum, item) => sum + item.estimatedCalories, 0);
  const caloriesOut = exercises.reduce(
    (sum, item) => sum + item.estimatedCaloriesBurned,
    0,
  );

  return {
    dateKey,
    weightKg: weight,
    caloriesIn,
    caloriesOut,
    netCalories: caloriesIn - caloriesOut,
    mealCount: meals.length,
    exerciseCount: exercises.length,
    hasAnyLog: meals.length > 0 || exercises.length > 0 || weights.length > 0,
  };
}

export function summarizeRange(state, days, now = new Date()) {
  const daily = [];

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    daily.push(summarizeDay(state, addDays(now, -offset)));
  }

  const weights = daily
    .map((item) => item.weightKg)
    .filter((value) => typeof value === "number");

  return {
    daily,
    averageWeightKg: weights.length
      ? round1(weights.reduce((sum, value) => sum + value, 0) / weights.length)
      : null,
    totalCaloriesIn: daily.reduce((sum, item) => sum + item.caloriesIn, 0),
    totalCaloriesOut: daily.reduce((sum, item) => sum + item.caloriesOut, 0),
    completionDays: daily.filter((item) => item.hasAnyLog).length,
    weightChangeKg:
      weights.length >= 2 ? round1(weights[weights.length - 1] - weights[0]) : null,
  };
}

export function calculateProfileMetrics(profile, currentWeightKg) {
  const weightKg = currentWeightKg || profile.goalWeightKg || 70;
  const bmr = calculateBmr({
    sex: profile.sex,
    weightKg,
    heightCm: profile.heightCm,
    age: profile.age,
  });
  const targetCalories =
    profile.dailyCalorieTarget ||
    recommendDailyCalories({
      bmr,
      goalWeightKg: profile.goalWeightKg,
      currentWeightKg: weightKg,
    });
  const targetZone = {
    lower: Math.max(1200, targetCalories - 150),
    upper: targetCalories + 150,
  };

  return {
    currentWeightKg: weightKg,
    bmr,
    targetCalories,
    targetZone,
    goalGapKg: round1(weightKg - profile.goalWeightKg),
    suggestedStrategy:
      weightKg > profile.goalWeightKg + 0.8
        ? "减脂"
        : weightKg < profile.goalWeightKg - 0.8
          ? "增肌/回升"
          : "维持",
  };
}

export function calculateBmr({ sex, weightKg, heightCm, age }) {
  const safeWeight = Number(weightKg) || 70;
  const safeHeight = Number(heightCm) || 170;
  const safeAge = Number(age) || 30;
  const base = 10 * safeWeight + 6.25 * safeHeight - 5 * safeAge;

  if (sex === "female") {
    return round0(base - 161);
  }

  if (sex === "male") {
    return round0(base + 5);
  }

  return round0(base - 78);
}

export function recommendDailyCalories({
  bmr,
  goalWeightKg,
  currentWeightKg,
}) {
  const gap = (Number(currentWeightKg) || 70) - (Number(goalWeightKg) || 70);

  if (gap > 2) {
    return Math.max(1200, round0(bmr + 250));
  }

  if (gap < -2) {
    return round0(bmr + 550);
  }

  return round0(bmr + 400);
}

export function listLoggedDateKeys(state) {
  const keys = new Set();

  state.weightLogs.forEach((item) => keys.add(toDateKey(item.loggedAt)));
  state.mealLogs.forEach((item) => keys.add(toDateKey(item.loggedAt)));
  state.exerciseLogs.forEach((item) => keys.add(toDateKey(item.loggedAt)));

  return [...keys].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
}

export function buildTimelineEntries(state, dateInput) {
  const dateKey = toDateKey(dateInput);
  const weightEntries = state.weightLogs
    .filter((item) => toDateKey(item.loggedAt) === dateKey)
    .map((item) => ({
      id: item.id,
      kind: "weight",
      title: `${item.isFasted ? "空腹" : "普通"}体重 ${item.weightKg} kg`,
      detail: item.note || "体重记录",
      time: item.loggedAt,
      badge: "⚖️",
    }));

  const mealEntries = state.mealLogs
    .filter((item) => toDateKey(item.loggedAt) === dateKey)
    .map((item) => ({
      id: item.id,
      kind: "meal",
      title: `${mealTypeLabel(item.mealType)} ${item.estimatedCalories} kcal`,
      detail: item.description,
      time: item.loggedAt,
      badge: "🍽️",
      photoDataUrl: item.photoDataUrl || "",
    }));

  const exerciseEntries = state.exerciseLogs
    .filter((item) => toDateKey(item.loggedAt) === dateKey)
    .map((item) => ({
      id: item.id,
      kind: "exercise",
      title: `${exerciseLabel(item.exerciseType)} ${item.estimatedCaloriesBurned} kcal`,
      detail: `${item.durationMinutes} 分钟${item.count ? `，数量 ${item.count}` : ""}`,
      time: item.loggedAt,
      badge: "🏃",
    }));

  return [...weightEntries, ...mealEntries, ...exerciseEntries].sort(
    (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime(),
  );
}

export function buildEditableEntries(state, dateInput) {
  const dateKey = toDateKey(dateInput);
  const weights = state.weightLogs
    .filter((item) => toDateKey(item.loggedAt) === dateKey)
    .map((item) => ({
      ...item,
      entryKind: "weight",
      title: `${item.isFasted ? "空腹" : "普通"}体重 ${item.weightKg} kg`,
      badge: "⚖️",
    }));

  const meals = state.mealLogs
    .filter((item) => toDateKey(item.loggedAt) === dateKey)
    .map((item) => ({
      ...item,
      entryKind: "meal",
      title: `${mealTypeLabel(item.mealType)} ${item.estimatedCalories} kcal`,
      badge: "🍽️",
    }));

  const exercises = state.exerciseLogs
    .filter((item) => toDateKey(item.loggedAt) === dateKey)
    .map((item) => ({
      ...item,
      entryKind: "exercise",
      title: `${exerciseLabel(item.exerciseType)} ${item.estimatedCaloriesBurned} kcal`,
      badge: "🏃",
    }));

  return [...weights, ...meals, ...exercises].sort(
    (a, b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime(),
  );
}

export function serializeState(state) {
  return JSON.stringify(state);
}

export function deserializeState(raw) {
  try {
    const parsed = JSON.parse(raw);

    if (!parsed || typeof parsed !== "object") {
      return createInitialState();
    }

    return {
      profile: { ...createInitialState().profile, ...parsed.profile },
      weightLogs: Array.isArray(parsed.weightLogs) ? parsed.weightLogs : [],
      mealLogs: Array.isArray(parsed.mealLogs) ? parsed.mealLogs : [],
      exerciseLogs: Array.isArray(parsed.exerciseLogs) ? parsed.exerciseLogs : [],
    };
  } catch {
    return createInitialState();
  }
}

export function toDateKey(dateInput) {
  const date = new Date(dateInput);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

export function datetimeLocalValue(dateInput = new Date()) {
  const date = new Date(dateInput);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}T${hours}:${minutes}`;
}

export function formatDateLabel(dateInput) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date(dateInput));
}

export function formatTimeLabel(dateInput) {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateInput));
}

export function mealTypeLabel(type) {
  return (
    {
      breakfast: "早餐",
      lunch: "午餐",
      dinner: "晚餐",
      snack: "加餐",
    }[type] ?? "餐食"
  );
}

export function exerciseLabel(type) {
  return EXERCISE_LIBRARY.find((item) => item.type === type)?.label ?? "运动";
}

function pickLatestWeight(weights) {
  return [...weights].sort(
    (a, b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime(),
  )[0];
}

function detectQuantity(segments, keyword) {
  const clause = segments.find((item) => item.includes(keyword));

  if (!clause) {
    return null;
  }

  const fullPattern = new RegExp(
    `(\\d+(?:\\.\\d+)?|[一二两三四五六七八九十半])\\s*(个|片|杯|碗|根|份).*${keyword}`,
  );
  const prefixPattern = new RegExp(
    `${keyword}.*?(\\d+(?:\\.\\d+)?|[一二两三四五六七八九十半])\\s*(个|片|杯|碗|根|份)`,
  );
  const match = clause.match(fullPattern) || clause.match(prefixPattern);

  if (!match) {
    return null;
  }

  return `${normalizeQuantityNumber(match[1])} ${match[2]}`;
}

function detectMultiplier(quantity) {
  if (!quantity) {
    return 1;
  }

  const value = Number.parseFloat(quantity);

  if (Number.isNaN(value) || value <= 0) {
    return 1;
  }

  return value;
}

function normalizeQuantityNumber(value) {
  return (
    {
      一: "1",
      二: "2",
      两: "2",
      三: "3",
      四: "4",
      五: "5",
      六: "6",
      七: "7",
      八: "8",
      九: "9",
      十: "10",
      半: "0.5",
    }[value] ?? value
  );
}

function addDays(dateInput, days) {
  return new Date(new Date(dateInput).getTime() + days * DAY_MS);
}

function setTime(dateInput, hours, minutes) {
  const date = new Date(dateInput);
  date.setHours(hours, minutes, 0, 0);
  return date.toISOString();
}

function round0(value) {
  return Math.round(value);
}

function round1(value) {
  return Math.round(value * 10) / 10;
}

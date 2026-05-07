import {
  EXERCISE_LIBRARY,
  FOOD_LIBRARY,
  STORAGE_KEY,
  buildEditableEntries,
  buildTimelineEntries,
  calculateProfileMetrics,
  createSampleState,
  datetimeLocalValue,
  deserializeState,
  estimateExerciseCalories,
  estimateMealItems,
  exerciseLabel,
  formatDateLabel,
  formatTimeLabel,
  listLoggedDateKeys,
  mealTypeLabel,
  serializeState,
  summarizeDay,
  toDateKey,
  summarizeRange,
} from "./src/health-core.js";

const state = loadState();
const now = new Date();
let selectedHistoryDate = toDateKey(now);
let editingContext = null;

const heroMetrics = document.querySelector("#heroMetrics");
const todaySummary = document.querySelector("#todaySummary");
const todayTimeline = document.querySelector("#todayTimeline");
const historySummary = document.querySelector("#historySummary");
const historyTimeline = document.querySelector("#historyTimeline");
const historyList = document.querySelector("#historyList");
const historyDateInput = document.querySelector("#historyDateInput");
const historyLabel = document.querySelector("#historyLabel");
const insightSummary = document.querySelector("#insightSummary");
const streakGrid = document.querySelector("#streakGrid");
const foodDictionary = document.querySelector("#foodDictionary");
const mealQuickChips = document.querySelector("#mealQuickChips");
const profileForm = document.querySelector("#profileForm");
const todayLabel = document.querySelector("#todayLabel");
const mealEstimatePanel = document.querySelector("#mealEstimatePanel");
const mealAiStatus = document.querySelector("#mealAiStatus");
const weightChart = document.querySelector("#weightChart");
const backupStatus = document.querySelector("#backupStatus");
const editDialog = document.querySelector("#editDialog");
const editDialogTitle = document.querySelector("#editDialogTitle");
const editFields = document.querySelector("#editFields");
const editForm = document.querySelector("#editForm");
const deleteEntryButton = document.querySelector("#deleteEntryButton");

const weightForm = document.querySelector("#weightForm");
const mealForm = document.querySelector("#mealForm");
const exerciseForm = document.querySelector("#exerciseForm");
const seedButton = document.querySelector("#seedButton");
const estimateMealButton = document.querySelector("#estimateMealButton");
const jumpTodayButton = document.querySelector("#jumpTodayButton");
const exportDataButton = document.querySelector("#exportDataButton");
const importDataInput = document.querySelector("#importDataInput");
const segmentButtons = document.querySelectorAll("[data-view-target]");
const views = document.querySelectorAll("[data-view]");

bootstrap();

function bootstrap() {
  populateDefaultFields();
  renderExerciseOptions();
  renderProfileForm();
  renderFoodDictionary();
  renderMealQuickChips();
  bindEvents();
  render();
  checkAiAvailability();
  registerServiceWorker();
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? deserializeState(raw) : createSampleState(new Date());
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, serializeState(state));
}

function populateDefaultFields() {
  weightForm.loggedAt.value = datetimeLocalValue(now);
  mealForm.loggedAt.value = datetimeLocalValue(now);
  exerciseForm.loggedAt.value = datetimeLocalValue(now);
  exerciseForm.durationMinutes.value = "20";
  historyDateInput.value = selectedHistoryDate;
}

function renderExerciseOptions() {
  exerciseForm.exerciseType.innerHTML = EXERCISE_LIBRARY.map(
    (item) => `<option value="${item.type}">${item.label}</option>`,
  ).join("");
}

function renderProfileForm() {
  const profile = state.profile;

  profileForm.innerHTML = `
    <label>
      <span>昵称</span>
      <input name="name" type="text" value="${escapeHtml(profile.name)}" maxlength="24" />
    </label>
    <label>
      <span>身高（cm）</span>
      <input name="heightCm" type="number" min="100" max="230" step="1" value="${profile.heightCm}" />
    </label>
    <label>
      <span>年龄</span>
      <input name="age" type="number" min="10" max="99" step="1" value="${profile.age}" />
    </label>
    <label>
      <span>性别</span>
      <select name="sex">
        <option value="male" ${profile.sex === "male" ? "selected" : ""}>男</option>
        <option value="female" ${profile.sex === "female" ? "selected" : ""}>女</option>
        <option value="other" ${profile.sex === "other" ? "selected" : ""}>其他</option>
      </select>
    </label>
    <label>
      <span>目标体重（kg）</span>
      <input name="goalWeightKg" type="number" min="20" max="200" step="0.1" value="${profile.goalWeightKg}" />
    </label>
    <label>
      <span>每日热量目标（kcal）</span>
      <input
        name="dailyCalorieTarget"
        type="number"
        min="800"
        max="5000"
        step="10"
        value="${profile.dailyCalorieTarget}"
      />
    </label>
    <button type="submit" class="primary-button">保存偏好</button>
  `;
}

function renderFoodDictionary() {
  foodDictionary.innerHTML = FOOD_LIBRARY.map(
    (item) =>
      `<div class="tag"><strong>${item.label}</strong><span>${item.amount} · ${item.calories} kcal</span></div>`,
  ).join("");
}

function renderMealQuickChips() {
  mealQuickChips.innerHTML = FOOD_LIBRARY.slice(0, 10)
    .map(
      (item) =>
        `<button class="quick-chip" type="button" data-food-chip="${item.keyword}">${item.label}</button>`,
    )
    .join("");
}

function bindEvents() {
  segmentButtons.forEach((button) => {
    button.addEventListener("click", () => switchView(button.dataset.viewTarget));
  });

  historyDateInput.addEventListener("change", () => {
    selectedHistoryDate = historyDateInput.value || toDateKey(new Date());
    render();
  });

  jumpTodayButton.addEventListener("click", () => {
    selectedHistoryDate = toDateKey(new Date());
    historyDateInput.value = selectedHistoryDate;
    render();
  });

  weightForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(weightForm);

    state.weightLogs.unshift({
      id: crypto.randomUUID(),
      weightKg: Number(formData.get("weightKg")),
      loggedAt: String(formData.get("loggedAt")),
      isFasted: formData.get("isFasted") === "on",
      note: String(formData.get("note") || "").trim(),
    });

    saveState();
    render();
    weightForm.reset();
    weightForm.loggedAt.value = datetimeLocalValue(new Date());
    weightForm.isFasted.checked = true;
  });

  estimateMealButton.addEventListener("click", async () => {
    const estimate = await runMealAnalysis();
    renderMealEstimate(estimate);
  });

  mealForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(mealForm);
    const description = String(formData.get("description") || "").trim();
    const estimate = await runMealAnalysis();
    const photoFile = formData.get("photo");
    const photoDataUrl =
      photoFile instanceof File && photoFile.size > 0 ? await fileToDataUrl(photoFile) : "";

    state.mealLogs.unshift({
      id: crypto.randomUUID(),
      mealType: String(formData.get("mealType")),
      loggedAt: String(formData.get("loggedAt")),
      description,
      photoDataUrl,
      estimatedCalories: estimate.totalCalories,
      items: estimate.items,
      note: "",
    });

    saveState();
    renderMealEstimate(estimate);
    render();
    mealForm.reset();
    mealForm.loggedAt.value = datetimeLocalValue(new Date());
  });

  exerciseForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(exerciseForm);
    const currentWeight = latestWeight();
    const exerciseType = String(formData.get("exerciseType"));
    const durationMinutes = Number(formData.get("durationMinutes"));

    state.exerciseLogs.unshift({
      id: crypto.randomUUID(),
      exerciseType,
      loggedAt: String(formData.get("loggedAt")),
      durationMinutes,
      count: Number(formData.get("count")) || null,
      note: String(formData.get("note") || "").trim(),
      estimatedCaloriesBurned: estimateExerciseCalories(
        currentWeight,
        exerciseType,
        durationMinutes,
      ),
    });

    saveState();
    render();
    exerciseForm.reset();
    exerciseForm.loggedAt.value = datetimeLocalValue(new Date());
    exerciseForm.durationMinutes.value = "20";
    renderExerciseOptions();
  });

  profileForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(profileForm);

    state.profile = {
      ...state.profile,
      name: String(formData.get("name") || "自己").trim() || "自己",
      heightCm: Number(formData.get("heightCm")),
      age: Number(formData.get("age")),
      sex: String(formData.get("sex")),
      goalWeightKg: Number(formData.get("goalWeightKg")),
      dailyCalorieTarget: Number(formData.get("dailyCalorieTarget")),
    };

    saveState();
    render();
  });

  seedButton.addEventListener("click", () => {
    const sample = createSampleState(new Date());
    state.profile = sample.profile;
    state.weightLogs = sample.weightLogs;
    state.mealLogs = sample.mealLogs;
    state.exerciseLogs = sample.exerciseLogs;
    saveState();
    renderProfileForm();
    render();
  });

  todayTimeline.addEventListener("click", handleTimelineAction);
  historyTimeline.addEventListener("click", handleTimelineAction);
  historyList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-history-date]");

    if (!button) {
      return;
    }

    selectedHistoryDate = button.dataset.historyDate;
    historyDateInput.value = selectedHistoryDate;
    render();
  });

  mealQuickChips.addEventListener("click", (event) => {
    const button = event.target.closest("[data-food-chip]");

    if (!button) {
      return;
    }

    const keyword = button.dataset.foodChip;
    const currentValue = mealForm.description.value.trim();
    mealForm.description.value = currentValue ? `${currentValue}，${keyword}` : keyword;
  });

  exportDataButton.addEventListener("click", exportData);
  importDataInput.addEventListener("change", importData);

  editForm.addEventListener("submit", (event) => {
    event.preventDefault();
    saveEditedEntry();
  });

  deleteEntryButton.addEventListener("click", deleteEditingEntry);
}

function switchView(target) {
  segmentButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.viewTarget === target);
  });

  views.forEach((view) => {
    view.classList.toggle("is-active", view.dataset.view === target);
  });
}

function render() {
  const today = summarizeDay(state, new Date());
  const historyDate = new Date(`${selectedHistoryDate}T12:00:00`);
  const history = summarizeDay(state, historyDate);
  const week = summarizeRange(state, 7, new Date());
  const month = summarizeRange(state, 30, new Date());
  const profileMetrics = calculateProfileMetrics(
    state.profile,
    today.weightKg || latestWeight(),
  );
  const weightGap = today.weightKg ? today.weightKg - state.profile.goalWeightKg : null;
  const calorieDeltaToTarget = today.netCalories - profileMetrics.targetCalories;

  todayLabel.textContent = formatDateLabel(new Date());

  renderMetricGrid(heroMetrics, [
    {
      label: "当前体重",
      value: today.weightKg ? `${today.weightKg} kg` : "待记录",
      subtle: today.weightKg
        ? `${profileMetrics.suggestedStrategy} · ${formatGoalGap(profileMetrics.goalGapKg)}`
        : "今天还没记录",
    },
    {
      label: "目标热量",
      value: `${profileMetrics.targetCalories} kcal`,
      subtle: `推荐区间 ${profileMetrics.targetZone.lower}-${profileMetrics.targetZone.upper}`,
    },
    {
      label: "基础代谢",
      value: `${profileMetrics.bmr} kcal`,
      subtle: `按 ${state.profile.sex === "female" ? "女性" : state.profile.sex === "male" ? "男性" : "通用"}公式计算`,
    },
    {
      label: "热量净值",
      value: `${today.netCalories} kcal`,
      subtle: compareText(calorieDeltaToTarget, "相比建议"),
    },
  ]);

  renderMetricGrid(todaySummary, [
    {
      label: "体重趋势",
      value: week.weightChangeKg === null ? "数据不足" : formatSignedKg(week.weightChangeKg),
      subtle: "近 7 天变化",
    },
    {
      label: "今日摄入",
      value: `${today.caloriesIn} kcal`,
      subtle: `${today.mealCount} 次进食`,
    },
    {
      label: "今日消耗",
      value: `${today.caloriesOut} kcal`,
      subtle: `${today.exerciseCount} 次运动`,
    },
    {
      label: "记录完成",
      value: `${week.completionDays} / 7 天`,
      subtle: `月度完成 ${month.completionDays} / 30 天`,
    },
  ]);

  renderTimeline(buildTimelineEntries(state, new Date()));
  renderHistory(historyDate, history);

  renderMetricGrid(insightSummary, [
    {
      label: "周摄入总热量",
      value: `${week.totalCaloriesIn} kcal`,
      subtle: `周消耗 ${week.totalCaloriesOut} kcal`,
    },
    {
      label: "月摄入总热量",
      value: `${month.totalCaloriesIn} kcal`,
      subtle: `月消耗 ${month.totalCaloriesOut} kcal`,
    },
    {
      label: "周平均体重",
      value: week.averageWeightKg ? `${week.averageWeightKg} kg` : "待记录",
      subtle: week.weightChangeKg === null ? "至少需要两次体重记录" : `变化 ${formatSignedKg(week.weightChangeKg)}`,
    },
    {
      label: "月平均体重",
      value: month.averageWeightKg ? `${month.averageWeightKg} kg` : "待记录",
      subtle:
        month.weightChangeKg === null ? "至少需要两次体重记录" : `变化 ${formatSignedKg(month.weightChangeKg)}`,
    },
  ]);

  renderMetricGrid(streakGrid, [
    {
      label: "近 7 天记录率",
      value: `${Math.round((week.completionDays / 7) * 100)}%`,
      subtle: `${week.completionDays} 天有记录`,
    },
    {
      label: "近 30 天记录率",
      value: `${Math.round((month.completionDays / 30) * 100)}%`,
      subtle: `${month.completionDays} 天有记录`,
    },
    {
      label: "近 7 天净热量",
      value: `${week.totalCaloriesIn - week.totalCaloriesOut} kcal`,
      subtle: "摄入 - 运动消耗",
    },
    {
      label: "当前建议",
      value:
        calorieDeltaToTarget <= 0
          ? "节奏不错"
          : calorieDeltaToTarget <= 250
            ? "注意晚餐"
            : "建议控量",
      subtle:
        calorieDeltaToTarget <= 0
          ? "今天的净热量还在建议范围内"
          : calorieDeltaToTarget <= 250
            ? "略高于建议值，留意加餐和饮料"
            : "明显高于建议值，明天可以适当拉回",
    },
  ]);

  renderWeightChart(month.daily.slice(-14));
}

function renderHistory(historyDate, summary) {
  historyLabel.textContent = formatDateLabel(historyDate);

  renderMetricGrid(historySummary, [
    {
      label: "当日体重",
      value: summary.weightKg ? `${summary.weightKg} kg` : "未记录",
      subtle: "优先显示当天最新一条",
    },
    {
      label: "摄入热量",
      value: `${summary.caloriesIn} kcal`,
      subtle: `${summary.mealCount} 次进食`,
    },
    {
      label: "运动消耗",
      value: `${summary.caloriesOut} kcal`,
      subtle: `${summary.exerciseCount} 次运动`,
    },
    {
      label: "热量净值",
      value: `${summary.netCalories} kcal`,
      subtle: summary.hasAnyLog ? "你可以继续修正当天记录" : "当天还没有任何数据",
    },
  ]);

  renderEditableTimeline(buildEditableEntries(state, historyDate), historyTimeline);
  renderHistoryList();
}

function renderMetricGrid(container, items) {
  const template = document.querySelector("#metricCardTemplate");
  container.innerHTML = "";

  items.forEach((item) => {
    const node = template.content.firstElementChild.cloneNode(true);
    node.querySelector(".metric-label").textContent = item.label;
    node.querySelector(".metric-value").textContent = item.value;
    node.querySelector(".metric-subtle").textContent = item.subtle;
    container.appendChild(node);
  });
}

function renderTimeline(entries) {
  if (!entries.length) {
    todayTimeline.innerHTML =
      '<div class="empty-state">今天还没有记录，先从晨起体重或一顿饭开始。</div>';
    return;
  }

  todayTimeline.innerHTML = entries
    .map(
      (entry) => `
        <article class="timeline-item">
          <div class="timeline-badge">${entry.badge}</div>
          <div class="timeline-body">
            <h3>${escapeHtml(entry.title)}</h3>
            <p class="timeline-meta">${formatTimeLabel(entry.time)} · ${escapeHtml(entry.detail)}</p>
            ${
              entry.photoDataUrl
                ? `<img class="timeline-photo" src="${entry.photoDataUrl}" alt="${escapeHtml(entry.title)}" />`
                : ""
            }
          </div>
        </article>
      `,
    )
    .join("");
}

function renderEditableTimeline(entries, container) {
  if (!entries.length) {
    container.innerHTML =
      '<div class="empty-state">这一天还没有记录，可以先补录体重、饮食或运动。</div>';
    return;
  }

  container.innerHTML = entries
    .map((entry) => {
      const meta = describeEditableEntry(entry);
      return `
        <article class="timeline-item">
          <div class="timeline-badge">${entry.badge}</div>
          <div class="timeline-body">
            <h3>${escapeHtml(entry.title)}</h3>
            <p class="timeline-meta">${formatTimeLabel(entry.loggedAt)} · ${escapeHtml(meta)}</p>
            ${
              entry.photoDataUrl
                ? `<img class="timeline-photo" src="${entry.photoDataUrl}" alt="${escapeHtml(entry.title)}" />`
                : ""
            }
            <div class="timeline-item-actions">
              <button class="mini-button" type="button" data-edit-kind="${entry.entryKind}" data-edit-id="${entry.id}">
                编辑
              </button>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderHistoryList() {
  const keys = listLoggedDateKeys(state);

  if (!keys.length) {
    historyList.innerHTML = '<div class="empty-state">还没有任何历史记录。</div>';
    return;
  }

  historyList.innerHTML = keys
    .slice(0, 12)
    .map((key) => {
      const summary = summarizeDay(state, new Date(`${key}T12:00:00`));
      return `
        <button
          class="history-day-button ${key === selectedHistoryDate ? "is-active" : ""}"
          type="button"
          data-history-date="${key}"
        >
          <strong>${key}</strong>
          <span>${summary.weightKg ? `${summary.weightKg} kg` : "未记体重"} · ${summary.caloriesIn}/${summary.caloriesOut} kcal</span>
        </button>
      `;
    })
    .join("");
}

function renderMealEstimate(estimate) {
  mealEstimatePanel.classList.remove("is-loading");
  mealEstimatePanel.classList.add("is-visible");
  mealEstimatePanel.innerHTML = `
    <strong>估算结果：${estimate.totalCalories} kcal</strong>
    <p class="helper-text">${escapeHtml(estimate.message)}${estimate.confidence !== undefined ? ` · 置信度 ${(estimate.confidence * 100).toFixed(0)}%` : ""}</p>
    <ul class="estimate-list">
      ${estimate.items
        .map(
          (item) =>
            `<li>${escapeHtml(item.name)} · ${escapeHtml(item.amount)} · ${item.estimatedCalories} kcal</li>`,
        )
        .join("")}
    </ul>
  `;
}

function renderWeightChart(dailyData) {
  const points = dailyData.filter((item) => typeof item.weightKg === "number");

  if (points.length < 2) {
    weightChart.innerHTML =
      '<text x="180" y="90" text-anchor="middle" fill="#70655c" font-size="14">至少记录两次体重后才会出现趋势线</text>';
    return;
  }

  const values = points.map((item) => item.weightKg);
  const min = Math.min(...values) - 0.4;
  const max = Math.max(...values) + 0.4;
  const coordinates = points.map((item, index) => {
    const x = 24 + (index / (points.length - 1)) * 312;
    const y = 156 - ((item.weightKg - min) / (max - min || 1)) * 120;
    return { x, y, label: item.dateKey, value: item.weightKg };
  });

  const path = coordinates.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const area = `${path} L ${coordinates[coordinates.length - 1].x} 164 L ${coordinates[0].x} 164 Z`;

  weightChart.innerHTML = `
    <defs>
      <linearGradient id="weightFill" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stop-color="rgba(229,118,59,0.32)" />
        <stop offset="100%" stop-color="rgba(229,118,59,0)" />
      </linearGradient>
    </defs>
    <path d="${area}" fill="url(#weightFill)"></path>
    <path d="${path}" fill="none" stroke="#d66f35" stroke-width="4" stroke-linecap="round"></path>
    ${coordinates
      .map(
        (point) => `
          <circle cx="${point.x}" cy="${point.y}" r="5" fill="#ffffff" stroke="#d66f35" stroke-width="3"></circle>
          <text x="${point.x}" y="176" text-anchor="middle" fill="#70655c" font-size="12">${point.label.slice(5)}</text>
        `,
      )
      .join("")}
    <text x="24" y="22" fill="#70655c" font-size="12">最高 ${max.toFixed(1)} kg</text>
    <text x="24" y="154" fill="#70655c" font-size="12">最低 ${min.toFixed(1)} kg</text>
  `;
}

function handleTimelineAction(event) {
  const button = event.target.closest("[data-edit-id]");

  if (!button) {
    return;
  }

  openEditDialog(button.dataset.editKind, button.dataset.editId);
}

function openEditDialog(kind, id) {
  const collectionName = mapKindToCollection(kind);
  const entry = state[collectionName].find((item) => item.id === id);

  if (!entry) {
    return;
  }

  editingContext = { kind, id };
  editDialogTitle.textContent = `编辑${kindLabel(kind)}`;
  editFields.innerHTML = buildEditFields(kind, entry);
  editDialog.showModal();
}

function saveEditedEntry() {
  if (!editingContext) {
    return;
  }

  const collectionName = mapKindToCollection(editingContext.kind);
  const entryIndex = state[collectionName].findIndex((item) => item.id === editingContext.id);

  if (entryIndex === -1) {
    return;
  }

  const formData = new FormData(editForm);

  if (editingContext.kind === "weight") {
    state.weightLogs[entryIndex] = {
      ...state.weightLogs[entryIndex],
      loggedAt: String(formData.get("loggedAt")),
      weightKg: Number(formData.get("weightKg")),
      isFasted: formData.get("isFasted") === "on",
      note: String(formData.get("note") || "").trim(),
    };
  }

  if (editingContext.kind === "meal") {
    const description = String(formData.get("description") || "").trim();
    const estimatedCalories = Number(formData.get("estimatedCalories"));
    state.mealLogs[entryIndex] = {
      ...state.mealLogs[entryIndex],
      loggedAt: String(formData.get("loggedAt")),
      mealType: String(formData.get("mealType")),
      description,
      estimatedCalories,
      items: estimateMealItems(description).items,
      note: String(formData.get("note") || "").trim(),
    };
  }

  if (editingContext.kind === "exercise") {
    const exerciseType = String(formData.get("exerciseType"));
    const durationMinutes = Number(formData.get("durationMinutes"));
    const weightForEstimate = latestWeight();
    state.exerciseLogs[entryIndex] = {
      ...state.exerciseLogs[entryIndex],
      loggedAt: String(formData.get("loggedAt")),
      exerciseType,
      durationMinutes,
      count: Number(formData.get("count")) || null,
      estimatedCaloriesBurned: Number(formData.get("estimatedCaloriesBurned")) ||
        estimateExerciseCalories(weightForEstimate, exerciseType, durationMinutes),
      note: String(formData.get("note") || "").trim(),
    };
  }

  saveState();
  editDialog.close();
  editingContext = null;
  render();
}

function deleteEditingEntry() {
  if (!editingContext) {
    return;
  }

  const confirmed = window.confirm("确定删除这条记录吗？删除后不能恢复。");

  if (!confirmed) {
    return;
  }

  const collectionName = mapKindToCollection(editingContext.kind);
  state[collectionName] = state[collectionName].filter((item) => item.id !== editingContext.id);
  saveState();
  editDialog.close();
  editingContext = null;
  render();
}

function buildEditFields(kind, entry) {
  if (kind === "weight") {
    return `
      <label>
        <span>记录时间</span>
        <input name="loggedAt" type="datetime-local" value="${datetimeLocalValue(entry.loggedAt)}" required />
      </label>
      <label>
        <span>体重（kg）</span>
        <input name="weightKg" type="number" min="20" max="300" step="0.1" value="${entry.weightKg}" required />
      </label>
      <label class="checkbox-row">
        <input name="isFasted" type="checkbox" ${entry.isFasted ? "checked" : ""} />
        <span>空腹测量</span>
      </label>
      <label>
        <span>备注</span>
        <input name="note" type="text" maxlength="80" value="${escapeAttribute(entry.note || "")}" />
      </label>
    `;
  }

  if (kind === "meal") {
    return `
      <label>
        <span>记录时间</span>
        <input name="loggedAt" type="datetime-local" value="${datetimeLocalValue(entry.loggedAt)}" required />
      </label>
      <label>
        <span>餐次</span>
        <select name="mealType">
          <option value="breakfast" ${entry.mealType === "breakfast" ? "selected" : ""}>早餐</option>
          <option value="lunch" ${entry.mealType === "lunch" ? "selected" : ""}>午餐</option>
          <option value="dinner" ${entry.mealType === "dinner" ? "selected" : ""}>晚餐</option>
          <option value="snack" ${entry.mealType === "snack" ? "selected" : ""}>加餐</option>
        </select>
      </label>
      <label>
        <span>描述</span>
        <textarea name="description" rows="4">${escapeHtml(entry.description || "")}</textarea>
      </label>
      <label>
        <span>热量（kcal）</span>
        <input name="estimatedCalories" type="number" min="0" max="5000" step="1" value="${entry.estimatedCalories}" required />
      </label>
      <label>
        <span>备注</span>
        <input name="note" type="text" maxlength="80" value="${escapeAttribute(entry.note || "")}" />
      </label>
    `;
  }

  return `
    <label>
      <span>记录时间</span>
      <input name="loggedAt" type="datetime-local" value="${datetimeLocalValue(entry.loggedAt)}" required />
    </label>
    <label>
      <span>运动类型</span>
      <select name="exerciseType">
        ${EXERCISE_LIBRARY.map(
          (item) =>
            `<option value="${item.type}" ${entry.exerciseType === item.type ? "selected" : ""}>${item.label}</option>`,
        ).join("")}
      </select>
    </label>
    <label>
      <span>时长（分钟）</span>
      <input name="durationMinutes" type="number" min="1" max="600" step="1" value="${entry.durationMinutes}" required />
    </label>
    <label>
      <span>次数 / 层数</span>
      <input name="count" type="number" min="0" max="5000" step="1" value="${entry.count ?? ""}" />
    </label>
    <label>
      <span>消耗热量（kcal）</span>
      <input
        name="estimatedCaloriesBurned"
        type="number"
        min="0"
        max="5000"
        step="1"
        value="${entry.estimatedCaloriesBurned}"
        required
      />
    </label>
    <label>
      <span>备注</span>
      <input name="note" type="text" maxlength="80" value="${escapeAttribute(entry.note || "")}" />
    </label>
  `;
}

function mapKindToCollection(kind) {
  return {
    weight: "weightLogs",
    meal: "mealLogs",
    exercise: "exerciseLogs",
  }[kind];
}

function kindLabel(kind) {
  return {
    weight: "体重",
    meal: "饮食",
    exercise: "运动",
  }[kind];
}

function describeEditableEntry(entry) {
  if (entry.entryKind === "weight") {
    return entry.note || "体重记录";
  }

  if (entry.entryKind === "meal") {
    return entry.description || `${mealTypeLabel(entry.mealType)}记录`;
  }

  return `${entry.durationMinutes} 分钟${entry.count ? `，数量 ${entry.count}` : ""}${entry.note ? `，${entry.note}` : ""}`;
}

function latestWeight() {
  if (!state.weightLogs.length) {
    return 70;
  }

  const latest = [...state.weightLogs].sort(
    (a, b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime(),
  )[0];

  return latest.weightKg;
}

function compareText(diff, prefix) {
  if (diff === 0) {
    return `${prefix} 持平`;
  }

  return `${prefix} ${diff > 0 ? "+" : ""}${Math.round(diff)} kcal`;
}

function formatSignedKg(value) {
  return `${value > 0 ? "+" : ""}${value.toFixed(1)} kg`;
}

function formatGoalGap(value) {
  if (value === 0) {
    return "已达到目标";
  }

  return value > 0 ? `比目标重 ${value.toFixed(1)} kg` : `比目标轻 ${Math.abs(value).toFixed(1)} kg`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("`", "&#96;");
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  }
}

async function runMealAnalysis() {
  const description = mealForm.description.value.trim();
  const photoInput = mealForm.photo;
  const photoFile = photoInput?.files?.[0];
  const photoDataUrl =
    photoFile instanceof File && photoFile.size > 0 ? await fileToDataUrl(photoFile) : "";

  if (!photoDataUrl && !description) {
    const fallback = estimateMealItems(description);
    return {
      ...fallback,
      confidence: 0.2,
    };
  }

  if (!window.location.protocol.startsWith("http")) {
    mealAiStatus.textContent = "当前是 file 模式，AI 不可用，已使用本地估算。";
    return {
      ...estimateMealItems(description),
      message: "当前不是 HTTP 访问，已使用本地估算。",
      confidence: 0.35,
    };
  }

  mealEstimatePanel.classList.add("is-loading");
  mealEstimatePanel.classList.add("is-visible");
  mealEstimatePanel.innerHTML = "<strong>识别中...</strong><p class=\"helper-text\">正在分析图片和描述。</p>";

  try {
    const response = await fetch("/api/estimate-meal", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        description,
        imageDataUrl: photoDataUrl,
        profile: state.profile,
      }),
    });

    if (!response.ok) {
      throw new Error(`request failed with ${response.status}`);
    }

    const result = await response.json();
    mealAiStatus.textContent =
      result.mode === "ai"
        ? "AI 识别已启用。"
        : "未配置 AI 或 AI 不可用，当前使用本地估算。";
    return result;
  } catch {
    mealAiStatus.textContent = "AI 请求失败，已自动回退到本地估算。";
    return {
      ...estimateMealItems(description),
      message: "AI 请求失败，已自动回退到本地估算。",
      confidence: 0.32,
    };
  }
}

async function checkAiAvailability() {
  if (!window.location.protocol.startsWith("http")) {
    mealAiStatus.textContent = "当前是 file 模式，切到本地服务后才能启用 AI。";
    return;
  }

  try {
    const response = await fetch("/api/health");
    const json = await response.json();
    mealAiStatus.textContent = json.aiEnabled
      ? "已检测到 OPENAI_API_KEY，可直接使用 AI 识别。"
      : "服务已启动，但还没配置 OPENAI_API_KEY，当前会回退到本地估算。";
  } catch {
    mealAiStatus.textContent = "未检测到本地 API 服务，当前会使用本地估算。";
  }
}

function exportData() {
  const payload = {
    exportedAt: new Date().toISOString(),
    state,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const stamp = toDateKey(new Date());
  link.href = url;
  link.download = `health-tracker-backup-${stamp}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  backupStatus.textContent = `已导出 ${stamp} 备份。`;
}

async function importData(event) {
  const file = event.target.files?.[0];

  if (!file) {
    return;
  }

  try {
    const raw = await file.text();
    const parsed = JSON.parse(raw);
    const nextState = deserializeState(JSON.stringify(parsed.state ?? parsed));
    state.profile = nextState.profile;
    state.weightLogs = nextState.weightLogs;
    state.mealLogs = nextState.mealLogs;
    state.exerciseLogs = nextState.exerciseLogs;
    saveState();
    renderProfileForm();
    render();
    backupStatus.textContent = "导入成功，当前页面数据已更新。";
  } catch {
    backupStatus.textContent = "导入失败，请确认文件格式正确。";
  } finally {
    importDataInput.value = "";
  }
}

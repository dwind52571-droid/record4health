# 数据模型草案

## 1. 设计目标

围绕“按天记录、按周月统计”的需求，第一版优先保证模型简单、可扩展、易于计算。

## 2. 核心实体

### users

用户基础信息。

建议字段：

- `id`
- `name`
- `gender`
- `birth_year`
- `height_cm`
- `goal_weight_kg`
- `created_at`
- `updated_at`

### weight_logs

每天的体重记录。

建议字段：

- `id`
- `user_id`
- `logged_at`
- `weight_kg`
- `note`
- `created_at`

说明：

- 第一版允许一天多条体重记录
- 统计时可以优先取当天第一条晨起记录，或标记 `is_fasted`

### meal_logs

每次进餐记录。

建议字段：

- `id`
- `user_id`
- `meal_type`：`breakfast | lunch | dinner | snack`
- `logged_at`
- `image_url`
- `source`：`manual | ai`
- `estimated_calories`
- `note`
- `created_at`
- `updated_at`

### meal_items

一次进餐下的食物明细。

建议字段：

- `id`
- `meal_log_id`
- `name`
- `estimated_amount`
- `amount_unit`
- `estimated_calories`
- `confidence`
- `created_at`

说明：

- AI 识别后写入该表
- 用户后续可修改名称、分量、热量

### exercise_logs

运动记录。

建议字段：

- `id`
- `user_id`
- `exercise_type`
- `duration_minutes`
- `count`
- `distance`
- `estimated_calories_burned`
- `logged_at`
- `note`
- `created_at`

### daily_summaries

可选的汇总表，用于提升查询效率。

建议字段：

- `id`
- `user_id`
- `summary_date`
- `weight_kg`
- `total_calories_in`
- `total_calories_out`
- `net_calories`
- `meal_count`
- `exercise_count`
- `updated_at`

说明：

- 第一版可以先不建实体表，先通过查询计算
- 数据量大后再考虑冗余汇总

## 3. 统计计算思路

### 今日

- 摄入 = 当天所有 `meal_logs.estimated_calories` 求和
- 消耗 = 当天所有 `exercise_logs.estimated_calories_burned` 求和
- 净值 = 摄入 - 消耗

### 每周 / 每月

- 体重均值：周期内体重平均值
- 体重变化：周期末体重 - 周期初体重
- 记录完成率：有任意记录的天数 / 周期总天数

## 4. 第一版实现建议

第一版先采用：

- 1 个用户
- 以本地时区的自然日作为统计边界
- 热量字段直接存估算结果
- 修改记录后实时重算汇总数据

## 5. 后续扩展方向

- 宏量营养素：蛋白质 / 脂肪 / 碳水
- 运动 MET 系数表
- 用户自定义食物库
- AI 识别历史纠错学习
- 健康目标和提醒系统

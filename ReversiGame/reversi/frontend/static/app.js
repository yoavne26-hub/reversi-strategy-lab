let state = null;
const preferencesApi = window.reversiPreferences;
const uiPreferences = preferencesApi
  ? preferencesApi.load()
  : {
      showLegalMoves: true,
      animationSpeed: "normal",
      theme: "classic",
      defaultDifficulty: "medium",
    };
let lastSettings = { mode: "pva", human: "black", difficulty: uiPreferences.defaultDifficulty };
let aiBusy = false;
let pendingCellAnimations = null;

const homeScreen = document.getElementById("homeScreen");
const gameScreen = document.getElementById("gameScreen");
const hudCardEl = document.querySelector(".hud-card");
const boardEl = document.getElementById("board");
const boardFrameEl = document.querySelector(".board-frame");
const statusEl = document.getElementById("status");
const turnHintEl = document.getElementById("turnHint");
const scoreBlackEl = document.getElementById("scoreBlack");
const scoreWhiteEl = document.getElementById("scoreWhite");
const postGameAnalysisEl = document.getElementById("postGameAnalysis");
const postGameSummaryEl = document.getElementById("postGameSummary");
const postGameHighlightsEl = document.getElementById("postGameHighlights");
const postGameSideAveragesEl = document.getElementById("postGameSideAverages");
const postGameGraphPickerEl = document.getElementById("postGameGraphPicker");
const postGameGraphTitleEl = document.getElementById("postGameGraphTitle");
const postGameGraphDescriptionEl = document.getElementById("postGameGraphDescription");
const postGameChartEl = document.getElementById("postGameGraphChart");
const postGameChartEmptyEl = document.getElementById("postGameGraphEmpty");
const moveTimelineEl = document.getElementById("moveTimeline");
const difficultyBadgeEl = document.getElementById("difficultyBadge");
const winOverlayEl = document.getElementById("winOverlay");
const winTitleEl = document.getElementById("winTitle");
const winSubtitleEl = document.getElementById("winSubtitle");
const winIconEl = document.getElementById("winIcon");
const winAnalyticsBtnEl = document.getElementById("winAnalyticsBtn");
const replayBannerEl = document.getElementById("replayBanner");
const replayStatusEl = document.getElementById("replayStatus");
const undoToggleRowEl = document.getElementById("undoToggleRow");
const enableUndoEl = document.getElementById("enableUndo");
const undoReplayControlsEl = document.getElementById("undoReplayControls");
const replayControlsEl = document.getElementById("replayControls");
const undoBtnEl = document.getElementById("undoBtn");
const enterReplayBtnEl = document.getElementById("enterReplayBtn");
const replayBackBtnEl = document.getElementById("replayBackBtn");
const replayForwardBtnEl = document.getElementById("replayForwardBtn");
const replayExitBtnEl = document.getElementById("replayExitBtn");
const modeGroupEl = document.getElementById("mode");
const humanColorGroupEl = document.getElementById("humanColor");
const difficultyGroupEl = document.getElementById("difficulty");
let lastRenderedHistoryLength = 0;
let winOverlayShownForGame = false;
let selectedPostGameGraph = "control";

const POSTGAME_GRAPH_CONFIG = {
  control: {
    title: "Board Control Over Time",
    description: "Shows each side's share of discs on the board after every move.",
    ariaLabel: "Board control over time",
    getSeries: (progression) => {
      const blackSeries = progression.board_control ? progression.board_control.black || [] : [];
      const whiteSeries = progression.board_control ? progression.board_control.white || [] : [];
      const fittedRange = fitMetricRange([...blackSeries, ...whiteSeries], {
        paddingRatio: 0.12,
        minVisualRange: 0.16,
        clampMin: 0,
        clampMax: 1,
        fallbackMin: 0,
        fallbackMax: 1,
      });
      return {
        moveIndex: progression.move_index || [],
        blackSeries,
        whiteSeries,
        minValue: fittedRange.min,
        maxValue: fittedRange.max,
        tickFormatter: (value) => value.toFixed(2),
        emptyText: "No board control data is available for this finished view.",
        seriesMode: "dense",
      };
    },
  },
  weighted_flips: {
    title: "Weighted Flipped Value Over Time",
    description: "This tracks the board-weight value of flipped discs on each move. Each side is plotted only on its own turns, using the shared move number axis to show when those swings happened.",
    ariaLabel: "Weighted flipped value over time",
    getSeries: (progression) => {
      const blackSeries = progression.weighted_flipped_value_by_player ? progression.weighted_flipped_value_by_player.black || [] : [];
      const whiteSeries = progression.weighted_flipped_value_by_player ? progression.weighted_flipped_value_by_player.white || [] : [];
      const allValues = [...blackSeries, ...whiteSeries, 0];
      let minValue = Math.min(...allValues);
      let maxValue = Math.max(...allValues);
      if (minValue === maxValue) {
        minValue -= 1;
        maxValue += 1;
      }
      return {
        moveIndex: progression.move_index || [],
        blackSeries,
        whiteSeries,
        minValue,
        maxValue,
        emptyText: "No weighted flip progression is available for this finished view.",
        seriesMode: "move_owned",
      };
    },
  },
  flips: {
    title: "Flipped Discs Per Move",
    description: "This shows how many discs each player flipped on their own turns. Each line connects only that side's real move points while staying anchored to the full game move numbers.",
    ariaLabel: "Flipped discs per move",
    getSeries: (progression) => {
      const blackSeries = progression.flipped_discs_by_player ? progression.flipped_discs_by_player.black || [] : [];
      const whiteSeries = progression.flipped_discs_by_player ? progression.flipped_discs_by_player.white || [] : [];
      let maxValue = Math.max(...blackSeries, ...whiteSeries, 0);
      if (maxValue === 0) maxValue = 1;
      return {
        moveIndex: progression.move_index || [],
        blackSeries,
        whiteSeries,
        minValue: 0,
        maxValue,
        emptyText: "No per-move flip counts are available for this finished view.",
        seriesMode: "move_owned",
      };
    },
  },
  flip_ratio: {
    title: "Flip Ratio to Board Over Time",
    description: "This measures how large each move's flips were relative to the occupied board after that move. Each side is shown only on the turns when it actually moved.",
    ariaLabel: "Flip ratio to board over time",
    getSeries: (progression) => {
      const blackSeries = progression.flip_ratio_to_board_by_player ? progression.flip_ratio_to_board_by_player.black || [] : [];
      const whiteSeries = progression.flip_ratio_to_board_by_player ? progression.flip_ratio_to_board_by_player.white || [] : [];
      let maxValue = Math.max(...blackSeries, ...whiteSeries, 0);
      if (maxValue === 0) maxValue = 1;
      return {
        moveIndex: progression.move_index || [],
        blackSeries,
        whiteSeries,
        minValue: 0,
        maxValue,
        tickFormatter: (value) => value.toFixed(2),
        emptyText: "No flip-ratio progression is available for this finished view.",
        seriesMode: "move_owned",
      };
    },
  },
};

function showHome() {
  homeScreen.classList.remove("hidden");
  gameScreen.classList.add("hidden");
  hideWinOverlay();
}

function showGame() {
  homeScreen.classList.add("hidden");
  gameScreen.classList.remove("hidden");
}

function hideWinOverlay() {
  if (!winOverlayEl) return;
  winOverlayEl.classList.add("hidden");
  winOverlayEl.setAttribute("aria-hidden", "true");
  winOverlayEl.classList.remove("show");
}

function showWinOverlay() {
  if (!winOverlayEl || !state || !state.game_over) return;
  const black = state.score.black;
  const white = state.score.white;
  let title = "Game Over";
  let icon = "✦";
  let theme = "draw";
  if (state.winner === 1) {
    title = "Black Wins!";
    icon = "♛";
    theme = "black";
  } else if (state.winner === -1) {
    title = "White Wins!";
    icon = "♔";
    theme = "white";
  } else if (state.winner === 0) {
    title = "Draw Game!";
    icon = "◎";
    theme = "draw";
  }

  winTitleEl.textContent = title;
  winSubtitleEl.textContent = `Final score: Black ${black} - White ${white}`;
  winIconEl.textContent = icon;
  winOverlayEl.dataset.theme = theme;
  winOverlayEl.classList.remove("hidden");
  winOverlayEl.setAttribute("aria-hidden", "false");
  winOverlayEl.classList.add("show");
}

function viewPostGameAnalytics() {
  hideWinOverlay();
  if (!postGameAnalysisEl || postGameAnalysisEl.classList.contains("hidden")) return;
  postGameAnalysisEl.scrollIntoView({ behavior: "smooth", block: "start" });
}

function getChoiceValue(groupEl) {
  const active = groupEl.querySelector(".choice.active");
  return active ? active.dataset.value : null;
}

function setChoiceValue(groupEl, value) {
  groupEl.querySelectorAll(".choice").forEach((btn) => {
    const active = btn.dataset.value === value;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-pressed", active ? "true" : "false");
  });
}

function wireChoiceGroup(groupEl, onChange) {
  groupEl.addEventListener("click", (event) => {
    const btn = event.target.closest(".choice");
    if (!btn || !groupEl.contains(btn)) return;
    if (btn.classList.contains("active")) return;
    setChoiceValue(groupEl, btn.dataset.value);
    if (onChange) onChange(btn.dataset.value);
  });
}

function computeCellAnimations(prevState, nextState) {
  if (!prevState || !nextState) return null;
  const changes = new Map();
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const before = prevState.grid[r][c];
      const after = nextState.grid[r][c];
      if (before === after) continue;
      if (before === 0 && after !== 0) {
        changes.set(`${r},${c}`, { type: "placed", from: before, to: after });
      } else if (before !== 0 && after !== 0) {
        changes.set(`${r},${c}`, { type: "flipped", from: before, to: after });
      }
    }
  }
  return changes.size ? changes : null;
}

function setState(nextState, { animate = false } = {}) {
  pendingCellAnimations = animate ? computeCellAnimations(state, nextState) : null;
  state = nextState;
}

async function postJson(path, payload = {}) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  return { res, data };
}

function currentModeIsPva() {
  if (state && state.mode) return state.mode === "pva";
  return lastSettings.mode === "pva";
}

function currentHumanColorValue() {
  if (state && typeof state.human_color === "number") return state.human_color;
  return lastSettings.human === "black" ? 1 : -1;
}

function isLegal(r, c) {
  if (!state) return false;
  return state.legal_moves.some(m => m.r === r && m.c === c);
}

function winnerText() {
  if (!state || !state.game_over) return "";
  if (state.winner === 1) return "Game Over - Black wins";
  if (state.winner === -1) return "Game Over - White wins";
  return "Game Over - Draw";
}

function shouldShowLegalMoves() {
  return !!uiPreferences.showLegalMoves;
}

function playerName(player) {
  return player === 1 ? "Black" : "White";
}

function winnerDisplayText() {
  if (!state || !state.game_over) return "";
  if (state.winner === 1) return "Black won";
  if (state.winner === -1) return "White won";
  return "Draw";
}

function formatMetricValue(value) {
  if (typeof value !== "number") return String(value ?? "");
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function renderPostGameSummaryCard(label, value) {
  const card = document.createElement("article");
  card.className = "page-card compact-card postgame-summary-card";
  card.innerHTML = `
    <p class="eyebrow">${label}</p>
    <h3>${value}</h3>
  `;
  return card;
}

function renderPostGameKvList(container, items) {
  container.innerHTML = "";
  for (const [label, value] of items) {
    const row = document.createElement("div");
    row.className = "postgame-kv-row";
    row.innerHTML = `
      <span class="postgame-kv-label">${label}</span>
      <span class="postgame-kv-value">${value}</span>
    `;
    container.appendChild(row);
  }
}

function averageNumbers(values) {
  const numeric = values.filter((value) => Number.isFinite(value));
  if (!numeric.length) return 0;
  return numeric.reduce((sum, value) => sum + value, 0) / numeric.length;
}

function formatAveragePercent(value) {
  return `${(value * 100).toFixed(1)}%`;
}

function formatAverageNumber(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function renderSideAverageColumn(title, tone, items) {
  const card = document.createElement("section");
  card.className = `postgame-side-card tone-${tone}`;
  const list = items.map(([label, value]) => `
    <div class="postgame-kv-row">
      <span class="postgame-kv-label">${label}</span>
      <span class="postgame-kv-value">${value}</span>
    </div>
  `).join("");
  card.innerHTML = `
    <div class="postgame-side-head">
      <span class="postgame-legend-swatch tone-${tone}"></span>
      <h4>${title}</h4>
    </div>
    <div class="postgame-kv-list">${list}</div>
  `;
  return card;
}

function renderPostGameSideAverages(container, progression, history) {
  if (!container) return;

  const control = progression && progression.weighted_board_control ? progression.weighted_board_control : {};
  const weightedFlips = progression && progression.weighted_flipped_value_by_player ? progression.weighted_flipped_value_by_player : {};
  const flips = progression && progression.flipped_discs_by_player ? progression.flipped_discs_by_player : {};
  const flipRatio = progression && progression.flip_ratio_to_board_by_player ? progression.flip_ratio_to_board_by_player : {};
  const moveIndex = progression && progression.move_index ? progression.move_index : [];

  const blackWeightedFlipPoints = buildSparseSeriesPoints(moveIndex, weightedFlips.black || [], history, 1);
  const whiteWeightedFlipPoints = buildSparseSeriesPoints(moveIndex, weightedFlips.white || [], history, -1);
  const blackFlipPoints = buildSparseSeriesPoints(moveIndex, flips.black || [], history, 1);
  const whiteFlipPoints = buildSparseSeriesPoints(moveIndex, flips.white || [], history, -1);
  const blackFlipRatioPoints = buildSparseSeriesPoints(moveIndex, flipRatio.black || [], history, 1);
  const whiteFlipRatioPoints = buildSparseSeriesPoints(moveIndex, flipRatio.white || [], history, -1);

  const blackItems = [
    ["Average Control", formatAveragePercent(averageNumbers(control.black || []))],
    ["Average Weighted Flips", formatAverageNumber(averageNumbers(blackWeightedFlipPoints.map((point) => point.y)))],
    ["Average Flips", formatAverageNumber(averageNumbers(blackFlipPoints.map((point) => point.y)))],
    ["Average Flip Ratio", formatAveragePercent(averageNumbers(blackFlipRatioPoints.map((point) => point.y)))],
  ];
  const whiteItems = [
    ["Average Control", formatAveragePercent(averageNumbers(control.white || []))],
    ["Average Weighted Flips", formatAverageNumber(averageNumbers(whiteWeightedFlipPoints.map((point) => point.y)))],
    ["Average Flips", formatAverageNumber(averageNumbers(whiteFlipPoints.map((point) => point.y)))],
    ["Average Flip Ratio", formatAveragePercent(averageNumbers(whiteFlipRatioPoints.map((point) => point.y)))],
  ];

  container.innerHTML = "";
  container.appendChild(renderSideAverageColumn("Black", "black", blackItems));
  container.appendChild(renderSideAverageColumn("White", "white", whiteItems));
}

function buildChartPolyline(points, width, height, padding, xMinValue, xMaxValue, minValue, maxValue) {
  if (!points.length) return "";
  if (points.length === 1) {
    const point = points[0];
    const { x, y } = chartPointPosition(point.x, width, height, padding, xMinValue, xMaxValue, point.y, minValue, maxValue);
    return `${x},${y}`;
  }
  return points
    .map((point) => {
      const { x, y } = chartPointPosition(point.x, width, height, padding, xMinValue, xMaxValue, point.y, minValue, maxValue);
      return `${x},${y}`;
    })
    .join(" ");
}

function fitMetricRange(values, {
  paddingRatio = 0.08,
  minVisualRange = 1,
  clampMin = null,
  clampMax = null,
  fallbackMin = 0,
  fallbackMax = 1,
} = {}) {
  const numeric = values.filter((value) => Number.isFinite(value));
  if (!numeric.length) {
    return { min: fallbackMin, max: fallbackMax };
  }

  let min = Math.min(...numeric);
  let max = Math.max(...numeric);
  const rawRange = max - min;
  const paddedRange = Math.max(rawRange * (1 + paddingRatio * 2), minVisualRange);
  let center = (min + max) / 2;
  min = center - paddedRange / 2;
  max = center + paddedRange / 2;

  if (clampMin !== null && min < clampMin) {
    const shift = clampMin - min;
    min += shift;
    max += shift;
  }
  if (clampMax !== null && max > clampMax) {
    const shift = max - clampMax;
    min -= shift;
    max -= shift;
  }
  if (clampMin !== null) min = Math.max(min, clampMin);
  if (clampMax !== null) max = Math.min(max, clampMax);

  if (max - min < minVisualRange) {
    const adjustment = (minVisualRange - (max - min)) / 2;
    min -= adjustment;
    max += adjustment;
    if (clampMin !== null && min < clampMin) {
      max += clampMin - min;
      min = clampMin;
    }
    if (clampMax !== null && max > clampMax) {
      min -= max - clampMax;
      max = clampMax;
    }
    if (clampMin !== null) min = Math.max(min, clampMin);
    if (clampMax !== null) max = Math.min(max, clampMax);
  }

  return { min, max };
}

function chartXPosition(xValue, width, padding, xMinValue, xMaxValue) {
  const dotRadius = 3.5;
  const edgeInset = dotRadius + 4;
  const usableWidth = width - padding.left - padding.right - edgeInset * 2;
  const xRange = xMaxValue - xMinValue;
  if (usableWidth <= 0 || xRange === 0) {
    return padding.left + (width - padding.left - padding.right) / 2;
  }
  return padding.left + edgeInset + (usableWidth * (xValue - xMinValue)) / xRange;
}

function chartPointPosition(xValue, width, height, padding, xMinValue, xMaxValue, value, minValue, maxValue) {
  const usableHeight = height - padding.top - padding.bottom;
  const range = maxValue - minValue || 1;
  const x = chartXPosition(xValue, width, padding, xMinValue, xMaxValue);
  const y = padding.top + usableHeight * (1 - ((value - minValue) / range));
  return { x, y };
}

function buildDenseSeriesPoints(moveIndex, values) {
  return moveIndex
    .map((x, index) => ({ x, y: values[index] }))
    .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
}

function buildSparseSeriesPoints(moveIndex, values, history, player) {
  return moveIndex
    .map((x, index) => {
      const move = history[index];
      if (!move || move.player !== player) return null;
      return { x, y: values[index] };
    })
    .filter((point) => point && Number.isFinite(point.x) && Number.isFinite(point.y));
}

function buildNumericTicks(minValue, maxValue, steps = 4) {
  if (minValue === maxValue) {
    return [minValue];
  }
  const ticks = [];
  for (let i = 0; i <= steps; i++) {
    ticks.push(minValue + ((maxValue - minValue) * i) / steps);
  }
  return ticks;
}

function renderDualLineChart({
  svgEl,
  emptyEl,
  moveIndex,
  blackPoints,
  whitePoints,
  minValue,
  maxValue,
  tickFormatter = (value) => formatMetricValue(value),
  emptyText = "No progression data is available for this finished view.",
}) {
  if (!svgEl || !emptyEl) return;

  if (!moveIndex.length) {
    svgEl.classList.add("hidden");
    emptyEl.classList.remove("hidden");
    emptyEl.textContent = emptyText;
    svgEl.innerHTML = "";
    return;
  }

  svgEl.classList.remove("hidden");
  emptyEl.classList.add("hidden");

  const width = 680;
  const height = 260;
  const padding = { top: 20, right: 22, bottom: 34, left: 42 };
  const ticks = buildNumericTicks(minValue, maxValue);
  const usableHeight = height - padding.top - padding.bottom;
  const xMinValue = moveIndex[0];
  const xMaxValue = moveIndex[moveIndex.length - 1];
  const lastIndex = moveIndex[moveIndex.length - 1];
  const tickLabels = moveIndex.length > 6
    ? [moveIndex[0], moveIndex[Math.floor((moveIndex.length - 1) / 2)], lastIndex]
    : moveIndex;
  const uniqueTickLabels = [...new Set(tickLabels)];

  const horizontalGrid = ticks.map((tick) => {
    const y = padding.top + usableHeight * (1 - ((tick - minValue) / ((maxValue - minValue) || 1)));
    return `<line class="postgame-grid-line" x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}"></line>
      <text class="postgame-axis-label" x="${padding.left - 10}" y="${y + 4}" text-anchor="end">${tickFormatter(tick)}</text>`;
  }).join("");

  const verticalTicks = uniqueTickLabels.map((label) => {
    const x = chartXPosition(label, width, padding, xMinValue, xMaxValue);
    return `<line class="postgame-grid-line is-vertical" x1="${x}" y1="${padding.top}" x2="${x}" y2="${height - padding.bottom}"></line>
      <text class="postgame-axis-label" x="${x}" y="${height - 10}" text-anchor="middle">${label}</text>`;
  }).join("");

  const blackPolyline = buildChartPolyline(blackPoints, width, height, padding, xMinValue, xMaxValue, minValue, maxValue);
  const whitePolyline = buildChartPolyline(whitePoints, width, height, padding, xMinValue, xMaxValue, minValue, maxValue);
  const blackDots = blackPoints.map((point) => {
    const { x, y } = chartPointPosition(point.x, width, height, padding, xMinValue, xMaxValue, point.y, minValue, maxValue);
    return `<circle class="postgame-dot tone-black" cx="${x}" cy="${y}" r="3.5"></circle>`;
  }).join("");
  const whiteDots = whitePoints.map((point) => {
    const { x, y } = chartPointPosition(point.x, width, height, padding, xMinValue, xMaxValue, point.y, minValue, maxValue);
    return `<circle class="postgame-dot tone-white" cx="${x}" cy="${y}" r="3.5"></circle>`;
  }).join("");

  svgEl.innerHTML = `
    <rect class="postgame-chart-bg" x="0" y="0" width="${width}" height="${height}" rx="18"></rect>
    ${horizontalGrid}
    ${verticalTicks}
    <polyline class="postgame-line tone-black" fill="none" points="${blackPolyline}"></polyline>
    <polyline class="postgame-line tone-white" fill="none" points="${whitePolyline}"></polyline>
    ${blackDots}
    ${whiteDots}
  `;
}

function setPostGameGraphSelection(graphKey) {
  selectedPostGameGraph = POSTGAME_GRAPH_CONFIG[graphKey] ? graphKey : "control";
  if (!postGameGraphPickerEl) return;
  postGameGraphPickerEl.querySelectorAll(".choice").forEach((btn) => {
    const active = btn.dataset.graph === selectedPostGameGraph;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-pressed", active ? "true" : "false");
  });
}

function renderSelectedPostGameChart() {
  const progression = state && state.progression_metrics;
  const graphConfig = POSTGAME_GRAPH_CONFIG[selectedPostGameGraph] || POSTGAME_GRAPH_CONFIG.control;
  if (!graphConfig || !progression || !postGameChartEl || !postGameChartEmptyEl) return;

  const chartData = graphConfig.getSeries(progression);
  const history = Array.isArray(state && state.history) ? state.history : [];
  const blackPoints = chartData.seriesMode === "move_owned"
    ? buildSparseSeriesPoints(chartData.moveIndex, chartData.blackSeries, history, 1)
    : buildDenseSeriesPoints(chartData.moveIndex, chartData.blackSeries);
  const whitePoints = chartData.seriesMode === "move_owned"
    ? buildSparseSeriesPoints(chartData.moveIndex, chartData.whiteSeries, history, -1)
    : buildDenseSeriesPoints(chartData.moveIndex, chartData.whiteSeries);
  postGameGraphTitleEl.textContent = graphConfig.title;
  postGameGraphDescriptionEl.textContent = graphConfig.description;
  postGameChartEl.setAttribute("aria-label", graphConfig.ariaLabel);

  renderDualLineChart({
    svgEl: postGameChartEl,
    emptyEl: postGameChartEmptyEl,
    moveIndex: chartData.moveIndex,
    blackPoints,
    whitePoints,
    minValue: chartData.minValue,
    maxValue: chartData.maxValue,
    tickFormatter: chartData.tickFormatter,
    emptyText: chartData.emptyText,
  });
}

function renderPostGameAnalysis() {
  if (!postGameAnalysisEl) return;

  const summary = state && state.analysis_summary;
  const progression = state && state.progression_metrics;
  const show = !!(state && state.game_over && summary);
  postGameAnalysisEl.classList.toggle("hidden", !show);
  if (!show) {
    setPostGameGraphSelection("control");
    if (postGameSummaryEl) postGameSummaryEl.innerHTML = "";
    if (postGameHighlightsEl) postGameHighlightsEl.innerHTML = "";
    if (postGameSideAveragesEl) postGameSideAveragesEl.innerHTML = "";
    if (postGameChartEl) postGameChartEl.innerHTML = "";
    return;
  }

  postGameSummaryEl.innerHTML = "";
  [
    ["Result", winnerDisplayText()],
    ["Final Score", `${state.score.black} - ${state.score.white}`],
    ["Total Moves", formatMetricValue(summary.total_moves)],
    ["Avg Flips", formatMetricValue(summary.average_flips_per_move)],
  ].forEach(([label, value]) => {
    postGameSummaryEl.appendChild(renderPostGameSummaryCard(label, value));
  });

  const positiveSwing = summary.biggest_positive_swing_move
    ? `${summary.biggest_positive_swing_move.notation} (${formatMetricValue(summary.biggest_positive_swing_move.evaluation_delta)})`
    : "None";
  const negativeSwing = summary.biggest_negative_swing_move
    ? `${summary.biggest_negative_swing_move.notation} (${formatMetricValue(summary.biggest_negative_swing_move.evaluation_delta)})`
    : "None";

  renderPostGameKvList(postGameHighlightsEl, [
    ["Winner", winnerDisplayText()],
    ["Black final score", formatMetricValue(state.score.black)],
    ["White final score", formatMetricValue(state.score.white)],
    ["Biggest positive swing", positiveSwing],
    ["Biggest negative swing", negativeSwing],
  ]);

  renderPostGameSideAverages(
    postGameSideAveragesEl,
    progression,
    Array.isArray(state.history) ? state.history : [],
  );
  renderSelectedPostGameChart();
}

function renderTimeline() {
  if (!moveTimelineEl || !state) return;
  const history = Array.isArray(state.history) ? state.history : [];
  const shouldAutoScroll = history.length > lastRenderedHistoryLength;
  moveTimelineEl.innerHTML = "";

  if (!history.length) {
    const empty = document.createElement("div");
    empty.className = "timeline-empty";
    empty.textContent = "No moves yet.";
    moveTimelineEl.appendChild(empty);
    lastRenderedHistoryLength = 0;
    return;
  }

  for (const move of history) {
    const row = document.createElement("div");
    row.className = "timeline-row";
    if (state.last_move && move.move_index === state.last_move.move_index) {
      row.classList.add("is-latest");
    }

    row.innerHTML = `
      <div class="timeline-index">${move.move_index}.</div>
      <div class="timeline-main">
        <div class="timeline-top">
          <span class="timeline-player">
            <span class="timeline-dot ${move.player === 1 ? "dot-black" : "dot-white"}"></span>
            ${playerName(move.player)}
          </span>
          <span class="timeline-notation">${move.notation}</span>
        </div>
        <div class="timeline-meta">Flipped: ${move.flipped}</div>
      </div>
    `;
    moveTimelineEl.appendChild(row);
  }

  if (shouldAutoScroll) {
    moveTimelineEl.scrollTop = moveTimelineEl.scrollHeight;
  }
  lastRenderedHistoryLength = history.length;
}

function canHumanClickCell(r, c) {
  if (!state || state.game_over) return false;
  if (state.replay_mode) return false;
  if (!isLegal(r, c)) return false;
  if (aiBusy) return false;
  if (!currentModeIsPva()) return true;
  return state.current === currentHumanColorValue();
}

function renderUndoReplayControls() {
  if (!state) return;

  const show = state.mode === "pvp" && !!state.enable_undo;
  undoReplayControlsEl.classList.toggle("hidden", !show);
  replayBannerEl.classList.toggle("hidden", !state.replay_mode);
  replayStatusEl.classList.toggle("hidden", !state.replay_mode);
  if (boardFrameEl) boardFrameEl.classList.toggle("replay-active", !!state.replay_mode);
  if (hudCardEl) hudCardEl.classList.toggle("replay-compact", !!state.replay_mode);

  if (!show) return;

  undoBtnEl.disabled = !state.can_undo || !!state.replay_mode;
  enterReplayBtnEl.disabled = !!state.replay_mode || (state.replay_total || 0) <= 1;
  replayControlsEl.classList.toggle("hidden", !state.replay_mode);

  if (state.replay_mode) {
    replayStatusEl.textContent = `Replay: ${state.replay_index + 1} / ${state.replay_total}`;
    replayBackBtnEl.disabled = state.replay_index <= 0;
    replayForwardBtnEl.disabled = state.replay_index >= (state.replay_total - 1);
  }
}

function render() {
  if (!state) return;

  scoreBlackEl.textContent = String(state.score.black);
  scoreWhiteEl.textContent = String(state.score.white);

  if (difficultyBadgeEl) {
    const showDifficulty = state.mode === "pva";
    difficultyBadgeEl.classList.toggle("hidden", !showDifficulty);
    if (showDifficulty) {
      const label = (lastSettings.difficulty || "pva").toUpperCase();
      difficultyBadgeEl.textContent = label;
    }
  }

  if (state.game_over) {
    statusEl.textContent = winnerText();
  } else {
    const turn = state.current === 1 ? "Black" : "White";
    statusEl.textContent = `Turn: ${turn}`;
  }

  boardEl.innerHTML = "";

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "cell";
      cell.setAttribute("aria-label", `Row ${r + 1}, Column ${c + 1}`);

      if (shouldShowLegalMoves() && isLegal(r, c) && !state.game_over) cell.classList.add("legal");

      const v = state.grid[r][c];
      if (v !== 0) {
        const disc = document.createElement("span");
        disc.className = "disc " + (v === 1 ? "black" : "white");
        cell.appendChild(disc);
      } else if (shouldShowLegalMoves() && isLegal(r, c) && !state.game_over) {
        const dot = document.createElement("span");
        dot.className = "legal-dot";
        cell.appendChild(dot);
      }

      const anim = pendingCellAnimations && pendingCellAnimations.get(`${r},${c}`);
      if (anim) {
        cell.classList.add("cell-anim", `cell-${anim.type}`);
        if (anim.type === "flipped") {
          if (anim.from === 1 && anim.to === -1) cell.classList.add("flip-bw");
          if (anim.from === -1 && anim.to === 1) cell.classList.add("flip-wb");
        }
      }

      if (!canHumanClickCell(r, c)) {
        cell.disabled = true;
      }

      if (state.last_move && state.last_move.r === r && state.last_move.c === c) {
        cell.classList.add("last-move");
      }

      cell.addEventListener("click", () => onCellClick(r, c));
      boardEl.appendChild(cell);
    }
  }

  pendingCellAnimations = null;
  renderTimeline();
  renderUndoReplayControls();
  renderPostGameAnalysis();

  if (state.game_over) {
    if (!winOverlayShownForGame) {
      winOverlayShownForGame = true;
      setTimeout(() => {
        if (state && state.game_over) showWinOverlay();
      }, 260);
    }
  } else {
    winOverlayShownForGame = false;
    hideWinOverlay();
  }
}

async function startNewGame(settings) {
  lastSettings = settings;
  aiBusy = false;
  winOverlayShownForGame = false;
  turnHintEl.textContent = "";
  hideWinOverlay();

  const { res, data } = await postJson("/api/new", settings);
  if (!res.ok || !data.ok) {
    turnHintEl.textContent = data.error || "Failed to start game.";
    return;
  }
  setState(data.state, { animate: false });
  showGame();
  render();

  if (currentModeIsPva() && !state.game_over && state.current !== currentHumanColorValue()) {
    turnHintEl.textContent = "Computer starts...";
    await runAiTurnWithDelay(900);
  }
}

async function onCellClick(r, c) {
  if (!state || state.game_over) return;
  if (!canHumanClickCell(r, c)) return;

  const { res, data } = await postJson("/api/move", { r, c });
  if (!res.ok) {
    setState(data.state, { animate: false });
    turnHintEl.textContent = data.error || "Illegal move.";
    render();
    return;
  }

  setState(data.state, { animate: true });
  turnHintEl.textContent = "";
  render();

  if (currentModeIsPva() && !state.game_over && state.current !== currentHumanColorValue()) {
    turnHintEl.textContent = "Computer is thinking...";
    await runAiTurnWithDelay(1100);
  }
}

async function runAiTurnWithDelay(delayMs) {
  if (!state || state.game_over || !currentModeIsPva()) return;
  if (state.current === currentHumanColorValue()) return;

  aiBusy = true;
  await new Promise((resolve) => setTimeout(resolve, delayMs));

  const { res, data } = await postJson("/api/ai", {});
  aiBusy = false;

  if (!res.ok || !data.ok) {
    if (data && data.state) {
      setState(data.state, { animate: false });
      render();
    }
    turnHintEl.textContent = (data && data.error) || "AI move failed.";
    return;
  }

  setState(data.state, { animate: true });
  turnHintEl.textContent = "";
  render();

  if (!state.game_over && state.current !== currentHumanColorValue()) {
    turnHintEl.textContent = "Computer continues...";
    await runAiTurnWithDelay(850);
  }
}

function refreshModeVisibility(modeValue) {
  const isPvA = modeValue === "pva";
  document.getElementById("humanRow").classList.toggle("hidden", !isPvA);
  document.getElementById("difficultyRow").classList.toggle("hidden", !isPvA);
  undoToggleRowEl.classList.toggle("hidden", isPvA);
  if (isPvA) enableUndoEl.checked = false;
}

document.getElementById("startBtn").addEventListener("click", () => {
  const mode = getChoiceValue(modeGroupEl);
  const human = getChoiceValue(humanColorGroupEl);
  const difficulty = getChoiceValue(difficultyGroupEl);

  const payload = mode === "pvp"
    ? { mode: "pvp", enable_undo: !!enableUndoEl.checked }
    : { mode: "pva", human, difficulty };

  startNewGame(payload).catch(() => {
    aiBusy = false;
    turnHintEl.textContent = "Failed to start game.";
  });
});

document.getElementById("quitBtn").addEventListener("click", () => {
  window.location.href = "/";
  turnHintEl.textContent = "";
});

document.getElementById("restartBtn").addEventListener("click", () => {
  startNewGame(lastSettings).catch(() => {
    aiBusy = false;
    turnHintEl.textContent = "Failed to restart game.";
  });
});

document.getElementById("winPlayAgainBtn").addEventListener("click", () => {
  startNewGame(lastSettings).catch(() => {
    aiBusy = false;
    turnHintEl.textContent = "Failed to restart game.";
  });
});

if (winAnalyticsBtnEl) {
  winAnalyticsBtnEl.addEventListener("click", () => {
    viewPostGameAnalytics();
  });
}

document.getElementById("winMenuBtn").addEventListener("click", () => {
  window.location.href = "/";
});

undoBtnEl.addEventListener("click", async () => {
  if (!state || !state.enable_undo || state.replay_mode) return;
  const { res, data } = await postJson("/api/undo", {});
  if (!res.ok || !data.ok) {
    if (data && data.state) setState(data.state, { animate: false });
    turnHintEl.textContent = (data && data.error) || "Undo failed.";
    render();
    return;
  }
  setState(data.state, { animate: false });
  turnHintEl.textContent = "";
  render();
});

enterReplayBtnEl.addEventListener("click", async () => {
  if (!state || !state.enable_undo) return;
  const { res, data } = await postJson("/api/replay/enter", {});
  if (!res.ok || !data.ok) {
    if (data && data.state) setState(data.state, { animate: false });
    turnHintEl.textContent = (data && data.error) || "Replay failed.";
    render();
    return;
  }
  setState(data.state, { animate: false });
  turnHintEl.textContent = "";
  render();
});

replayExitBtnEl.addEventListener("click", async () => {
  if (!state || !state.enable_undo) return;
  const { res, data } = await postJson("/api/replay/exit", {});
  if (!res.ok || !data.ok) {
    if (data && data.state) setState(data.state, { animate: false });
    turnHintEl.textContent = (data && data.error) || "Exit replay failed.";
    render();
    return;
  }
  setState(data.state, { animate: false });
  turnHintEl.textContent = "";
  render();
});

replayBackBtnEl.addEventListener("click", async () => {
  if (!state || !state.replay_mode) return;
  const { res, data } = await postJson("/api/replay/step", { dir: "back" });
  if (!res.ok || !data.ok) {
    if (data && data.state) setState(data.state, { animate: false });
    turnHintEl.textContent = (data && data.error) || "Replay step failed.";
    render();
    return;
  }
  setState(data.state, { animate: false });
  turnHintEl.textContent = "";
  render();
});

replayForwardBtnEl.addEventListener("click", async () => {
  if (!state || !state.replay_mode) return;
  const { res, data } = await postJson("/api/replay/step", { dir: "forward" });
  if (!res.ok || !data.ok) {
    if (data && data.state) setState(data.state, { animate: false });
    turnHintEl.textContent = (data && data.error) || "Replay step failed.";
    render();
    return;
  }
  setState(data.state, { animate: false });
  turnHintEl.textContent = "";
  render();
});

// Start at home
showHome();

wireChoiceGroup(modeGroupEl, refreshModeVisibility);
wireChoiceGroup(humanColorGroupEl);
wireChoiceGroup(difficultyGroupEl);
setChoiceValue(difficultyGroupEl, uiPreferences.defaultDifficulty);
refreshModeVisibility(getChoiceValue(modeGroupEl));

if (postGameGraphPickerEl) {
  postGameGraphPickerEl.addEventListener("click", (event) => {
    const btn = event.target.closest(".choice");
    if (!btn || !postGameGraphPickerEl.contains(btn)) return;
    if (!POSTGAME_GRAPH_CONFIG[btn.dataset.graph]) return;
    if (btn.dataset.graph === selectedPostGameGraph) return;
    setPostGameGraphSelection(btn.dataset.graph);
    if (state && state.game_over && state.analysis_summary) {
      renderSelectedPostGameChart();
    }
  });
  setPostGameGraphSelection("control");
}

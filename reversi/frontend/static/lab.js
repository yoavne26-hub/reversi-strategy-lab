const labFormEl = document.getElementById("labBenchmarkForm");
const labStrategyAEl = document.getElementById("labStrategyA");
const labStrategyBEl = document.getElementById("labStrategyB");
const labNumGamesEl = document.getElementById("labNumGames");
const labRunBtnEl = document.getElementById("labRunBtn");
const labStatusEl = document.getElementById("labStatus");
const labErrorEl = document.getElementById("labError");
const labLoadingEl = document.getElementById("labLoading");
const labLoadingTitleEl = document.getElementById("labLoadingTitle");
const labLoadingBodyEl = document.getElementById("labLoadingBody");
const labLoadingMatchupEl = document.getElementById("labLoadingMatchup");
const labLoadingGamesEl = document.getElementById("labLoadingGames");
const labLoadingEstimateEl = document.getElementById("labLoadingEstimate");
const labLoadingProgressLabelEl = document.getElementById("labLoadingProgressLabel");
const labLoadingPercentEl = document.getElementById("labLoadingPercent");
const labLoadingProgressBarEl = document.getElementById("labLoadingProgressBar");
const labLoadingEtaNoteEl = document.getElementById("labLoadingEtaNote");
const labEmptyEl = document.getElementById("labEmpty");
const labResultsEl = document.getElementById("labResults");
const labVerdictEl = document.getElementById("labVerdict");
const labPrimaryMetricsEl = document.getElementById("labPrimaryMetrics");
const labChartsSectionEl = document.getElementById("labChartsSection");
const labChartsNoteEl = document.getElementById("labChartsNote");
const labGraphPickerEl = document.getElementById("labGraphPicker");
const labGraphTitleEl = document.getElementById("labGraphTitle");
const labGraphDescriptionEl = document.getElementById("labGraphDescription");
const labGraphChartEl = document.getElementById("labGraphChart");
const labDetailsEl = document.getElementById("labDetails");
const labScoresEl = document.getElementById("labScores");
const labColorSplitEl = document.getElementById("labColorSplit");
const labFairnessEl = document.getElementById("labFairness");
const labNotesEl = document.getElementById("labNotes");
const labMetricExplanationsEl = document.getElementById("labMetricExplanations");
const labRememberedEmptyEl = document.getElementById("labRememberedEmpty");
const labRememberedWorkspaceEl = document.getElementById("labRememberedWorkspace");
const labRememberedListEl = document.getElementById("labRememberedList");
const labComparisonEmptyEl = document.getElementById("labComparisonEmpty");
const labComparisonPanelEl = document.getElementById("labComparisonPanel");
const labComparisonGraphPickerEl = document.getElementById("labComparisonGraphPicker");
const labComparisonGraphTitleEl = document.getElementById("labComparisonGraphTitle");
const labComparisonGraphDescriptionEl = document.getElementById("labComparisonGraphDescription");
const labComparisonGraphEmptyEl = document.getElementById("labComparisonGraphEmpty");
const labComparisonGraphChartEl = document.getElementById("labComparisonGraphChart");
const labRepresentativeEmptyEl = document.getElementById("labRepresentativeEmpty");
const labRepresentativePanelEl = document.getElementById("labRepresentativePanel");
const labRepresentativeSourceRowEl = document.getElementById("labRepresentativeSourceRow");
const labRepresentativeSourceEl = document.getElementById("labRepresentativeSource");
const labRepresentativeRunLabelEl = document.getElementById("labRepresentativeRunLabel");
const labRepresentativeSummaryEl = document.getElementById("labRepresentativeSummary");
const labRepresentativeGraphPickerEl = document.getElementById("labRepresentativeGraphPicker");
const labRepresentativeGraphTitleEl = document.getElementById("labRepresentativeGraphTitle");
const labRepresentativeGraphDescriptionEl = document.getElementById("labRepresentativeGraphDescription");
const labRepresentativeGraphEmptyEl = document.getElementById("labRepresentativeGraphEmpty");
const labRepresentativeGraphChartEl = document.getElementById("labRepresentativeGraphChart");
const labClearRememberedBtnEl = document.getElementById("labClearRememberedBtn");
const labRankingPanelEl = document.getElementById("labRankingPanel");
const labRankingListEl = document.getElementById("labRankingList");
const labMatrixPanelEl = document.getElementById("labMatrixPanel");
const labMatrixTableEl = document.getElementById("labMatrixTable");
const labTooltipEl = document.getElementById("labTooltip");

const STRATEGY_LABELS = {
  easy: "Easy / Random",
  medium: "Medium / Greedy",
  advanced: "Advanced / Hybrid",
  hard: "Hard / Minimax",
};

const STRATEGY_COMPLEXITY = {
  easy: 1,
  medium: 2,
  advanced: 4,
  hard: 10,
};

const LAB_METRIC_EXPLANATIONS = [
  {
    title: "Win Rate",
    body: "The share of measured games won by each strategy across the run. This is usually the clearest first signal of matchup strength.",
  },
  {
    title: "Draw Rate",
    body: "The portion of measured games that finished level. A higher draw rate usually means the matchup is tighter or more stable than the win totals alone suggest.",
  },
  {
    title: "Average Score",
    body: "The average final disc total earned by a strategy, regardless of color. It adds margin context beyond simple win counts.",
  },
  {
    title: "Average Score Differential",
    body: "The average final score gap from Strategy A's perspective. Positive favors A, negative favors B, and near zero means the matchup stayed broadly even on the board.",
  },
  {
    title: "Average Move Count",
    body: "The average number of moves played before games reached a terminal board state.",
  },
  {
    title: "Color Split",
    body: "How often each strategy played black or white. Balanced color rotation matters because Reversi does not give both sides the same opening conditions.",
  },
  {
    title: "Starting-Side Edge",
    body: "Black always moves first in Reversi. This compares black and white win rates to show whether the opening side seems to have mattered in the measured run.",
  },
];

let activeJobId = null;
let pollTimerId = null;
let selectedLabGraph = "win_rate";
let lastLabResult = null;
let rememberedLabRuns = [];
let selectedRememberedRunIds = new Set();
let selectedComparisonGraph = "win_rate";
let selectedRepresentativeGraph = "control";
let selectedRepresentativeRunId = null;
const SCORE_DIFF_EVEN_THRESHOLD = 0.5;
const LAB_REMEMBERED_RUNS_KEY = "reversi.lab.rememberedRuns";
const LAB_SELECTED_RUNS_KEY = "reversi.lab.selectedRunIds";

const LAB_GRAPH_CONFIG = {
  win_rate: {
    title: "Win Rate",
    description: "A quick view of how often each side won, plus how many runs finished level.",
    render: (result) => renderBarChart(labGraphChartEl, [
      { label: `${result.strategy_a_name} Win Rate`, value: result.strategy_a_win_rate, tone: "tone-a" },
      { label: `${result.strategy_b_name} Win Rate`, value: result.strategy_b_win_rate, tone: "tone-b" },
      { label: "Draw Rate", value: result.draw_rate, tone: "tone-draw" },
    ], { percent: true }),
  },
  avg_score: {
    title: "Average Score",
    description: "Average final disc counts across the full benchmark set, regardless of which color each strategy played.",
    render: (result) => renderBarChart(labGraphChartEl, [
      { label: `${result.strategy_a_name} Average Score`, value: result.strategy_a_average_score, tone: "tone-a" },
      { label: `${result.strategy_b_name} Average Score`, value: result.strategy_b_average_score, tone: "tone-b" },
    ]),
  },
  score_diff: {
    title: "Score Diff",
    description: "Average final score difference from Strategy A's perspective. Positive favors Strategy A, negative favors Strategy B, and near zero is effectively even.",
    render: (result) => renderSignedMetricChart(labGraphChartEl, {
      label: "Average Score Diff (A-B)",
      value: result.average_score_diff_a_minus_b,
    }),
  },
};

const LAB_COMPARISON_GRAPH_CONFIG = {
  win_rate: {
    title: "Win Rate",
    description: "Compare how often each remembered benchmark ended in Strategy A wins, Strategy B wins, or draws.",
  },
  avg_score: {
    title: "Avg Score",
    description: "Compare average final disc totals for Strategy A and Strategy B across each remembered benchmark run.",
  },
  score_diff: {
    title: "Score Diff",
    description: "Average score difference from Strategy A's perspective. Positive favors Strategy A, negative favors Strategy B, and near zero is effectively even.",
  },
};

const LAB_REPRESENTATIVE_GRAPH_CONFIG = {
  control: {
    title: "Board Control Over Time",
    description: "Shows each side's share of discs on the board after every move.",
    ariaLabel: "Representative game board control over time",
    getSeries: (progression) => ({
      moveIndex: progression.move_index || [],
      blackSeries: progression.board_control ? progression.board_control.black || [] : [],
      whiteSeries: progression.board_control ? progression.board_control.white || [] : [],
      minValue: 0,
      maxValue: 1,
      tickFormatter: (value) => value.toFixed(2),
      emptyText: "No board control data is available for this representative game.",
      seriesMode: "dense",
    }),
  },
  weighted_flips: {
    title: "Weighted Flipped Value Over Time",
    description: "This tracks the board-weight value of flipped discs on each move. Each side is plotted only on its own turns, using the shared move number axis to show when those swings happened.",
    ariaLabel: "Representative game weighted flipped value over time",
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
        emptyText: "No weighted flip progression is available for this representative game.",
        seriesMode: "move_owned",
      };
    },
  },
  flips: {
    title: "Flipped Discs Per Move",
    description: "This shows how many discs each player flipped on their own turns. Each line connects only that side's real move points while staying anchored to the full game move numbers.",
    ariaLabel: "Representative game flipped discs per move",
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
        emptyText: "No per-move flip counts are available for this representative game.",
        seriesMode: "move_owned",
      };
    },
  },
  flip_ratio: {
    title: "Flip Ratio to Board Over Time",
    description: "This measures how large each move's flips were relative to the occupied board after that move. Each side is shown only on the turns when it actually moved.",
    ariaLabel: "Representative game flip ratio to board over time",
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
        emptyText: "No flip-ratio progression is available for this representative game.",
        seriesMode: "move_owned",
      };
    },
  },
};

async function postJson(path, payload = {}) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  return { res, data };
}

async function getJson(path) {
  const res = await fetch(path);
  const data = await res.json();
  return { res, data };
}

function formatNumber(value) {
  if (typeof value !== "number") return String(value);
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function formatPercent(value) {
  if (typeof value !== "number") return String(value);
  return `${(value * 100).toFixed(1)}%`;
}

function formatSignedNumber(value) {
  if (typeof value !== "number") return String(value);
  const formatted = Number.isInteger(value) ? String(Math.abs(value)) : Math.abs(value).toFixed(2);
  if (value > 0) return `+${formatted}`;
  if (value < 0) return `-${formatted}`;
  return formatted;
}

function formatSignedPercent(value) {
  if (typeof value !== "number") return String(value);
  const formatted = `${(Math.abs(value) * 100).toFixed(1)}%`;
  if (value > 0) return `+${formatted}`;
  if (value < 0) return `-${formatted}`;
  return formatted;
}

function setLabGraphSelection(graphKey) {
  selectedLabGraph = LAB_GRAPH_CONFIG[graphKey] ? graphKey : "win_rate";
  if (!labGraphPickerEl) return;
  labGraphPickerEl.querySelectorAll(".choice").forEach((btn) => {
    const active = btn.dataset.graph === selectedLabGraph;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-pressed", active ? "true" : "false");
  });
}

function setComparisonGraphSelection(graphKey) {
  selectedComparisonGraph = LAB_COMPARISON_GRAPH_CONFIG[graphKey] ? graphKey : "win_rate";
  if (!labComparisonGraphPickerEl) return;
  labComparisonGraphPickerEl.querySelectorAll(".choice").forEach((btn) => {
    const active = btn.dataset.graph === selectedComparisonGraph;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-pressed", active ? "true" : "false");
  });
}

function setRepresentativeGraphSelection(graphKey) {
  selectedRepresentativeGraph = LAB_REPRESENTATIVE_GRAPH_CONFIG[graphKey] ? graphKey : "control";
  if (!labRepresentativeGraphPickerEl) return;
  labRepresentativeGraphPickerEl.querySelectorAll(".choice").forEach((btn) => {
    const active = btn.dataset.graph === selectedRepresentativeGraph;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-pressed", active ? "true" : "false");
  });
}

function saveRememberedRuns() {
  try {
    window.sessionStorage.setItem(LAB_REMEMBERED_RUNS_KEY, JSON.stringify(rememberedLabRuns));
  } catch (_) {}
}

function saveSelectedRememberedRunIds() {
  try {
    window.sessionStorage.setItem(LAB_SELECTED_RUNS_KEY, JSON.stringify([...selectedRememberedRunIds]));
  } catch (_) {}
}

function loadRememberedRuns() {
  try {
    const rawRuns = window.sessionStorage.getItem(LAB_REMEMBERED_RUNS_KEY);
    rememberedLabRuns = rawRuns ? JSON.parse(rawRuns) : [];
  } catch (_) {
    rememberedLabRuns = [];
  }

  try {
    const rawSelected = window.sessionStorage.getItem(LAB_SELECTED_RUNS_KEY);
    selectedRememberedRunIds = new Set(rawSelected ? JSON.parse(rawSelected) : []);
  } catch (_) {
    selectedRememberedRunIds = new Set();
  }

  const validIds = new Set(rememberedLabRuns.map((run) => run.id));
  selectedRememberedRunIds = new Set([...selectedRememberedRunIds].filter((id) => validIds.has(id)));
}

function buildRememberedRunLabel(result) {
  return `${result.strategy_a_name} vs ${result.strategy_b_name} — ${result.games_played} games`;
}

function rememberBenchmarkResult(result) {
  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    label: buildRememberedRunLabel(result),
    saved_at: new Date().toISOString(),
    result: JSON.parse(JSON.stringify(result)),
  };
  rememberedLabRuns = [entry, ...rememberedLabRuns];
  selectedRememberedRunIds = new Set([entry.id]);
  selectedRepresentativeRunId = entry.id;
  selectedComparisonGraph = "win_rate";
  selectedRepresentativeGraph = "control";
  saveRememberedRuns();
  saveSelectedRememberedRunIds();
  renderRememberedComparisons();
}

function getStrategyLabel(value) {
  return STRATEGY_LABELS[value] || value;
}

function estimateDuration(strategyA, strategyB, numGames) {
  const complexityA = STRATEGY_COMPLEXITY[strategyA] || 1;
  const complexityB = STRATEGY_COMPLEXITY[strategyB] || 1;
  const workload = ((complexityA + complexityB) / 2) * Math.max(numGames, 0);

  if (workload === 0) {
    return "Almost instant";
  }
  if (workload <= 10) {
    return "Usually under 5 seconds";
  }
  if (workload <= 28) {
    return "Usually around 5 to 15 seconds";
  }
  if (workload <= 60) {
    return "Often around 15 to 45 seconds";
  }
  if (workload <= 120) {
    return "Could take around 1 to 2 minutes";
  }
  return "Could take several minutes";
}

function formatDuration(seconds) {
  if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds < 0) {
    return "Calculating...";
  }
  if (seconds < 5) return "Under 5 seconds";
  if (seconds < 60) return `${Math.round(seconds)} seconds`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  if (minutes >= 10 || remainingSeconds === 0) {
    return `${minutes} min`;
  }
  return `${minutes} min ${remainingSeconds}s`;
}

function describeScoreDiff(delta) {
  if (delta > SCORE_DIFF_EVEN_THRESHOLD) {
    return `favored Strategy A by ${formatNumber(delta)} discs per game on average`;
  }
  if (delta < -SCORE_DIFF_EVEN_THRESHOLD) {
    return `favored Strategy B by ${formatNumber(Math.abs(delta))} discs per game on average`;
  }
  return "was effectively even on average score";
}

function describeStartingSideAdvantage(delta) {
  if (delta > 0.02) {
    return `Black moved first and had the edge by ${formatPercent(delta)}.`;
  }
  if (delta < -0.02) {
    return `White still outperformed Black by ${formatPercent(Math.abs(delta))}, despite moving second.`;
  }
  return "Starting first had little or no measurable edge in this benchmark.";
}

function setControlsDisabled(disabled) {
  labStrategyAEl.disabled = disabled;
  labStrategyBEl.disabled = disabled;
  labNumGamesEl.disabled = disabled;
  labRunBtnEl.disabled = disabled;
}

function stopPolling() {
  if (pollTimerId !== null) {
    window.clearTimeout(pollTimerId);
    pollTimerId = null;
  }
}

function renderKvList(container, items) {
  container.innerHTML = "";
  for (const [label, value] of items) {
    const row = document.createElement("div");
    row.className = "lab-kv-row";
    row.innerHTML = `
      <span class="lab-kv-label">${label}</span>
      <span class="lab-kv-value">${formatNumber(value)}</span>
    `;
    container.appendChild(row);
  }
}

function renderSummaryCard(label, value) {
  const card = document.createElement("div");
  card.className = "lab-metric-card";
  card.innerHTML = `
    <div class="lab-metric-label">${label}</div>
    <div class="lab-metric-value">${formatNumber(value)}</div>
  `;
  return card;
}

function renderNotes(container, notes) {
  container.innerHTML = "";
  for (const note of notes) {
    const item = document.createElement("div");
    item.className = "lab-note-item";
    item.textContent = note;
    container.appendChild(item);
  }
}

function renderMetricExplanations(container, items) {
  container.innerHTML = "";
  for (const item of items) {
    const card = document.createElement("div");
    card.className = "lab-explainer-item";
    card.innerHTML = `
      <h4>${item.title}</h4>
      <p>${item.body}</p>
    `;
    container.appendChild(card);
  }
}

function renderBarChart(container, items, options = {}) {
  const { percent = false } = options;
  const maxValue = items.reduce((currentMax, item) => Math.max(currentMax, item.value), 0);
  const safeMax = maxValue > 0 ? maxValue : 1;

  container.innerHTML = "";
  for (const item of items) {
    const row = document.createElement("div");
    row.className = "lab-chart-row";

    const track = document.createElement("div");
    track.className = "lab-chart-track";

    const bar = document.createElement("div");
    bar.className = `lab-chart-bar ${item.tone || ""}`.trim();
    bar.style.width = `${(Math.max(item.value, 0) / safeMax) * 100}%`;

    track.appendChild(bar);
    row.innerHTML = `
      <div class="lab-chart-topline">
        <span class="lab-chart-label">
          <span class="lab-chart-swatch ${item.tone || ""}"></span>
          ${item.label}
        </span>
        <span class="lab-chart-value">${percent ? formatPercent(item.value) : formatNumber(item.value)}</span>
      </div>
    `;
    row.appendChild(track);
    container.appendChild(row);
  }
}

function renderSignedMetricChart(container, item) {
  const magnitude = Math.min(Math.abs(item.value), 100);
  const normalizedPercent = magnitude === 0 ? 0 : Math.max(8, magnitude);
  const favorsA = item.value > SCORE_DIFF_EVEN_THRESHOLD;
  const favorsB = item.value < -SCORE_DIFF_EVEN_THRESHOLD;
  const toneClass = favorsA ? "tone-a" : favorsB ? "tone-b" : "tone-draw";
  const directionCopy = favorsA
    ? "Positive favors Strategy A"
    : favorsB
      ? "Negative favors Strategy B"
      : "Near zero is effectively even";

  container.innerHTML = `
    <div class="lab-signed-chart">
      <div class="lab-chart-topline">
        <span class="lab-chart-label">
          <span class="lab-chart-swatch ${toneClass}"></span>
          ${item.label}
        </span>
        <span class="lab-chart-value">${formatSignedNumber(item.value)}</span>
      </div>
      <div class="lab-signed-track" aria-hidden="true">
        <div class="lab-signed-midline"></div>
        <div class="lab-signed-bar ${toneClass}" style="${favorsB ? `right: 50%; width: ${normalizedPercent / 2}%` : `left: 50%; width: ${normalizedPercent / 2}%`}"></div>
      </div>
      <div class="lab-signed-footer">
        <span>Favors B</span>
        <span>${directionCopy}</span>
        <span>Favors A</span>
      </div>
    </div>
  `;
}

function renderSelectedLabGraph(result) {
  const graph = LAB_GRAPH_CONFIG[selectedLabGraph] || LAB_GRAPH_CONFIG.win_rate;
  if (!graph || !labGraphChartEl || !labGraphTitleEl || !labGraphDescriptionEl) return;
  labGraphTitleEl.textContent = graph.title;
  labGraphDescriptionEl.textContent = graph.description;
  graph.render(result);
}

function formatWinnerLabel(winner) {
  if (winner === 1) return "Black";
  if (winner === -1) return "White";
  return "Draw";
}

function getSelectedRememberedRuns() {
  return rememberedLabRuns.filter((run) => selectedRememberedRunIds.has(run.id));
}

function getRepresentativeRun(selectedRuns = getSelectedRememberedRuns()) {
  if (!selectedRuns.length) {
    selectedRepresentativeRunId = null;
    return null;
  }

  const current = selectedRuns.find((run) => run.id === selectedRepresentativeRunId);
  if (current) {
    return current;
  }

  selectedRepresentativeRunId = selectedRuns[0].id;
  return selectedRuns[0];
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildTooltipHtml(title, lines) {
  const safeTitle = escapeHtml(title);
  const safeLines = lines.map((line) => `<div>${escapeHtml(line)}</div>`).join("");
  return `<strong>${safeTitle}</strong><div class="lab-tooltip-body">${safeLines}</div>`;
}

function encodeTooltipHtml(html) {
  return encodeURIComponent(html);
}

function decodeTooltipHtml(value) {
  try {
    return decodeURIComponent(value || "");
  } catch (_) {
    return "";
  }
}

function positionLabTooltip(x, y) {
  if (!labTooltipEl) return;
  const offset = 14;
  const rect = labTooltipEl.getBoundingClientRect();
  const maxX = window.innerWidth - rect.width - 12;
  const maxY = window.innerHeight - rect.height - 12;
  const left = Math.max(12, Math.min(x + offset, maxX));
  const top = Math.max(12, Math.min(y + offset, maxY));
  labTooltipEl.style.left = `${left}px`;
  labTooltipEl.style.top = `${top}px`;
}

function showLabTooltip(target, x, y) {
  if (!labTooltipEl || !target) return;
  const html = decodeTooltipHtml(target.getAttribute("data-tooltip-html"));
  if (!html) return;
  labTooltipEl.innerHTML = html;
  labTooltipEl.classList.remove("hidden");
  labTooltipEl.setAttribute("aria-hidden", "false");
  positionLabTooltip(x, y);
}

function hideLabTooltip() {
  if (!labTooltipEl) return;
  labTooltipEl.classList.add("hidden");
  labTooltipEl.setAttribute("aria-hidden", "true");
}

function getTooltipTarget(node) {
  return node && typeof node.closest === "function" ? node.closest("[data-tooltip-html]") : null;
}

function describePerspectiveInterpretation(delta, positiveLabel, negativeLabel) {
  if (delta > SCORE_DIFF_EVEN_THRESHOLD) {
    return `Positive favors ${positiveLabel}`;
  }
  if (delta < -SCORE_DIFF_EVEN_THRESHOLD) {
    return `Negative favors ${negativeLabel}`;
  }
  return "Near zero is effectively even";
}

function renderRememberedRunList() {
  if (!labRememberedListEl) return;
  labRememberedListEl.innerHTML = "";

  for (const run of rememberedLabRuns) {
    const result = run.result || {};
    const button = document.createElement("button");
    button.type = "button";
    button.className = "lab-remembered-item";
    const active = selectedRememberedRunIds.has(run.id);
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
    button.dataset.runId = run.id;
    button.innerHTML = `
      <div class="lab-remembered-topline">
        <strong>${run.label}</strong>
      </div>
      <div class="lab-remembered-meta">
        <span>Win split ${formatPercent(result.strategy_a_win_rate || 0)} / ${formatPercent(result.strategy_b_win_rate || 0)}</span>
        <span>Score diff ${formatSignedNumber(result.average_score_diff_a_minus_b || 0)}</span>
      </div>
    `;
    labRememberedListEl.appendChild(button);
  }
}

function buildChartPolyline(points, width, height, padding, xMinValue, xMaxValue, minValue, maxValue) {
  if (!points.length) return "";
  const usableWidth = width - padding.left - padding.right;
  const usableHeight = height - padding.top - padding.bottom;
  const xRange = xMaxValue - xMinValue || 1;
  const range = maxValue - minValue || 1;
  if (points.length === 1) {
    const point = points[0];
    const x = xRange === 0
      ? padding.left + usableWidth / 2
      : padding.left + (usableWidth * (point.x - xMinValue)) / xRange;
    const y = padding.top + usableHeight * (1 - ((point.y - minValue) / range));
    return `${x},${y}`;
  }
  return points
    .map((point) => {
      const x = padding.left + (usableWidth * (point.x - xMinValue)) / xRange;
      const y = padding.top + usableHeight * (1 - ((point.y - minValue) / range));
      return `${x},${y}`;
    })
    .join(" ");
}

function chartPointPosition(xValue, width, height, padding, xMinValue, xMaxValue, value, minValue, maxValue) {
  const usableWidth = width - padding.left - padding.right;
  const usableHeight = height - padding.top - padding.bottom;
  const xRange = xMaxValue - xMinValue || 1;
  const range = maxValue - minValue || 1;
  const x = xRange === 0
    ? padding.left + usableWidth / 2
    : padding.left + (usableWidth * (xValue - xMinValue)) / xRange;
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
  tickFormatter = (value) => formatNumber(value),
  emptyText = "No progression data is available.",
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
  const usableWidth = width - padding.left - padding.right;
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
    const index = moveIndex.indexOf(label);
    const x = moveIndex.length === 1
      ? padding.left + usableWidth / 2
      : padding.left + (usableWidth * index) / (moveIndex.length - 1);
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

function getComparisonGraphSeries(selectedRuns, graphKey) {
  if (graphKey === "win_rate") {
    return {
      mode: "grouped",
      yMin: 0,
      yMax: 1,
      tickFormatter: (value) => `${Math.round(value * 100)}%`,
      series: [
        { key: "a", label: "Strategy A", tone: "tone-a", values: selectedRuns.map((run) => run.result.strategy_a_win_rate || 0) },
        { key: "b", label: "Strategy B", tone: "tone-b", values: selectedRuns.map((run) => run.result.strategy_b_win_rate || 0) },
        { key: "draw", label: "Draw", tone: "tone-draw", values: selectedRuns.map((run) => run.result.draw_rate || 0) },
      ],
    };
  }

  if (graphKey === "avg_score") {
    const values = selectedRuns.flatMap((run) => [run.result.strategy_a_average_score || 0, run.result.strategy_b_average_score || 0]);
    const yMax = Math.max(...values, 1);
    return {
      mode: "grouped",
      yMin: 0,
      yMax,
      tickFormatter: (value) => formatNumber(value),
      series: [
        { key: "a", label: "Strategy A", tone: "tone-a", values: selectedRuns.map((run) => run.result.strategy_a_average_score || 0) },
        { key: "b", label: "Strategy B", tone: "tone-b", values: selectedRuns.map((run) => run.result.strategy_b_average_score || 0) },
      ],
    };
  }

  const maxAbs = Math.max(...selectedRuns.map((run) => Math.abs(run.result.average_score_diff_a_minus_b || 0)), SCORE_DIFF_EVEN_THRESHOLD, 1);
  return {
    mode: "signed",
    yMin: -maxAbs,
    yMax: maxAbs,
    tickFormatter: (value) => formatSignedNumber(value),
    series: [
      { key: "diff", label: "Score Diff", tone: "tone-neutral", values: selectedRuns.map((run) => run.result.average_score_diff_a_minus_b || 0) },
    ],
  };
}

function buildSvgComparisonChart({ svgEl, emptyEl, runs, graphKey }) {
  if (!svgEl || !emptyEl) return;
  if (!runs.length) {
    svgEl.classList.add("hidden");
    emptyEl.classList.remove("hidden");
    svgEl.innerHTML = "";
    return;
  }

  svgEl.classList.remove("hidden");
  emptyEl.classList.add("hidden");

  const width = 760;
  const height = 340;
  const padding = { top: 22, right: 24, bottom: 90, left: 54 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const ticks = 4;
  const config = getComparisonGraphSeries(runs, graphKey);
  const range = config.yMax - config.yMin || 1;
  const groups = runs.length;
  const groupWidth = plotWidth / Math.max(groups, 1);
  const groupInnerWidth = Math.max(groupWidth * 0.72, 26);
  const zeroY = padding.top + plotHeight * (1 - ((0 - config.yMin) / range));

  const yToSvg = (value) => padding.top + plotHeight * (1 - ((value - config.yMin) / range));

  const horizontalGrid = Array.from({ length: ticks + 1 }, (_, index) => {
    const value = config.yMin + ((config.yMax - config.yMin) * index) / ticks;
    const y = yToSvg(value);
    return `
      <line class="lab-compare-grid-line" x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}"></line>
      <text class="lab-compare-axis-label" x="${padding.left - 10}" y="${y + 4}" text-anchor="end">${escapeHtml(config.tickFormatter(value))}</text>
    `;
  }).join("");

  const axisLine = config.mode === "signed"
    ? `<line class="lab-compare-zero-line" x1="${padding.left}" y1="${zeroY}" x2="${width - padding.right}" y2="${zeroY}"></line>`
    : "";

  const seriesCount = config.series.length;
  const barGap = 8;
  const totalBarGap = barGap * Math.max(seriesCount - 1, 0);
  const barWidth = Math.max((groupInnerWidth - totalBarGap) / Math.max(seriesCount, 1), 12);
  const groupBarsWidth = seriesCount * barWidth + totalBarGap;

  const bars = runs.map((run, runIndex) => {
    const groupX = padding.left + (groupWidth * runIndex) + ((groupWidth - groupInnerWidth) / 2);
    const labelX = padding.left + groupWidth * runIndex + groupWidth / 2;
    const labelLines = [run.result.strategy_a_name, "vs", run.result.strategy_b_name, `${run.result.games_played}g`];
    const labelYStart = height - padding.bottom + 18;

    const groupBars = config.series.map((series, seriesIndex) => {
      const value = series.values[runIndex];
      const x = groupX + ((groupInnerWidth - groupBarsWidth) / 2) + seriesIndex * (barWidth + barGap);
      const toneClass = config.mode === "signed"
        ? (value > SCORE_DIFF_EVEN_THRESHOLD ? "tone-a" : value < -SCORE_DIFF_EVEN_THRESHOLD ? "tone-b" : "tone-draw")
        : series.tone;
      let tooltipHtml = "";
      if (graphKey === "win_rate") {
        tooltipHtml = buildTooltipHtml(run.label, [
          `Series: ${series.label}`,
          `Rate: ${formatPercent(value)}`,
        ]);
      } else if (graphKey === "avg_score") {
        const strategyName = series.key === "a" ? run.result.strategy_a_name : run.result.strategy_b_name;
        tooltipHtml = buildTooltipHtml(run.label, [
          `Strategy: ${strategyName}`,
          `Average score: ${formatNumber(value)}`,
        ]);
      } else if (graphKey === "score_diff") {
        tooltipHtml = buildTooltipHtml(run.label, [
          `Score diff: ${formatSignedNumber(value)}`,
          describePerspectiveInterpretation(value, "Strategy A", "Strategy B"),
        ]);
      }
      const y = config.mode === "signed" ? Math.min(yToSvg(value), zeroY) : yToSvg(value);
      const barHeight = config.mode === "signed"
        ? Math.max(Math.abs(zeroY - yToSvg(value)), 2)
        : Math.max((height - padding.bottom) - yToSvg(value), 2);
      const rectY = config.mode === "signed" ? y : yToSvg(value);
      return `<rect class="lab-compare-bar ${toneClass} lab-tooltip-target" tabindex="0" data-tooltip-html="${encodeTooltipHtml(tooltipHtml)}" x="${x}" y="${rectY}" width="${barWidth}" height="${barHeight}" rx="8"></rect>`;
    }).join("");

    const groupLabel = labelLines.map((line, idx) => `
      <text class="lab-compare-x-label" x="${labelX}" y="${labelYStart + idx * 14}" text-anchor="middle">${escapeHtml(line)}</text>
    `).join("");

    return `${groupBars}${groupLabel}`;
  }).join("");

  svgEl.innerHTML = `
    <rect class="lab-compare-bg" x="0" y="0" width="${width}" height="${height}" rx="18"></rect>
    ${horizontalGrid}
    ${axisLine}
    ${bars}
  `;
}

function computeMeasuredRanking() {
  const aggregate = new Map();

  for (const run of rememberedLabRuns) {
    const result = run.result;
    const entries = [
      {
        name: result.strategy_a_name,
        wins: result.strategy_a_wins || 0,
        losses: result.strategy_b_wins || 0,
        scoreDiff: result.average_score_diff_a_minus_b || 0,
        winRate: result.strategy_a_win_rate || 0,
      },
      {
        name: result.strategy_b_name,
        wins: result.strategy_b_wins || 0,
        losses: result.strategy_a_wins || 0,
        scoreDiff: -(result.average_score_diff_a_minus_b || 0),
        winRate: result.strategy_b_win_rate || 0,
      },
    ];

    for (const entry of entries) {
      if (!aggregate.has(entry.name)) {
        aggregate.set(entry.name, {
          name: entry.name,
          matchups: 0,
          wins: 0,
          losses: 0,
          scoreDiffTotal: 0,
          winRateTotal: 0,
        });
      }
      const current = aggregate.get(entry.name);
      current.matchups += 1;
      current.wins += entry.wins;
      current.losses += entry.losses;
      current.scoreDiffTotal += entry.scoreDiff;
      current.winRateTotal += entry.winRate;
    }
  }

  return [...aggregate.values()]
    .map((item) => ({
      ...item,
      average_score_diff: item.matchups ? item.scoreDiffTotal / item.matchups : 0,
      average_win_rate: item.matchups ? item.winRateTotal / item.matchups : 0,
    }))
    .sort((a, b) => {
      if (b.average_win_rate !== a.average_win_rate) return b.average_win_rate - a.average_win_rate;
      if (b.average_score_diff !== a.average_score_diff) return b.average_score_diff - a.average_score_diff;
      return b.wins - a.wins;
    });
}

function renderRankingSummary() {
  if (!labRankingPanelEl || !labRankingListEl) return;
  const ranking = computeMeasuredRanking();
  const hasRanking = ranking.length > 0;
  labRankingPanelEl.classList.toggle("hidden", !hasRanking);
  if (!hasRanking) {
    labRankingListEl.innerHTML = "";
    return;
  }

  labRankingListEl.innerHTML = ranking.map((item, index) => `
    <div class="lab-ranking-row">
      <div class="lab-ranking-rank">${index + 1}</div>
      <div class="lab-ranking-main">
        <div class="lab-ranking-topline">
          <strong>${escapeHtml(item.name)}</strong>
          <span>${formatPercent(item.average_win_rate)} avg win rate</span>
        </div>
        <div class="lab-ranking-meta">
          <span>${item.matchups} remembered matchups</span>
          <span>${item.wins} total wins</span>
          <span>${item.losses} total losses</span>
          <span>${formatSignedNumber(item.average_score_diff)} avg score diff</span>
        </div>
      </div>
    </div>
  `).join("");
}

function computePairwiseMatrix() {
  const pairSums = new Map();
  const strategies = new Set();

  const addCell = (rowName, columnName, value) => {
    const key = `${rowName}:::${columnName}`;
    if (!pairSums.has(key)) {
      pairSums.set(key, { sum: 0, count: 0 });
    }
    const current = pairSums.get(key);
    current.sum += value;
    current.count += 1;
  };

  for (const run of rememberedLabRuns) {
    const result = run.result;
    const rowA = result.strategy_a_name;
    const rowB = result.strategy_b_name;
    const diff = result.average_score_diff_a_minus_b || 0;
    strategies.add(rowA);
    strategies.add(rowB);
    addCell(rowA, rowB, diff);
    addCell(rowB, rowA, -diff);
  }

  const rankedNames = computeMeasuredRanking().map((item) => item.name);
  const orderedStrategies = [
    ...rankedNames,
    ...[...strategies].filter((name) => !rankedNames.includes(name)).sort(),
  ];

  const maxAbs = Math.max(
    ...[...pairSums.values()].map((item) => Math.abs(item.sum / item.count)),
    SCORE_DIFF_EVEN_THRESHOLD,
  );

  return { pairSums, orderedStrategies, maxAbs };
}

function renderPairwiseMatrix() {
  if (!labMatrixPanelEl || !labMatrixTableEl) return;

  const { pairSums, orderedStrategies, maxAbs } = computePairwiseMatrix();
  const hasStrategies = orderedStrategies.length > 0;
  labMatrixPanelEl.classList.toggle("hidden", !hasStrategies);
  if (!hasStrategies) {
    labMatrixTableEl.innerHTML = "";
    return;
  }

  const headerCells = orderedStrategies.map((name) => `<th scope="col">${escapeHtml(name)}</th>`).join("");
  const rows = orderedStrategies.map((rowName) => {
    const cells = orderedStrategies.map((columnName) => {
      if (rowName === columnName) {
        return `<td class="lab-matrix-cell is-diagonal">—</td>`;
      }

      const key = `${rowName}:::${columnName}`;
      const stats = pairSums.get(key);
      if (!stats) {
        return `<td class="lab-matrix-cell is-empty"><span>No data</span></td>`;
      }

      const average = stats.sum / stats.count;
      const intensity = Math.min(Math.abs(average) / maxAbs, 1);
      let fillColor = `rgba(255, 255, 255, ${0.08 + intensity * 0.12})`;
      let stateClass = "is-neutral";
      if (average > SCORE_DIFF_EVEN_THRESHOLD) {
        fillColor = `rgba(43, 209, 126, ${0.12 + intensity * 0.34})`;
        stateClass = "is-positive";
      } else if (average < -SCORE_DIFF_EVEN_THRESHOLD) {
        fillColor = `rgba(93, 179, 255, ${0.12 + intensity * 0.34})`;
        stateClass = "is-negative";
      }
      const tooltipHtml = buildTooltipHtml(`${rowName} vs ${columnName}`, [
        `Average score diff: ${formatSignedNumber(average)}`,
        `Remembered runs: ${stats.count}`,
        describePerspectiveInterpretation(average, rowName, columnName),
      ]);

      return `
        <td class="lab-matrix-cell ${stateClass} lab-tooltip-target" tabindex="0" data-tooltip-html="${encodeTooltipHtml(tooltipHtml)}" style="background:${fillColor}">
          <strong>${formatSignedNumber(average)}</strong>
          <span>${stats.count} run${stats.count === 1 ? "" : "s"}</span>
        </td>
      `;
    }).join("");

    return `
      <tr>
        <th scope="row">${escapeHtml(rowName)}</th>
        ${cells}
      </tr>
    `;
  }).join("");

  labMatrixTableEl.innerHTML = `
    <table class="lab-matrix">
      <thead>
        <tr>
          <th scope="col">Row \ Col</th>
          ${headerCells}
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

function renderSelectedComparisonGraph() {
  const graph = LAB_COMPARISON_GRAPH_CONFIG[selectedComparisonGraph] || LAB_COMPARISON_GRAPH_CONFIG.win_rate;
  const selectedRuns = getSelectedRememberedRuns();
  if (!labComparisonGraphChartEl || !labComparisonGraphTitleEl || !labComparisonGraphDescriptionEl || !labComparisonGraphEmptyEl) return;

  labComparisonGraphTitleEl.textContent = graph.title;
  labComparisonGraphDescriptionEl.textContent = graph.description;
  labComparisonGraphChartEl.setAttribute("aria-label", `${graph.title} comparison across remembered benchmark runs`);
  buildSvgComparisonChart({
    svgEl: labComparisonGraphChartEl,
    emptyEl: labComparisonGraphEmptyEl,
    runs: selectedRuns,
    graphKey: selectedComparisonGraph,
  });
}

function renderRepresentativeSummary(sampleGame) {
  if (!labRepresentativeSummaryEl) return;
  labRepresentativeSummaryEl.innerHTML = "";
  [
    ["Winner", formatWinnerLabel(sampleGame.winner)],
    ["Final Score", `${sampleGame.black_score} - ${sampleGame.white_score}`],
    ["Move Count", sampleGame.move_count],
  ].forEach(([label, value]) => {
    labRepresentativeSummaryEl.appendChild(renderSummaryCard(label, value));
  });
}

function renderRepresentativeSourceSelector(selectedRuns, representativeRun) {
  if (!labRepresentativeSourceRowEl || !labRepresentativeSourceEl) return;

  const showSelector = selectedRuns.length > 1;
  labRepresentativeSourceRowEl.classList.toggle("hidden", !showSelector);
  if (!showSelector) {
    labRepresentativeSourceEl.innerHTML = "";
    return;
  }

  labRepresentativeSourceEl.innerHTML = selectedRuns.map((run) => `
    <option value="${escapeHtml(run.id)}">${escapeHtml(run.label)}</option>
  `).join("");
  labRepresentativeSourceEl.value = representativeRun ? representativeRun.id : "";
}

function renderSelectedRepresentativeGraph(run) {
  const sampleGame = run && run.result ? run.result.sample_game : null;
  const progression = sampleGame ? sampleGame.progression_metrics || {} : {};
  const history = sampleGame && Array.isArray(sampleGame.history) ? sampleGame.history : [];
  const graph = LAB_REPRESENTATIVE_GRAPH_CONFIG[selectedRepresentativeGraph] || LAB_REPRESENTATIVE_GRAPH_CONFIG.control;
  if (
    !graph
    || !labRepresentativeGraphChartEl
    || !labRepresentativeGraphEmptyEl
    || !labRepresentativeGraphTitleEl
    || !labRepresentativeGraphDescriptionEl
  ) {
    return;
  }

  labRepresentativeGraphTitleEl.textContent = graph.title;
  labRepresentativeGraphDescriptionEl.textContent = graph.description;
  labRepresentativeGraphChartEl.setAttribute("aria-label", graph.ariaLabel);

  const chartData = graph.getSeries(progression);
  const blackPoints = chartData.seriesMode === "move_owned"
    ? buildSparseSeriesPoints(chartData.moveIndex, chartData.blackSeries, history, 1)
    : buildDenseSeriesPoints(chartData.moveIndex, chartData.blackSeries);
  const whitePoints = chartData.seriesMode === "move_owned"
    ? buildSparseSeriesPoints(chartData.moveIndex, chartData.whiteSeries, history, -1)
    : buildDenseSeriesPoints(chartData.moveIndex, chartData.whiteSeries);

  renderDualLineChart({
    svgEl: labRepresentativeGraphChartEl,
    emptyEl: labRepresentativeGraphEmptyEl,
    moveIndex: chartData.moveIndex,
    blackPoints,
    whitePoints,
    minValue: chartData.minValue,
    maxValue: chartData.maxValue,
    tickFormatter: chartData.tickFormatter,
    emptyText: chartData.emptyText,
  });
}

function renderRepresentativeGameSection() {
  if (!labRepresentativeEmptyEl || !labRepresentativePanelEl) return;

  const selectedRuns = getSelectedRememberedRuns();
  const representativeRun = getRepresentativeRun(selectedRuns);
  if (!representativeRun) {
    labRepresentativeEmptyEl.classList.remove("hidden");
    labRepresentativePanelEl.classList.add("hidden");
    if (labRepresentativeSourceEl) labRepresentativeSourceEl.innerHTML = "";
    if (labRepresentativeSourceRowEl) labRepresentativeSourceRowEl.classList.add("hidden");
    if (labRepresentativeSummaryEl) labRepresentativeSummaryEl.innerHTML = "";
    if (labRepresentativeGraphChartEl) labRepresentativeGraphChartEl.innerHTML = "";
    labRepresentativeEmptyEl.innerHTML = `
      <h3>Representative Game Breakdown</h3>
      <p>Select a remembered benchmark run above to inspect one measured example game from that batch, with move-by-move progression graphs.</p>
    `;
    return;
  }

  const sampleGame = representativeRun.result ? representativeRun.result.sample_game : null;
  if (!sampleGame || !sampleGame.progression_metrics) {
    labRepresentativeEmptyEl.classList.remove("hidden");
    labRepresentativePanelEl.classList.add("hidden");
    if (labRepresentativeSourceEl) labRepresentativeSourceEl.innerHTML = "";
    if (labRepresentativeSourceRowEl) labRepresentativeSourceRowEl.classList.add("hidden");
    if (labRepresentativeSummaryEl) labRepresentativeSummaryEl.innerHTML = "";
    if (labRepresentativeGraphChartEl) labRepresentativeGraphChartEl.innerHTML = "";
    labRepresentativeEmptyEl.innerHTML = `
      <h3>Representative Game Breakdown</h3>
      <p>This remembered benchmark run does not include representative move-by-move progression data.</p>
    `;
    return;
  }

  labRepresentativeEmptyEl.classList.add("hidden");
  labRepresentativePanelEl.classList.remove("hidden");
  renderRepresentativeSourceSelector(selectedRuns, representativeRun);
  setRepresentativeGraphSelection(selectedRepresentativeGraph);
  if (labRepresentativeRunLabelEl) {
    labRepresentativeRunLabelEl.textContent = `Showing one measured sample game from: ${representativeRun.label}.`;
  }
  renderRepresentativeSummary(sampleGame);
  renderSelectedRepresentativeGraph(representativeRun);
}

function renderRememberedComparisons() {
  if (!labRememberedEmptyEl || !labRememberedWorkspaceEl || !labComparisonEmptyEl || !labComparisonPanelEl) return;

  const hasRuns = rememberedLabRuns.length > 0;
  labRememberedEmptyEl.classList.toggle("hidden", hasRuns);
  labRememberedWorkspaceEl.classList.toggle("hidden", !hasRuns);
  if (labClearRememberedBtnEl) {
    labClearRememberedBtnEl.classList.toggle("hidden", !hasRuns);
  }

  if (!hasRuns) {
    if (labRememberedListEl) labRememberedListEl.innerHTML = "";
    if (labComparisonGraphChartEl) labComparisonGraphChartEl.innerHTML = "";
    if (labRankingListEl) labRankingListEl.innerHTML = "";
    if (labRankingPanelEl) labRankingPanelEl.classList.add("hidden");
    if (labMatrixTableEl) labMatrixTableEl.innerHTML = "";
    if (labMatrixPanelEl) labMatrixPanelEl.classList.add("hidden");
    selectedRepresentativeRunId = null;
    if (labRepresentativeSummaryEl) labRepresentativeSummaryEl.innerHTML = "";
    if (labRepresentativeGraphChartEl) labRepresentativeGraphChartEl.innerHTML = "";
    if (labRepresentativePanelEl) labRepresentativePanelEl.classList.add("hidden");
    if (labRepresentativeEmptyEl) labRepresentativeEmptyEl.classList.remove("hidden");
    return;
  }

  renderRememberedRunList();
  renderRankingSummary();
  renderPairwiseMatrix();

  const selectedRuns = getSelectedRememberedRuns();
  const hasSelection = selectedRuns.length > 0;
  labComparisonEmptyEl.classList.toggle("hidden", hasSelection);
  labComparisonPanelEl.classList.toggle("hidden", !hasSelection);

  if (hasSelection) {
    setComparisonGraphSelection(selectedComparisonGraph);
    renderSelectedComparisonGraph();
  } else if (labComparisonGraphChartEl) {
    labComparisonGraphChartEl.innerHTML = "";
  }
  renderRepresentativeGameSection();
}

function buildVerdict(result) {
  if (result.strategy_a_wins > result.strategy_b_wins) {
    return {
      theme: "ahead",
      title: `${result.strategy_a_name} performed better`,
      body: `Strategy A finished with more match wins. On score, the matchup ${describeScoreDiff(result.average_score_diff_a_minus_b)}.`,
    };
  }
  if (result.strategy_b_wins > result.strategy_a_wins) {
    return {
      theme: "behind",
      title: `${result.strategy_b_name} performed better`,
      body: `Strategy B finished with more match wins. On score, the matchup ${describeScoreDiff(result.average_score_diff_a_minus_b)}.`,
    };
  }
  if (result.average_score_diff_a_minus_b > SCORE_DIFF_EVEN_THRESHOLD) {
    return {
      theme: "balanced",
      title: "Wins were level, but Strategy A had the edge",
      body: `The benchmark finished even on wins, but Strategy A outscored Strategy B by ${formatNumber(result.average_score_diff_a_minus_b)} on average.`,
    };
  }
  if (result.average_score_diff_a_minus_b < -SCORE_DIFF_EVEN_THRESHOLD) {
    return {
      theme: "balanced",
      title: "Wins were level, but Strategy B had the edge",
      body: `The benchmark finished even on wins, but Strategy B outscored Strategy A by ${formatNumber(Math.abs(result.average_score_diff_a_minus_b))} on average.`,
    };
  }
  return {
    theme: "balanced",
    title: "The benchmark finished evenly",
    body: "Neither side established a meaningful edge across repeated headless games.",
  };
}

function renderResults(result) {
  lastLabResult = result;
  setLabGraphSelection("win_rate");
  const verdict = buildVerdict(result);
  labVerdictEl.className = `lab-verdict ${verdict.theme}`;
  labVerdictEl.innerHTML = `
    <div class="lab-verdict-label">Benchmark Verdict</div>
    <h3>${verdict.title}</h3>
    <p>${verdict.body}</p>
  `;

  labPrimaryMetricsEl.innerHTML = "";
  [
    ["Strategy A Win Rate", formatPercent(result.strategy_a_win_rate)],
    ["Strategy B Win Rate", formatPercent(result.strategy_b_win_rate)],
    ["Draw Rate", formatPercent(result.draw_rate)],
    ["Avg Score Diff (A-B)", formatSignedNumber(result.average_score_diff_a_minus_b)],
    ["Average Move Count", result.average_move_count],
  ].forEach(([label, value]) => {
    labPrimaryMetricsEl.appendChild(renderSummaryCard(label, value));
  });

  const shouldShowCharts = result.games_played > 15;
  labChartsSectionEl.classList.toggle("hidden", !shouldShowCharts);
  labChartsNoteEl.classList.toggle("hidden", shouldShowCharts);
  if (shouldShowCharts) {
    renderSelectedLabGraph(result);
  } else {
    if (labGraphChartEl) labGraphChartEl.innerHTML = "";
    labChartsNoteEl.innerHTML = `
      <h3>Charts unlock on larger batches</h3>
      <p>Visual comparisons appear once the benchmark reaches 16+ games, where percentage differences are usually more informative.</p>
    `;
  }

  renderKvList(labDetailsEl, [
    ["Games Played", result.games_played],
    ["Strategy A", result.strategy_a_name],
    ["Strategy B", result.strategy_b_name],
    ["Strategy A Wins", result.strategy_a_wins],
    ["Strategy B Wins", result.strategy_b_wins],
    ["Draws", result.draws],
  ]);

  renderKvList(labScoresEl, [
    ["Strategy A Average Score", result.strategy_a_average_score],
    ["Strategy B Average Score", result.strategy_b_average_score],
  ]);

  renderKvList(labColorSplitEl, [
    ["Strategy A as Black", result.color_split.strategy_a_as_black],
    ["Strategy A as White", result.color_split.strategy_a_as_white],
    ["Strategy B as Black", result.color_split.strategy_b_as_black],
    ["Strategy B as White", result.color_split.strategy_b_as_white],
  ]);

  renderKvList(labFairnessEl, [
    ["Black Win Rate", formatPercent(result.black_win_rate)],
    ["White Win Rate", formatPercent(result.white_win_rate)],
    ["Starting-Side Edge", formatSignedPercent(result.starting_side_advantage)],
  ]);

  renderNotes(labNotesEl, [
    result.games_played > 1
      ? "Colors rotate across the run, so neither strategy keeps the opening advantage throughout the full measurement set."
      : "This run contains one measured game, so color rotation did not occur. Use the fairness panel as context rather than as a strong conclusion.",
    "Score difference is always shown from Strategy A's perspective: positive favors A, negative favors B, and near zero is effectively even.",
    describeStartingSideAdvantage(result.starting_side_advantage),
    result.games_played > 1
      ? "These values come from repeated headless games, not a single showcase result."
      : "These values come from one measured headless game, so treat them as directional rather than stable.",
  ]);

  renderMetricExplanations(labMetricExplanationsEl, LAB_METRIC_EXPLANATIONS);

  labLoadingEl.classList.add("hidden");
  labEmptyEl.classList.add("hidden");
  labErrorEl.classList.add("hidden");
  labResultsEl.classList.remove("hidden");
}

function showLoadingState(payload) {
  lastLabResult = null;
  const strategyALabel = getStrategyLabel(payload.strategy_a);
  const strategyBLabel = getStrategyLabel(payload.strategy_b);

  labLoadingTitleEl.textContent = `${strategyALabel} vs ${strategyBLabel}`;
  labLoadingBodyEl.textContent = "Starting benchmark job. Progress updates will appear as each simulated game finishes.";
  labLoadingMatchupEl.textContent = `${strategyALabel} vs ${strategyBLabel}`;
  labLoadingGamesEl.textContent = formatNumber(payload.num_games);
  labLoadingEstimateEl.textContent = "Calculating...";
  labLoadingProgressLabelEl.textContent = `Completed 0 / ${formatNumber(payload.num_games)} games`;
  labLoadingPercentEl.textContent = "0%";
  labLoadingProgressBarEl.style.width = "0%";
  labLoadingEtaNoteEl.textContent = `ETA will appear after the first completed game. Before that, the best honest estimate is that ${estimateDuration(payload.strategy_a, payload.strategy_b, payload.num_games).toLowerCase()}.`;

  labLoadingEl.classList.remove("hidden");
  labErrorEl.classList.add("hidden");
  labEmptyEl.classList.add("hidden");
  labResultsEl.classList.add("hidden");
}

function updateLoadingFromJob(job) {
  const strategyALabel = getStrategyLabel(job.strategy_a);
  const strategyBLabel = getStrategyLabel(job.strategy_b);
  const percent = Math.max(0, Math.min(100, job.progress_percent || 0));

  labLoadingTitleEl.textContent = `${strategyALabel} vs ${strategyBLabel}`;
  labLoadingMatchupEl.textContent = `${strategyALabel} vs ${strategyBLabel}`;
  labLoadingGamesEl.textContent = formatNumber(job.total_games);
  labLoadingProgressLabelEl.textContent = `Completed ${formatNumber(job.completed_games)} / ${formatNumber(job.total_games)} games`;
  labLoadingPercentEl.textContent = `${Math.round(percent)}%`;
  labLoadingProgressBarEl.style.width = `${percent}%`;

  if (job.status === "pending") {
    labLoadingBodyEl.textContent = "Preparing the benchmark worker.";
  } else if (job.status === "running") {
    labLoadingBodyEl.textContent = "Running repeated headless games. Progress advances after each completed simulation.";
  } else if (job.status === "completed") {
    labLoadingBodyEl.textContent = "Benchmark finished. Fetching the final aggregate result.";
  } else if (job.status === "failed") {
    labLoadingBodyEl.textContent = "The benchmark job failed before completion.";
  }

  if (job.completed_games > 0 && typeof job.estimated_remaining_seconds === "number") {
    labLoadingEstimateEl.textContent = formatDuration(job.estimated_remaining_seconds);
    labLoadingEtaNoteEl.textContent = "ETA is based on elapsed time and the pace of completed games so far.";
  } else {
    labLoadingEstimateEl.textContent = "Calculating...";
    labLoadingEtaNoteEl.textContent = "ETA will appear after the first completed game, once the benchmark has a real measured pace.";
  }
}

function showBenchmarkError(message) {
  stopPolling();
  activeJobId = null;
  lastLabResult = null;
  labLoadingEl.classList.add("hidden");
  labResultsEl.classList.add("hidden");
  labEmptyEl.classList.remove("hidden");
  labErrorEl.textContent = message || "Benchmark failed.";
  labErrorEl.classList.remove("hidden");
  labStatusEl.textContent = "";
  setControlsDisabled(false);
}

async function fetchBenchmarkResult(jobId) {
  const { res, data } = await getJson(`/api/lab/benchmark/result/${jobId}`);
  if (!res.ok || !data.ok) {
    throw new Error((data && data.error) || "Benchmark result retrieval failed.");
  }
  if (jobId !== activeJobId) return;
  renderResults(data.result);
  rememberBenchmarkResult(data.result);
  labStatusEl.textContent = "Benchmark complete.";
  stopPolling();
  activeJobId = null;
  setControlsDisabled(false);
}

async function pollBenchmarkStatus(jobId) {
  try {
    const { res, data } = await getJson(`/api/lab/benchmark/status/${jobId}`);
    if (!res.ok || !data.ok) {
      throw new Error((data && data.error) || "Unable to read benchmark progress.");
    }
    if (jobId !== activeJobId) return;

    const job = data.job;
    updateLoadingFromJob(job);
    labStatusEl.textContent = `Running benchmark: ${formatNumber(job.completed_games)} / ${formatNumber(job.total_games)} games completed.`;

    if (job.status === "completed") {
      await fetchBenchmarkResult(jobId);
      return;
    }
    if (job.status === "failed") {
      throw new Error(job.error || "Benchmark failed.");
    }

    pollTimerId = window.setTimeout(() => {
      pollBenchmarkStatus(jobId).catch((error) => {
        showBenchmarkError(error.message);
      });
    }, 500);
  } catch (error) {
    if (jobId !== activeJobId) return;
    showBenchmarkError(error.message);
  }
}

async function onBenchmarkSubmit(event) {
  event.preventDefault();
  stopPolling();
  activeJobId = null;
  labStatusEl.textContent = "Starting benchmark job...";
  labErrorEl.classList.add("hidden");

  const payload = {
    strategy_a: labStrategyAEl.value,
    strategy_b: labStrategyBEl.value,
    num_games: Number(labNumGamesEl.value),
  };

  if (!Number.isInteger(payload.num_games) || payload.num_games < 1) {
    showBenchmarkError("Please enter at least 1 game.");
    return;
  }

  setControlsDisabled(true);
  showLoadingState(payload);

  try {
    const { res, data } = await postJson("/api/lab/benchmark/start", payload);
    if (!res.ok || !data.ok) {
      throw new Error((data && data.error) || "Benchmark failed.");
    }
    activeJobId = data.job_id;
    updateLoadingFromJob(data.job);
    await pollBenchmarkStatus(activeJobId);
  } catch (error) {
    showBenchmarkError(error.message);
  }
}

if (labFormEl) {
  labFormEl.addEventListener("submit", onBenchmarkSubmit);
}

if (labGraphPickerEl) {
  labGraphPickerEl.addEventListener("click", (event) => {
    const btn = event.target.closest(".choice");
    if (!btn || !labGraphPickerEl.contains(btn)) return;
    if (btn.dataset.graph === selectedLabGraph) return;
    setLabGraphSelection(btn.dataset.graph);
    if (lastLabResult && lastLabResult.games_played > 15) renderSelectedLabGraph(lastLabResult);
  });
}

if (labRememberedListEl) {
  labRememberedListEl.addEventListener("click", (event) => {
    const btn = event.target.closest(".lab-remembered-item");
    if (!btn || !labRememberedListEl.contains(btn)) return;
    const runId = btn.dataset.runId;
    if (!runId) return;
    if (selectedRememberedRunIds.has(runId)) {
      selectedRememberedRunIds.delete(runId);
    } else {
      selectedRememberedRunIds.add(runId);
    }
    saveSelectedRememberedRunIds();
    renderRememberedComparisons();
  });
}

if (labComparisonGraphPickerEl) {
  labComparisonGraphPickerEl.addEventListener("click", (event) => {
    const btn = event.target.closest(".choice");
    if (!btn || !labComparisonGraphPickerEl.contains(btn)) return;
    if (btn.dataset.graph === selectedComparisonGraph) return;
    setComparisonGraphSelection(btn.dataset.graph);
    renderSelectedComparisonGraph();
  });
}

if (labRepresentativeGraphPickerEl) {
  labRepresentativeGraphPickerEl.addEventListener("click", (event) => {
    const btn = event.target.closest(".choice");
    if (!btn || !labRepresentativeGraphPickerEl.contains(btn)) return;
    if (btn.dataset.graph === selectedRepresentativeGraph) return;
    setRepresentativeGraphSelection(btn.dataset.graph);
    const representativeRun = getSelectedRememberedRuns()[0];
    if (representativeRun) {
      renderSelectedRepresentativeGraph(representativeRun);
    }
  });
}

if (labRepresentativeSourceEl) {
  labRepresentativeSourceEl.addEventListener("change", () => {
    selectedRepresentativeRunId = labRepresentativeSourceEl.value || null;
    renderRepresentativeGameSection();
  });
}

if (labClearRememberedBtnEl) {
  labClearRememberedBtnEl.addEventListener("click", () => {
    rememberedLabRuns = [];
    selectedRememberedRunIds = new Set();
    saveRememberedRuns();
    saveSelectedRememberedRunIds();
    renderRememberedComparisons();
  });
}

loadRememberedRuns();
renderMetricExplanations(labMetricExplanationsEl, LAB_METRIC_EXPLANATIONS);
renderRememberedComparisons();

document.addEventListener("pointerenter", (event) => {
  const target = getTooltipTarget(event.target);
  if (!target) return;
  showLabTooltip(target, event.clientX, event.clientY);
}, true);

document.addEventListener("pointermove", (event) => {
  const target = getTooltipTarget(event.target);
  if (!target || !labTooltipEl || labTooltipEl.classList.contains("hidden")) return;
  positionLabTooltip(event.clientX, event.clientY);
}, true);

document.addEventListener("pointerleave", (event) => {
  const target = getTooltipTarget(event.target);
  if (!target) return;
  hideLabTooltip();
}, true);

document.addEventListener("focusin", (event) => {
  const target = getTooltipTarget(event.target);
  if (!target) return;
  const rect = target.getBoundingClientRect();
  showLabTooltip(target, rect.left + rect.width / 2, rect.top + rect.height / 2);
}, true);

document.addEventListener("focusout", (event) => {
  const target = getTooltipTarget(event.target);
  if (!target) return;
  hideLabTooltip();
}, true);

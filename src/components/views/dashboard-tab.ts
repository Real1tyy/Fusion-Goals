import {
	type CellOption,
	type CellPlacement,
	createGridLayout,
	type GridLayoutHandle,
	type PieChartHandle,
	registerGridCommands,
	type TabDefinition,
} from "@real1ty-obsidian-plugins";
import type { Plugin } from "obsidian";

import type { GoalsManager } from "../../core/goals-manager";
import type { FusionGoalsSettingsStore } from "../../types/settings";
import { renderFusionPieChart } from "../pie-chart";

interface DistributionSpec {
	id: string;
	label: string;
	compute: (manager: GoalsManager) => Map<string, number>;
}

function buildDistributionSpecs(): DistributionSpec[] {
	return [
		{ id: "goal-status", label: "Goal Status", compute: (m) => m.getStatusDistribution("goal") },
		{ id: "task-status", label: "Task Status", compute: (m) => m.getStatusDistribution("task") },
		{ id: "goal-priority", label: "Goal Priority", compute: (m) => m.getPriorityDistribution("goal") },
		{ id: "task-priority", label: "Task Priority", compute: (m) => m.getPriorityDistribution("task") },
		{ id: "deadlines", label: "Deadlines", compute: (m) => m.getDeadlineDistribution() },
		{ id: "progress", label: "Progress", compute: (m) => m.getProgressDistribution() },
	];
}

function specToCellOption(spec: DistributionSpec, manager: GoalsManager, chartRefs: PieChartHandle[]): CellOption {
	return {
		id: spec.id,
		label: spec.label,
		enlargeable: true,
		enlargeTitle: spec.label,
		render: (cellEl: HTMLElement) => {
			const dist = spec.compute(manager);
			chartRefs.push(renderFusionPieChart(cellEl, spec.label, dist));
		},
	};
}

function buildDefaultCells(palette: CellOption[]): CellPlacement[] {
	const defaults = ["goal-status", "task-status", "goal-priority", "task-priority", "deadlines", "progress"];
	return defaults.map((id, i) => {
		const option = palette.find((p) => p.id === id) ?? palette[i];
		return { ...option, row: Math.floor(i / 2), col: i % 2 };
	});
}

export function createDashboardTabDefinition(
	plugin: Plugin,
	settingsStore: FusionGoalsSettingsStore,
	goalsManager: GoalsManager,
	chartRefs: PieChartHandle[],
	gridHandleRef: { current: GridLayoutHandle | null }
): TabDefinition {
	return {
		id: "dashboard",
		label: "Dashboard",
		render: (el) => {
			const allSpecs = buildDistributionSpecs();
			const palette = allSpecs.map((s) => specToCellOption(s, goalsManager, chartRefs));
			const savedState = settingsStore.currentSettings.dashboardLayout;

			gridHandleRef.current = createGridLayout(el, {
				app: plugin.app,
				cssPrefix: "fusion-goals-chart-",
				columns: 2,
				rows: 3,
				gap: "12px",
				dividers: true,
				cellPalette: palette,
				cells: buildDefaultCells(palette),
				...(savedState !== undefined ? { initialState: savedState } : {}),
				onStateChange: (state) => {
					void settingsStore.updateSettings((s) => ({ ...s, dashboardLayout: state }));
				},
			});

			registerGridCommands(plugin, "fusion-dashboard", "Dashboard", gridHandleRef.current);
		},
		cleanup: () => {
			gridHandleRef.current?.destroy();
			gridHandleRef.current = null;
			for (const chart of chartRefs) {
				chart.destroy();
			}
			chartRefs.length = 0;
		},
	};
}

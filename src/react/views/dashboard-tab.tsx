import { type CellOption, type CellPlacement, type PieChartHandle } from "@real1ty-obsidian-plugins";
import { GridLayout, type TabEntry } from "@real1ty-obsidian-plugins-react";
import { createElement, memo, useMemo } from "react";

import { renderFusionPieChart } from "../../components/pie-chart";
import type { GoalsManager } from "../../core/goals-manager";
import type FusionGoalsPlugin from "../../main";
import type { FusionGoalsSettingsStore } from "../../types/settings";

interface DistributionSpec {
	id: string;
	label: string;
	compute: (manager: GoalsManager) => Map<string, number>;
}

const DISTRIBUTION_SPECS: DistributionSpec[] = [
	{ id: "goal-status", label: "Goal Status", compute: (m) => m.getStatusDistribution("goal") },
	{ id: "task-status", label: "Task Status", compute: (m) => m.getStatusDistribution("task") },
	{ id: "goal-priority", label: "Goal Priority", compute: (m) => m.getPriorityDistribution("goal") },
	{ id: "task-priority", label: "Task Priority", compute: (m) => m.getPriorityDistribution("task") },
	{ id: "deadlines", label: "Deadlines", compute: (m) => m.getDeadlineDistribution() },
	{ id: "progress", label: "Progress", compute: (m) => m.getProgressDistribution() },
];

const DEFAULT_CELL_IDS = ["goal-status", "task-status", "goal-priority", "task-priority", "deadlines", "progress"];

function specToCellOption(spec: DistributionSpec, manager: GoalsManager): CellOption {
	let handle: PieChartHandle | null = null;
	return {
		id: spec.id,
		label: spec.label,
		enlargeable: true,
		enlargeTitle: spec.label,
		render: (cellEl: HTMLElement) => {
			handle = renderFusionPieChart(cellEl, spec.label, spec.compute(manager));
		},
		cleanup: () => {
			handle?.destroy();
			handle = null;
		},
	};
}

function buildDefaultCells(palette: CellOption[]): CellPlacement[] {
	return DEFAULT_CELL_IDS.map((id, i) => {
		const option = palette.find((p) => p.id === id) ?? palette[i];
		return { ...option, row: Math.floor(i / 2), col: i % 2 };
	});
}

interface FusionGoalsDashboardTabProps {
	plugin: FusionGoalsPlugin;
	settingsStore: FusionGoalsSettingsStore;
	goalsManager: GoalsManager;
}

export const FusionGoalsDashboardTab = memo(function FusionGoalsDashboardTab({
	plugin,
	settingsStore,
	goalsManager,
}: FusionGoalsDashboardTabProps) {
	const palette = useMemo(() => DISTRIBUTION_SPECS.map((s) => specToCellOption(s, goalsManager)), [goalsManager]);
	const cells = useMemo(() => buildDefaultCells(palette), [palette]);
	const savedState = settingsStore.currentSettings.dashboardLayout;

	return (
		<GridLayout
			app={plugin.app}
			cssPrefix="fusion-goals-chart-"
			columns={2}
			rows={3}
			gap="12px"
			dividers
			cellPalette={palette}
			cells={cells}
			{...(savedState !== undefined ? { initialState: savedState } : {})}
			onStateChange={(state) => {
				void settingsStore.updateSettings((s) => ({ ...s, dashboardLayout: state }));
			}}
			commands={{ plugin, id: "fusion-dashboard", label: "Dashboard" }}
			style={{ flex: "1 1 auto", minHeight: 0 }}
		/>
	);
});

export function fusionGoalsDashboardTabEntry(props: FusionGoalsDashboardTabProps): TabEntry {
	return {
		id: "dashboard",
		label: "Dashboard",
		content: createElement(FusionGoalsDashboardTab, props),
	};
}

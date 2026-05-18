import type { PieChartHandle } from "@real1ty-obsidian-plugins";
import {
	Cell,
	GridLayout,
	ImperativeCellHost,
	usePersistedGridState,
	type TabEntry,
} from "@real1ty-obsidian-plugins-react";
import { createElement, memo, useCallback, useRef } from "react";

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

interface PieCellProps {
	spec: DistributionSpec;
	manager: GoalsManager;
}

const PieCell = memo(function PieCell({ spec, manager }: PieCellProps) {
	const handleRef = useRef<PieChartHandle | null>(null);
	const render = useCallback(
		(el: HTMLElement) => {
			handleRef.current = renderFusionPieChart(el, spec.label, spec.compute(manager));
		},
		[spec, manager]
	);
	const cleanup = useCallback(() => {
		handleRef.current?.destroy();
		handleRef.current = null;
	}, []);
	return <ImperativeCellHost render={render} cleanup={cleanup} />;
});

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
	const gridState = usePersistedGridState(settingsStore, "dashboardLayout");

	return (
		<GridLayout
			app={plugin.app}
			cssPrefix="fusion-goals-chart-"
			columns={2}
			rows={3}
			gap="12px"
			dividers
			{...gridState}
			commands={{ plugin, id: "fusion-dashboard", label: "Dashboard" }}
			style={{ flex: "1 1 auto", minHeight: 0 }}
		>
			{DISTRIBUTION_SPECS.map((spec) => (
				<Cell key={spec.id} id={spec.id} label={spec.label} enlargeable enlargeTitle={spec.label}>
					<PieCell spec={spec} manager={goalsManager} />
				</Cell>
			))}
		</GridLayout>
	);
});

export function fusionGoalsDashboardTabEntry(props: FusionGoalsDashboardTabProps): TabEntry {
	return {
		id: "dashboard",
		label: "Dashboard",
		content: createElement(FusionGoalsDashboardTab, props),
	};
}

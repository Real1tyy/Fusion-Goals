import {
	createPageHeader,
	createTabbedContainer,
	type GridLayoutHandle,
	type PageHeaderHandle,
	type PieChartHandle,
	registerComponentView,
	registerPageHeaderCommands,
	registerTabCommands,
	type TabbedContainerHandle,
	type ViewActivator,
} from "@real1ty-obsidian-plugins";
import type { Component } from "obsidian";

import type { GoalsManager } from "../../core/goals-manager";
import type FusionGoalsPlugin from "../../main";
import { FUSION_GOALS_VIEW_TYPE } from "../../types/constants";
import type { FusionGoalsSettingsStore } from "../../types/settings";
import { showGoalModal } from "../modals/goal-modal";
import { showTaskModal } from "../modals/task-modal";
import { createDashboardTabDefinition } from "./dashboard-tab";
import { createGoalsTabDefinitions } from "./goals-tab";
import { createGraphTabDefinition } from "./graph-tab";
import { createTasksTabDefinitions } from "./tasks-tab";

export function registerFusionGoalsView(
	plugin: FusionGoalsPlugin,
	settingsStore: FusionGoalsSettingsStore,
	goalsManager: GoalsManager
): ViewActivator {
	const components: Component[] = [];
	const chartRefs: PieChartHandle[] = [];
	const gridHandleRef: { current: GridLayoutHandle | null } = { current: null };
	let tabbedHandle: TabbedContainerHandle | null = null;
	let pageHeaderHandle: PageHeaderHandle | null = null;

	return registerComponentView(plugin, {
		viewType: FUSION_GOALS_VIEW_TYPE,
		displayText: "Fusion Goals",
		icon: "target",
		cls: "fusion-goals-view-root",
		render: (el, ctx) => {
			const dashboardTab = createDashboardTabDefinition(plugin, settingsStore, goalsManager, chartRefs, gridHandleRef);
			const goalsTabDefs = createGoalsTabDefinitions(plugin, settingsStore, components);
			const tasksTabDefs = createTasksTabDefinitions(plugin, settingsStore, components);
			const graphTab = createGraphTabDefinition(plugin, goalsManager);

			const tabs = [dashboardTab, ...goalsTabDefs, ...tasksTabDefs, graphTab];

			const headerEl = ctx.type === "view" ? ctx.headerEl : undefined;
			const titleContainer = headerEl?.querySelector(".view-header-title-container") ?? undefined;

			tabbedHandle = createTabbedContainer(el, {
				tabs,
				cssPrefix: "fusion-goals-",
				...(headerEl !== undefined ? { tabBarContainer: headerEl } : {}),
				...(titleContainer !== undefined ? { tabBarInsertBefore: titleContainer } : {}),
				editable: true,
				app: plugin.app,
				...(settingsStore.currentSettings.activeTab !== undefined
					? { initialState: settingsStore.currentSettings.activeTab }
					: {}),
				onStateChange: (state) => {
					void settingsStore.updateSettings((s) => ({ ...s, activeTab: state }));
				},
			});

			registerTabCommands(
				plugin,
				"fusion-goals",
				"Fusion Goals",
				tabbedHandle,
				tabs.map((t) => t.label)
			);

			pageHeaderHandle = createPageHeader({
				actions: [
					{
						id: "create-goal",
						label: "Create Goal",
						icon: "target",
						onAction: () => {
							showGoalModal(plugin.app, goalsManager, settingsStore);
						},
					},
					{
						id: "create-task",
						label: "Create Task",
						icon: "check-square",
						onAction: () => {
							showTaskModal(plugin.app, goalsManager, settingsStore);
						},
					},
				],
				cssPrefix: "fusion-goals-",
				app: plugin.app,
				editable: true,
				...(settingsStore.currentSettings.pageHeaderState !== undefined
					? { initialState: settingsStore.currentSettings.pageHeaderState }
					: {}),
				onStateChange: (state) => {
					void settingsStore.updateSettings((s) => ({ ...s, pageHeaderState: state }));
				},
			});

			if (ctx.type === "view" && ctx.leaf) {
				pageHeaderHandle.apply(ctx.leaf);
			}

			registerPageHeaderCommands(plugin, "fusion-goals", "Fusion Goals", pageHeaderHandle);
		},
		cleanup: () => {
			pageHeaderHandle?.destroy();
			pageHeaderHandle = null;
			tabbedHandle?.destroy();
			tabbedHandle = null;
			gridHandleRef.current?.destroy();
			gridHandleRef.current = null;
			for (const chart of chartRefs) {
				chart.destroy();
			}
			chartRefs.length = 0;
			for (const c of components) {
				c.unload();
			}
			components.length = 0;
		},
	});
}

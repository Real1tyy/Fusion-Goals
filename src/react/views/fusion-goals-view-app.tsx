import {
	createPageHeader,
	type PageHeaderHandle,
	registerPageHeaderCommands,
	registerTabCommands,
	renderReactInline,
	TabbedContainer,
	type TabbedContainerHandle,
	type TabEntry,
	useApp,
} from "@real1ty-obsidian-plugins-react";
import type { Component } from "obsidian";
import { type WorkspaceLeaf } from "obsidian";
import { createElement, memo, useEffect, useRef } from "react";

import { showGoalModal } from "../../components/modals/goal-modal";
import { showTaskModal } from "../../components/modals/task-modal";
import { createGoalsTabDefinitions } from "../../components/views/goals-tab";
import { createGraphTabDefinition } from "../../components/views/graph-tab";
import { createTasksTabDefinitions } from "../../components/views/tasks-tab";
import type { GoalsManager } from "../../core/goals-manager";
import type FusionGoalsPlugin from "../../main";
import type { FusionGoalsSettingsStore } from "../../types/settings";
import { fusionGoalsDashboardTabEntry } from "./dashboard-tab";

export interface FusionGoalsViewAppProps {
	plugin: FusionGoalsPlugin;
	settingsStore: FusionGoalsSettingsStore;
	goalsManager: GoalsManager;
	el: HTMLElement;
	headerEl?: HTMLElement | undefined;
	leaf?: WorkspaceLeaf | undefined;
}

export const FusionGoalsViewApp = memo(function FusionGoalsViewApp({
	plugin,
	settingsStore,
	goalsManager,
	el,
	headerEl,
	leaf,
}: FusionGoalsViewAppProps) {
	const app = useApp();
	const tabbedHandleRef = useRef<TabbedContainerHandle | null>(null);

	useEffect(() => {
		const components: Component[] = [];
		const goalsTabDefs = createGoalsTabDefinitions(plugin, settingsStore, components);
		const tasksTabDefs = createTasksTabDefinitions(plugin, settingsStore, components);
		const graphTab = createGraphTabDefinition(plugin, goalsManager);
		const dashboardTab = fusionGoalsDashboardTabEntry({ plugin, settingsStore, goalsManager });

		const tabs: TabEntry[] = [dashboardTab, ...goalsTabDefs, ...tasksTabDefs, graphTab];

		const titleContainer = (headerEl?.querySelector(".view-header-title-container") as HTMLElement | null) ?? null;

		// Mount the TabbedContainer into its own child node, not directly into `el`.
		// `el` is owned by the outer renderReactInline root that hosts this component;
		// mounting a second root into the same DOM container makes React's two unmount
		// passes race on shared children and throw "removeChild" on view close.
		const tabbedHost = el.createDiv("fusion-goals-tabbed-host");

		const tabbedUnmount = renderReactInline(
			tabbedHost,
			createElement(TabbedContainer, {
				tabs,
				cssPrefix: "fusion-goals-",
				...(headerEl !== undefined ? { tabBarContainer: headerEl } : {}),
				...(titleContainer !== null ? { tabBarInsertBefore: titleContainer } : {}),
				editable: true,
				app,
				...(settingsStore.currentSettings.activeTab !== undefined
					? { initialState: settingsStore.currentSettings.activeTab }
					: {}),
				onStateChange: (state) => {
					void settingsStore.updateSettings((s) => ({ ...s, activeTab: state }));
				},
				handleRef: tabbedHandleRef,
			}),
			app
		);

		registerTabCommands(
			plugin,
			"fusion-goals",
			"Fusion Goals",
			() => tabbedHandleRef.current,
			tabs.map((t) => t.label)
		);

		const pageHeaderHandle: PageHeaderHandle = createPageHeader({
			actions: [
				{
					id: "create-goal",
					label: "Create Goal",
					icon: "target",
					onAction: () => {
						showGoalModal(app, goalsManager, settingsStore);
					},
				},
				{
					id: "create-task",
					label: "Create Task",
					icon: "check-square",
					onAction: () => {
						showTaskModal(app, goalsManager, settingsStore);
					},
				},
			],
			cssPrefix: "fusion-goals-",
			app,
			editable: true,
			...(settingsStore.currentSettings.pageHeaderState !== undefined
				? { initialState: settingsStore.currentSettings.pageHeaderState }
				: {}),
			onStateChange: (state) => {
				void settingsStore.updateSettings((s) => ({ ...s, pageHeaderState: state }));
			},
		});

		if (leaf) {
			pageHeaderHandle.apply(leaf);
		}

		registerPageHeaderCommands(plugin, "fusion-goals", "Fusion Goals", pageHeaderHandle);

		return () => {
			pageHeaderHandle.destroy();
			tabbedUnmount();
			tabbedHost.remove();
			tabbedHandleRef.current = null;
			for (const c of components) {
				c.unload();
			}
			components.length = 0;
		};
	}, [app, plugin, settingsStore, goalsManager, el, headerEl, leaf]);

	return null;
});

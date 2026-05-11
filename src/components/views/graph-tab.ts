import { MountImperative, type TabEntry } from "@real1ty-obsidian-plugins-react";
import { createElement } from "react";

import type { GoalsManager } from "../../core/goals-manager";
import type FusionGoalsPlugin from "../../main";
import { RelationshipGraphView } from "./relationship-graph-view";

export function createGraphTabDefinition(plugin: FusionGoalsPlugin, goalsManager: GoalsManager): TabEntry {
	let graphView: RelationshipGraphView | null = null;

	const render = async (el: HTMLElement) => {
		graphView = new RelationshipGraphView(plugin.app, goalsManager, plugin, el);
		await graphView.render();
	};
	const cleanup = () => {
		graphView?.destroy();
		graphView = null;
	};

	return {
		id: "graph",
		label: "Graph",
		content: createElement(MountImperative, { render, cleanup }),
	};
}

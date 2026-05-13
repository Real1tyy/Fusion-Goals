import { registerComponentView, type ViewActivator } from "@real1ty-obsidian-plugins";
import { renderReactInline } from "@real1ty-obsidian-plugins-react";
import { createElement } from "react";

import type { GoalsManager } from "../../core/goals-manager";
import type FusionGoalsPlugin from "../../main";
import { FusionGoalsViewApp } from "../../react/views/fusion-goals-view-app";
import { FUSION_GOALS_VIEW_TYPE } from "../../types/constants";
import type { FusionGoalsSettingsStore } from "../../types/settings";

export function registerFusionGoalsView(
	plugin: FusionGoalsPlugin,
	settingsStore: FusionGoalsSettingsStore,
	goalsManager: GoalsManager
): ViewActivator {
	let unmount: (() => void) | null = null;

	return registerComponentView(plugin, {
		viewType: FUSION_GOALS_VIEW_TYPE,
		displayText: "Fusion Goals",
		icon: "target",
		cls: "fusion-goals-view-root",
		render: (el, ctx) => {
			unmount?.();
			const headerEl = ctx.type === "view" ? ctx.headerEl : undefined;
			const leaf = ctx.type === "view" ? ctx.leaf : undefined;
			unmount = renderReactInline(
				el,
				createElement(FusionGoalsViewApp, {
					plugin,
					settingsStore,
					goalsManager,
					el,
					headerEl,
					leaf,
				}),
				ctx.app,
				{ cssPrefix: "fusion-goals-" }
			);
		},
		cleanup: () => {
			unmount?.();
			unmount = null;
		},
	});
}

import { renderReactInline } from "@real1ty-obsidian-plugins-react";
import { type App, PluginSettingTab } from "obsidian";
import { createElement } from "react";

import type FusionGoalsPlugin from "../../main";
import { SettingsRoot } from "../../react/settings/settings-root";

export class FusionGoalsSettingsTab extends PluginSettingTab {
	plugin: FusionGoalsPlugin;
	private unmount: (() => void) | null = null;

	constructor(app: App, plugin: FusionGoalsPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	override display(): void {
		this.unmount?.();
		this.containerEl.empty();
		this.unmount = renderReactInline(this.containerEl, createElement(SettingsRoot, { plugin: this.plugin }), this.app, {
			cssPrefix: "fusion-goals-",
		});
	}

	override hide(): void {
		this.unmount?.();
		this.unmount = null;
	}
}

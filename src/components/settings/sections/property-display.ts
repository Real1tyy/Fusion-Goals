import type { SettingsUIBuilder } from "@real1ty-obsidian-plugins/utils";
import { Setting } from "obsidian";
import type { FusionGoalsSettingsSchema } from "src/types/settings";
import type { SettingsSection } from "../types";

export class PropertyDisplaySettingsSection implements SettingsSection {
	id = "property-display";
	label = "Property Display";

	constructor(private uiBuilder: SettingsUIBuilder<typeof FusionGoalsSettingsSchema>) {}

	render(containerEl: HTMLElement): void {
		new Setting(containerEl).setName("Property Display").setHeading();

		this.uiBuilder.addToggle(containerEl, {
			key: "hideEmptyProperties",
			name: "Hide empty properties",
			desc: "Hide properties with empty, null, or undefined values in tooltips and previews",
		});

		this.uiBuilder.addToggle(containerEl, {
			key: "hideUnderscoreProperties",
			name: "Hide underscore properties",
			desc: "Hide properties that start with an underscore (_) in tooltips and previews",
		});

		this.uiBuilder.addToggle(containerEl, {
			key: "zoomHideFrontmatterByDefault",
			name: "Zoom: hide frontmatter by default",
			desc: "When entering zoom preview, frontmatter starts hidden by default",
		});

		this.uiBuilder.addToggle(containerEl, {
			key: "zoomHideContentByDefault",
			name: "Zoom: hide content by default",
			desc: "When entering zoom preview, file content starts hidden by default",
		});
	}
}

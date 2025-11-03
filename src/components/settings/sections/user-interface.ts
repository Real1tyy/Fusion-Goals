import type { SettingsUIBuilder } from "@real1ty-obsidian-plugins/utils";
import { Setting } from "obsidian";
import type { FusionGoalsSettingsSchema } from "src/types/settings";
import type { SettingsSection } from "../types";

export class UserInterfaceSettingsSection implements SettingsSection {
	id = "user-interface";
	label = "User Interface";

	constructor(private uiBuilder: SettingsUIBuilder<typeof FusionGoalsSettingsSchema>) {}

	render(containerEl: HTMLElement): void {
		new Setting(containerEl).setName("User Interface").setHeading();

		this.uiBuilder.addToggle(containerEl, {
			key: "showRibbonIcon",
			name: "Show ribbon icon",
			desc: "Display the relationship graph icon in the left ribbon. Restart Obsidian after changing this setting.",
		});
	}
}

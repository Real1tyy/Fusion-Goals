import type { SettingsUIBuilder } from "@real1ty-obsidian-plugins";
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

		this.uiBuilder.addToggle(containerEl, {
			key: "showStartupOverview",
			name: "Show deadlines overview on load",
			desc: "Display the Goals & Projects deadlines overview modal when the plugin loads. You can always open it manually with the 'Show Deadlines Overview' command.",
		});

		this.uiBuilder.addToggle(containerEl, {
			key: "showViewSwitcherHeader",
			name: "Show view switcher header",
			desc: "Display the header with toggle button in the Fusion Goals view. Changes apply immediately.",
		});

		new Setting(containerEl).setName("Deadlines Overview Filters").setHeading();

		this.uiBuilder.addTextArray(containerEl, {
			key: "deadlineFilterExpressions",
			name: "Global filter expressions",
			desc: "One per line. Changes apply on blur or Ctrl/Cmd+Enter. Only items matching all expressions will be shown in the Deadlines Overview modal. Leave empty to show all items.",
			placeholder: "status === 'active'\npriority === 'high'",
			multiline: true,
		});
	}
}

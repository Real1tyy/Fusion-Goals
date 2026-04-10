import type { SettingsUIBuilder } from "@real1ty-obsidian-plugins";
import { Setting } from "obsidian";
import { FusionGoalsSettingsSchema } from "src/types/settings";

import type { SettingsSection } from "../types";

const S = FusionGoalsSettingsSchema.shape;

export class UserInterfaceSettingsSection implements SettingsSection {
	id = "user-interface";
	label = "User Interface";

	constructor(private ui: SettingsUIBuilder<typeof FusionGoalsSettingsSchema>) {}

	render(containerEl: HTMLElement): void {
		new Setting(containerEl).setName("User Interface").setHeading();

		this.ui.addSchemaField(containerEl, { showRibbonIcon: S.showRibbonIcon });
		this.ui.addSchemaField(
			containerEl,
			{ showStartupOverview: S.showStartupOverview },
			{ label: "Show deadlines overview on load" }
		);
		this.ui.addSchemaField(containerEl, { showViewSwitcherHeader: S.showViewSwitcherHeader });

		new Setting(containerEl).setName("Deadlines Overview Filters").setHeading();

		this.ui.addTextArray(containerEl, {
			key: "deadlineFilterExpressions",
			name: "Global filter expressions",
			desc: "One per line. Changes apply on blur or Ctrl/Cmd+Enter. Only items matching all expressions will be shown in the Deadlines Overview modal. Leave empty to show all items.",
			placeholder: "status === 'active'\npriority === 'high'",
			multiline: true,
		});
	}
}

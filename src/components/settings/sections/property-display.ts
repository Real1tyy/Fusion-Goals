import type { SettingsUIBuilder } from "@real1ty-obsidian-plugins";
import { Setting } from "obsidian";
import { FusionGoalsSettingsSchema } from "src/types/settings";

import type { SettingsSection } from "../types";

const S = FusionGoalsSettingsSchema.shape;

export class PropertyDisplaySettingsSection implements SettingsSection {
	id = "property-display";
	label = "Property Display";

	constructor(private ui: SettingsUIBuilder<typeof FusionGoalsSettingsSchema>) {}

	render(containerEl: HTMLElement): void {
		new Setting(containerEl).setName("Property Display").setHeading();

		this.ui.addSchemaField(containerEl, { hideEmptyProperties: S.hideEmptyProperties });
		this.ui.addSchemaField(containerEl, { hideUnderscoreProperties: S.hideUnderscoreProperties });
		this.ui.addSchemaField(containerEl, { zoomHideFrontmatterByDefault: S.zoomHideFrontmatterByDefault });
		this.ui.addSchemaField(containerEl, { zoomHideContentByDefault: S.zoomHideContentByDefault });

		new Setting(containerEl).setName("Date Properties").setHeading();

		this.ui.addSchemaField(containerEl, { startDateProperty: S.startDateProperty }, { placeholder: "Start Date" });
		this.ui.addSchemaField(containerEl, { endDateProperty: S.endDateProperty }, { placeholder: "End Date" });
	}
}

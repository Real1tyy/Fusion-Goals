import type { SettingsUIBuilder } from "@real1ty-obsidian-plugins/utils";
import { Setting } from "obsidian";
import type FusionGoalsPlugin from "../../../main";
import type { FusionGoalsSettings, FusionGoalsSettingsSchema } from "../../../types/settings";
import type { SettingsSection } from "../types";

export class BasesViewSettingsSection implements SettingsSection {
	readonly id = "bases-view";
	readonly label = "Bases View";

	constructor(
		private readonly plugin: FusionGoalsPlugin,
		private readonly uiBuilder: SettingsUIBuilder<typeof FusionGoalsSettingsSchema>
	) {}

	render(container: HTMLElement): void {
		new Setting(container).setName("Bases View Configuration").setHeading();

		container
			.createDiv("setting-item-description")
			.setText(
				"Configure which frontmatter properties appear as columns in the Bases view tables. " +
					"'file.name' is always included first, followed by the properties you specify below."
			);

		this.uiBuilder.addToggle(container, {
			key: "excludeArchived",
			name: "Enable archived filtering",
			desc: "When enabled, shows the archived view option and filters non-archived items in other views. When disabled, shows all items without archived filtering.",
		});

		this.uiBuilder.addText(container, {
			key: "archivedProp",
			name: "Archived property name",
			desc: "Name of the frontmatter property used to mark files as archived (e.g., 'Archived', '_Archived').",
			placeholder: "Archived",
		});

		new Setting(container).setName("Custom sorting").setHeading();

		container
			.createDiv("setting-item-description")
			.setText(
				"Define custom formulas and sort rules for advanced sorting in Bases view tables. " +
					"Formulas map property values to numeric priorities, and sort rules specify how rows should be ordered."
			);

		new Setting(container)
			.setName("Custom formulas")
			.setDesc(
				"Define custom formulas for sorting. Enter the YAML content that goes AFTER 'formulas:' (do not include 'formulas:' itself). Each formula maps values to sort priorities. Leave empty if not needed."
			)
			.addTextArea((text) => {
				text
					.setPlaceholder(
						`  _priority_sort: |-
    [
      ["Very High", 1],
      ["High", 2],
      ["Medium", 3],
      ["Low", 4],
      ["null", 5]
    ].filter(value[0] == Priority.toString())[0][1]`
					)
					.setValue(this.plugin.settingsStore.settings$.value.basesCustomFormulas)
					.onChange(async (value) => {
						await this.plugin.settingsStore.updateSettings((current: FusionGoalsSettings) => ({
							...current,
							basesCustomFormulas: value,
						}));
					});
				text.inputEl.rows = 8;
			});

		new Setting(container)
			.setName("Custom sort configuration")
			.setDesc(
				"Define custom sort rules. Enter the YAML content that goes AFTER 'sort:' (do not include 'sort:' itself). Specifies how to sort table rows. Leave empty if not needed."
			)
			.addTextArea((text) => {
				text
					.setPlaceholder(
						`      - property: formula._priority_sort
        direction: ASC
      - property: file.mtime
        direction: DESC`
					)
					.setValue(this.plugin.settingsStore.settings$.value.basesCustomSort)
					.onChange(async (value) => {
						await this.plugin.settingsStore.updateSettings((current: FusionGoalsSettings) => ({
							...current,
							basesCustomSort: value,
						}));
					});
				text.inputEl.rows = 6;
			});

		this.uiBuilder.addTextArray(container, {
			key: "basesGoalsProperties",
			name: "Goals properties",
			desc: "Comma-separated list of frontmatter properties to show as columns when viewing Goals files (e.g., Status, Priority)",
			placeholder: "Status, Priority",
		});

		this.uiBuilder.addTextArray(container, {
			key: "basesProjectsProperties",
			name: "Projects properties",
			desc: "Comma-separated list of frontmatter properties to show as columns when viewing Projects files (e.g., Status, Priority, Difficulty)",
			placeholder: "Status, Priority, Difficulty",
		});

		this.uiBuilder.addTextArray(container, {
			key: "basesTasksProperties",
			name: "Tasks properties",
			desc: "Comma-separated list of frontmatter properties to show as columns when viewing Tasks files (e.g., Goal, Project, Status, Priority)",
			placeholder: "Goal, Project, Status, Priority",
		});

		const infoBox = container.createDiv("fusion-bases-settings-info-box");
		infoBox.createEl("strong", { text: "Column Order:" });
		const orderList = infoBox.createEl("ol");
		orderList.createEl("li", { text: "file.name (always first)" });
		orderList.createEl("li", { text: "Properties specified above (in the order listed)" });
	}
}

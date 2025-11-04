import type { SettingsUIBuilder } from "@real1ty-obsidian-plugins/utils";
import { Setting } from "obsidian";
import type { FusionGoalsSettingsSchema } from "../../../types/settings";
import type { SettingsSection } from "../types";

export class BasesViewSettingsSection implements SettingsSection {
	readonly id = "bases-view";
	readonly label = "Bases View";

	constructor(private readonly uiBuilder: SettingsUIBuilder<typeof FusionGoalsSettingsSchema>) {}

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

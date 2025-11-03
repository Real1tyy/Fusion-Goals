import type { SettingsUIBuilder } from "@real1ty-obsidian-plugins/utils";
import { Notice, Setting } from "obsidian";
import type { FusionGoalsSettingsSchema } from "src/types/settings";
import type { SettingsSection } from "../types";

export class HierarchySection implements SettingsSection {
	id = "hierarchy";
	label = "Hierarchy";

	constructor(private uiBuilder: SettingsUIBuilder<typeof FusionGoalsSettingsSchema>) {}

	render(containerEl: HTMLElement): void {
		new Setting(containerEl).setName("Hierarchical Structure").setHeading();

		containerEl
			.createDiv("setting-item-description")
			.setText(
				"Configure the three-level hierarchy: Goals → Projects → Tasks. Each level must have its own directory."
			);

		this.uiBuilder.addText(containerEl, {
			key: "goalsDirectory",
			name: "Goals directory",
			desc: "Directory where goal files are stored (required)",
			placeholder: "Goals",
		});

		this.uiBuilder.addText(containerEl, {
			key: "projectsDirectory",
			name: "Projects directory",
			desc: "Directory where project files are stored (required)",
			placeholder: "Projects",
		});

		this.uiBuilder.addText(containerEl, {
			key: "tasksDirectory",
			name: "Tasks directory",
			desc: "Directory where task files are stored (required)",
			placeholder: "Tasks",
		});

		new Setting(containerEl).setName("Hierarchical Properties").setHeading();

		containerEl
			.createDiv("setting-item-description")
			.setText(
				"Property names used to link files in the hierarchy. Projects link to Goals, Tasks link to both Goals and Projects."
			);

		this.uiBuilder.addText(containerEl, {
			key: "projectGoalProp",
			name: "Project → Goal property",
			desc: "Property name in projects that links to their parent goal",
			placeholder: "Goal",
		});

		this.uiBuilder.addText(containerEl, {
			key: "taskGoalProp",
			name: "Task → Goal property",
			desc: "Property name in tasks that links to their goal",
			placeholder: "Goal",
		});

		this.uiBuilder.addText(containerEl, {
			key: "taskProjectProp",
			name: "Task → Project property",
			desc: "Property name in tasks that links to their parent project",
			placeholder: "Project",
		});

		this.renderIndexingSection(containerEl);
	}

	private renderIndexingSection(containerEl: HTMLElement): void {
		new Setting(containerEl).setName("Indexing").setHeading();

		const descEl = containerEl.createDiv("setting-item-description");
		descEl.setText(
			"Manually index all files in your vault and assign relationship properties based on your configured settings. This process will scan all files in the configured directories and update their frontmatter with bidirectional and computed relationships."
		);

		new Setting(containerEl)
			.setName("Index and assign properties to all files")
			.setDesc(
				"Scan all files in configured directories and update their relationship properties. This may take some time for large vaults."
			)
			.addButton((button) => {
				button
					.setButtonText("Rescan Everything")
					.setCta()
					.onClick(async () => {
						button.setDisabled(true);
						button.setButtonText("Rescanning...");

						try {
							new Notice("Property management has been removed from this plugin");
							button.setButtonText("✓ Complete!");
							setTimeout(() => {
								button.setButtonText("Rescan Everything");
								button.setDisabled(false);
							}, 2000);
						} catch (error) {
							console.error("Error during rescan:", error);
							button.setButtonText("✗ Error");
							setTimeout(() => {
								button.setButtonText("Rescan Everything");
								button.setDisabled(false);
							}, 2000);
						}
					});
			});
	}
}

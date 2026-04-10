import type { SettingsUIBuilder } from "@real1ty-obsidian-plugins";
import { Notice, Setting } from "obsidian";
import type FusionGoalsPlugin from "src/main";
import { FusionGoalsSettingsSchema } from "src/types/settings";

import type { SettingsSection } from "../types";

const S = FusionGoalsSettingsSchema.shape;

export class HierarchySection implements SettingsSection {
	id = "hierarchy";
	label = "Hierarchy";

	constructor(
		private plugin: FusionGoalsPlugin,
		private ui: SettingsUIBuilder<typeof FusionGoalsSettingsSchema>
	) {}

	render(containerEl: HTMLElement): void {
		new Setting(containerEl).setName("Hierarchical Structure").setHeading();

		containerEl
			.createDiv("setting-item-description")
			.setText("Configure the two-level hierarchy: Goals → Tasks. Each level must have its own directory.");

		this.ui.addSchemaField(containerEl, { goalsDirectory: S.goalsDirectory }, { placeholder: "Goals" });
		this.ui.addSchemaField(containerEl, { tasksDirectory: S.tasksDirectory }, { placeholder: "Tasks" });

		new Setting(containerEl).setName("Hierarchical Properties").setHeading();

		containerEl
			.createDiv("setting-item-description")
			.setText("Property name used to link tasks to goals in the hierarchy.");

		this.ui.addSchemaField(
			containerEl,
			{ taskGoalProp: S.taskGoalProp },
			{ label: "Task → Goal property", placeholder: "Goal" }
		);

		new Setting(containerEl).setName("Task Creation").setHeading();

		containerEl
			.createDiv("setting-item-description")
			.setText("Configure template for creating new tasks from goals. Leave empty to create tasks without a template.");

		this.ui.addSchemaField(containerEl, { taskTemplatePath: S.taskTemplatePath }, { placeholder: "Templates/Task.md" });

		new Setting(containerEl).setName("Additional Properties").setHeading();

		containerEl.createDiv("setting-item-description").setText("Property names for priority and progress tracking.");

		this.ui.addSchemaField(
			containerEl,
			{ priorityProp: S.priorityProp },
			{ label: "Priority property", placeholder: "Priority" }
		);

		this.ui.addSchemaField(
			containerEl,
			{ progressProp: S.progressProp },
			{ label: "Progress property", placeholder: "Progress" }
		);

		this.renderTitlePropertySection(containerEl);
		this.renderInheritanceSection(containerEl);
		this.renderIndexingSection(containerEl);
	}

	private renderTitlePropertySection(containerEl: HTMLElement): void {
		new Setting(containerEl).setName("Title Property").setHeading();

		const descEl = containerEl.createDiv("setting-item-description");
		descEl.createEl("p", {
			text: "Automatically assign a Task Title property to task files with the goal name prefix stripped.",
		});
		descEl.createEl("p", {
			text: 'For example, a task named "My Goal - Task Name" linked to "My Goal" will get a Task Title property of "Task Name". This title is used in the Graph and Bases views for cleaner display.',
		});

		this.ui.addSchemaField(
			containerEl,
			{ titlePropertyEnabled: S.titlePropertyEnabled },
			{ label: "Enable title property" }
		);

		this.ui.addSchemaField(
			containerEl,
			{ titleProp: S.titleProp },
			{ label: "Title property name", placeholder: "Task Title" }
		);
	}

	private renderInheritanceSection(containerEl: HTMLElement): void {
		new Setting(containerEl).setName("Frontmatter Inheritance").setHeading();

		const descEl = containerEl.createDiv("setting-item-description");
		descEl.createEl("p", {
			text: "Automatically propagate frontmatter properties from goals to linked tasks.",
		});
		descEl.createEl("p", {
			text: "When you update a property in a goal, it will be inherited by all linked tasks. Relationship properties (Goal) are always excluded from inheritance.",
		});

		this.ui.addSchemaField(containerEl, { enableFrontmatterInheritance: S.enableFrontmatterInheritance });

		this.ui.addSchemaField(
			containerEl,
			{ inheritanceExcludedProperties: S.inheritanceExcludedProperties },
			{ label: "Excluded properties", placeholder: "Enter property name" }
		);
	}

	private renderIndexingSection(containerEl: HTMLElement): void {
		new Setting(containerEl).setName("Indexing").setHeading();

		const descEl = containerEl.createDiv("setting-item-description");
		descEl.createEl("p", {
			text: "Manually rescan and reindex all files in your vault. This will rebuild the hierarchical cache and, if inheritance is enabled, propagate properties from goals to tasks.",
		});

		new Setting(containerEl)
			.setName("Rescan everything")
			.setDesc(
				"Scan all files in configured directories, rebuild cache, and apply inheritance. This may take some time for large vaults."
			)
			.addButton((button) => {
				button
					.setButtonText("Rescan Everything")
					.setCta()
					.onClick(async () => {
						button.setDisabled(true);
						button.setButtonText("Rescanning...");

						try {
							new Notice("Starting full rescan...");
							this.plugin.goalsTable.stop();
							this.plugin.tasksTable.stop();
							await this.plugin.goalsTable.start();
							await this.plugin.tasksTable.start();
							new Notice("Rescan complete!");
							button.setButtonText("✓ Complete!");
							setTimeout(() => {
								button.setButtonText("Rescan Everything");
								button.setDisabled(false);
							}, 2000);
						} catch (error) {
							console.error("Error during rescan:", error);
							new Notice("Error during rescan - check console");
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

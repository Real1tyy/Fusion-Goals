import type { SettingsUIBuilder } from "@real1ty-obsidian-plugins/utils";
import { Notice, Setting } from "obsidian";
import type FusionGoalsPlugin from "src/main";
import type { FusionGoalsSettingsSchema } from "src/types/settings";
import type { SettingsSection } from "../types";

export class HierarchySection implements SettingsSection {
	id = "hierarchy";
	label = "Hierarchy";

	constructor(
		private plugin: FusionGoalsPlugin,
		private uiBuilder: SettingsUIBuilder<typeof FusionGoalsSettingsSchema>
	) {}

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

		this.renderInheritanceSection(containerEl);
		this.renderIndexingSection(containerEl);
	}

	private renderInheritanceSection(containerEl: HTMLElement): void {
		new Setting(containerEl).setName("Frontmatter Inheritance").setHeading();

		const descEl = containerEl.createDiv("setting-item-description");
		descEl.createEl("p", {
			text: "Automatically propagate frontmatter properties from parent to child files in the hierarchy:",
		});
		descEl.createEl("ul", {}, (ul) => {
			ul.createEl("li", { text: "Goals → All linked projects and tasks" });
			ul.createEl("li", { text: "Projects → All linked tasks" });
		});
		descEl.createEl("p", {
			text: "When you update a property in a goal or project, it will be inherited by all children. Relationship properties (Goal, Project) are always excluded from inheritance.",
		});

		this.uiBuilder.addToggle(containerEl, {
			key: "enableFrontmatterInheritance",
			name: "Enable frontmatter inheritance",
			desc: "When enabled, changes to goal/project frontmatter will automatically propagate to children",
		});

		this.uiBuilder.addTextArray(containerEl, {
			key: "inheritanceExcludedProperties",
			name: "Excluded properties",
			desc: "Property names to exclude from inheritance (e.g., 'tasks', 'CustomField'). Relationship properties are always excluded.",
			placeholder: "Enter property name",
		});
	}

	private renderIndexingSection(containerEl: HTMLElement): void {
		new Setting(containerEl).setName("Indexing").setHeading();

		const descEl = containerEl.createDiv("setting-item-description");
		descEl.createEl("p", {
			text: "Manually rescan and reindex all files in your vault. This will rebuild the hierarchical cache and, if inheritance is enabled, propagate properties from goals to projects/tasks.",
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
							await this.plugin.indexer.scanAllFiles();
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

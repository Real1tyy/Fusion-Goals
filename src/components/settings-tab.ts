import { SettingsUIBuilder } from "@real1ty-obsidian-plugins/utils";
import { type App, Notice, PluginSettingTab, Setting } from "obsidian";
import type { FusionGoalsSettingsSchema } from "src/types/settings";
import type FusionGoalsPlugin from "../main";
import { SETTINGS_DEFAULTS } from "../types/constants";

export class FusionGoalsSettingsTab extends PluginSettingTab {
	plugin: FusionGoalsPlugin;
	private uiBuilder: SettingsUIBuilder<typeof FusionGoalsSettingsSchema>;

	constructor(app: App, plugin: FusionGoalsPlugin) {
		super(app, plugin);
		this.plugin = plugin;
		this.uiBuilder = new SettingsUIBuilder(this.plugin.settingsStore);
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl("h1", { text: "Fusion Goals Settings" });

		this.addUserInterfaceSettings(containerEl);
		this.addHierarchySettings(containerEl);
		this.addGraphSettings(containerEl);
		this.addPreviewSettings(containerEl);
		this.addColorSettings(containerEl);
		this.addFilteringSettings(containerEl);
		this.addRescanSection(containerEl);
		this.addExampleSection(containerEl);
	}

	private addUserInterfaceSettings(containerEl: HTMLElement): void {
		new Setting(containerEl).setName("User Interface").setHeading();

		this.uiBuilder.addToggle(containerEl, {
			key: "showRibbonIcon",
			name: "Show ribbon icon",
			desc: "Display the relationship graph icon in the left ribbon. Restart Obsidian after changing this setting.",
		});
	}

	private addHierarchySettings(containerEl: HTMLElement): void {
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
	}

	private addGraphSettings(containerEl: HTMLElement): void {
		new Setting(containerEl).setName("Graph Display").setHeading();

		this.uiBuilder.addToggle(containerEl, {
			key: "showSearchBar",
			name: "Show search bar by default",
			desc: "Display the search bar in the graph view when it loads. You can still toggle it with the command.",
		});

		this.uiBuilder.addToggle(containerEl, {
			key: "showFilterBar",
			name: "Show filter bar by default",
			desc: "Display the filter bar (preset selector and expression input) in the graph view when it loads. You can still toggle it with commands.",
		});

		this.uiBuilder.addSlider(containerEl, {
			key: "graphEnlargedWidthPercent",
			name: "Graph enlarged width",
			desc: "Percentage of window width when graph is enlarged",
			min: 50,
			max: 100,
			step: 1,
		});

		this.uiBuilder.addSlider(containerEl, {
			key: "graphZoomPreviewHeight",
			name: "Zoom preview height",
			desc: "Maximum height in pixels for the zoom preview panel",
			min: 120,
			max: 700,
			step: 10,
		});

		this.uiBuilder.addSlider(containerEl, {
			key: "graphZoomPreviewFrontmatterHeight",
			name: "Zoom preview frontmatter height",
			desc: "Maximum height in pixels for the frontmatter section in zoom preview",
			min: 50,
			max: 300,
			step: 5,
		});

		this.uiBuilder.addSlider(containerEl, {
			key: "graphAnimationDuration",
			name: "Graph animation duration",
			desc: "Duration of graph layout animations in milliseconds. Set to 0 for instant layout.",
			min: 0,
			max: 2000,
			step: 50,
		});

		this.uiBuilder.addSlider(containerEl, {
			key: "allRelatedMaxDepth",
			name: "All Related recursion depth",
			desc: "Maximum number of constellation levels to traverse when 'All Related' is enabled (1-20). Higher values show more distant relationships but may impact performance.",
			min: 1,
			max: 20,
			step: 1,
		});

		this.uiBuilder.addSlider(containerEl, {
			key: "hierarchyMaxDepth",
			name: "Hierarchy traversal depth",
			desc: "Maximum number of levels to traverse in hierarchy mode (1-50). Controls how deep the parent-child tree will be displayed.",
			min: 1,
			max: 50,
			step: 1,
		});

		this.uiBuilder.addTextArray(containerEl, {
			key: "displayNodeProperties",
			name: "Display properties in nodes",
			desc: "Comma-separated list of property names to display inside graph nodes (e.g., status, priority, type)",
			placeholder: "e.g., status, priority",
		});

		this.uiBuilder.addToggle(containerEl, {
			key: "showGraphTooltips",
			name: "Show node tooltips",
			desc: "Display property tooltips when hovering over nodes in the graph. Can also be toggled with a hotkey.",
		});

		this.uiBuilder.addSlider(containerEl, {
			key: "graphTooltipWidth",
			name: "Tooltip width",
			desc: "Maximum width of node tooltips in pixels (150-500px)",
			min: 150,
			max: 500,
			step: 5,
		});
	}

	private addPreviewSettings(containerEl: HTMLElement): void {
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

	private addColorSettings(containerEl: HTMLElement): void {
		const settings = this.plugin.settingsStore.currentSettings;

		new Setting(containerEl).setName("Node colors").setHeading();

		// Default color setting with color picker
		new Setting(containerEl)
			.setName("Default node color")
			.setDesc("Default color for nodes when no color rules match")
			.addColorPicker((colorPicker) => {
				colorPicker.setValue(settings.defaultNodeColor);
				colorPicker.onChange(async (value) => {
					await this.plugin.settingsStore.updateSettings((s) => ({
						...s,
						defaultNodeColor: value || SETTINGS_DEFAULTS.DEFAULT_NODE_COLOR,
					}));
				});
			});

		// Color rules section
		const colorRulesContainer = containerEl.createDiv();

		const desc = colorRulesContainer.createDiv();
		desc.createEl("p", {
			text: "Define color rules based on frontmatter properties. Rules are evaluated in order - the first matching rule determines the node color.",
		});

		// Examples section
		const examplesContainer = desc.createDiv("settings-info-box");

		examplesContainer.createEl("strong", { text: "Example color rules:" });
		const examplesList = examplesContainer.createEl("ul");

		const examples = [
			{
				expression: "Status === 'Active'",
				color: "#22c55e",
				description: "Active nodes in green",
			},
			{
				expression: "type === 'project'",
				color: "#3b82f6",
				description: "Project nodes in blue",
			},
			{
				expression: "Priority === 'High'",
				color: "#ef4444",
				description: "High priority nodes in red",
			},
			{
				expression: "Array.isArray(tags) && tags.includes('important')",
				color: "#f59e0b",
				description: "Important tagged nodes in orange",
			},
		];

		for (const example of examples) {
			const li = examplesList.createEl("li", { cls: "color-example-item" });

			li.createEl("code", { text: example.expression, cls: "settings-info-box-example" });

			li.createSpan({ text: "→", cls: "color-arrow" });

			const colorSpan = li.createEl("span", { cls: "color-example-dot" });
			colorSpan.style.setProperty("--example-color", example.color);

			li.createSpan({ text: example.description, cls: "color-example-description" });
		}

		// Warning section
		const warningContainer = desc.createDiv("settings-warning-box");
		warningContainer.createEl("strong", { text: "⚠️ Important:" });
		warningContainer.createEl("p", {
			text: "Access frontmatter properties directly by name. Invalid expressions will be ignored. Colors can be CSS color names, hex codes, or HSL values.",
		});

		// Color rules list
		const colorRulesListContainer = colorRulesContainer.createDiv();

		this.renderColorRulesList(colorRulesListContainer);

		// Add new color rule button
		new Setting(colorRulesContainer)
			.setName("Add color rule")
			.setDesc("Add a new color rule")
			.addButton((button) => {
				button.setButtonText("Add Rule");
				button.onClick(async () => {
					const newRule = {
						id: `color-rule-${Date.now()}`,
						expression: "",
						color: "hsl(200, 70%, 50%)",
						enabled: true,
					};

					await this.plugin.settingsStore.updateSettings((s) => ({
						...s,
						colorRules: [...s.colorRules, newRule],
					}));

					// Re-render the list
					this.renderColorRulesList(colorRulesListContainer);
				});
			});
	}

	// Helper methods for rule list rendering
	private createRuleToggle(checked: boolean, onChange: (checked: boolean) => Promise<void>): HTMLInputElement {
		const toggle = document.createElement("input");
		toggle.type = "checkbox";
		toggle.checked = checked;
		toggle.onchange = async () => {
			await onChange(toggle.checked);
		};
		return toggle;
	}

	private createRuleInput(
		value: string,
		placeholder: string,
		cssClass: string,
		onUpdate: (value: string) => Promise<void>
	): HTMLInputElement {
		const input = document.createElement("input");
		input.type = "text";
		input.value = value;
		input.placeholder = placeholder;
		input.className = cssClass;

		const update = async () => {
			await onUpdate(input.value);
		};

		input.addEventListener("blur", update);
		input.addEventListener("keydown", (e: KeyboardEvent) => {
			if (e.key === "Enter") {
				e.preventDefault();
				update();
			}
		});

		return input;
	}

	private createMoveButtons(
		container: HTMLElement,
		index: number,
		totalCount: number,
		onMoveUp: () => Promise<void>,
		onMoveDown: () => Promise<void>
	): void {
		if (index > 0) {
			const moveUpButton = container.createEl("button", {
				text: "↑",
				attr: { title: "Move up" },
				cls: "color-rule-btn",
			});
			moveUpButton.onclick = onMoveUp;
		}

		if (index < totalCount - 1) {
			const moveDownButton = container.createEl("button", {
				text: "↓",
				attr: { title: "Move down" },
				cls: "color-rule-btn",
			});
			moveDownButton.onclick = onMoveDown;
		}
	}

	private createDeleteButton(container: HTMLElement, onDelete: () => Promise<void>): void {
		const deleteButton = container.createEl("button", {
			text: "×",
			attr: { title: "Delete rule" },
			cls: "color-rule-btn color-rule-btn-delete",
		});
		deleteButton.onclick = onDelete;
	}

	private swapRules<T extends { id: string }>(rules: T[], ruleId: string, offset: number): T[] {
		const currentRules = [...rules];
		const ruleIndex = currentRules.findIndex((r) => r.id === ruleId);
		const targetIndex = ruleIndex + offset;

		if (ruleIndex !== -1 && targetIndex >= 0 && targetIndex < currentRules.length) {
			[currentRules[ruleIndex], currentRules[targetIndex]] = [currentRules[targetIndex], currentRules[ruleIndex]];
		}

		return currentRules;
	}

	private renderColorRulesList(container: HTMLElement): void {
		container.empty();
		const { colorRules } = this.plugin.settingsStore.currentSettings;

		if (colorRules.length === 0) {
			const emptyState = container.createDiv();
			emptyState.textContent = "No color rules defined. Click 'Add Rule' to create one.";
			return;
		}

		colorRules.forEach((rule, index) => {
			const ruleContainer = container.createDiv("color-rule-item");
			const mainRow = ruleContainer.createDiv("color-rule-main-row");
			const leftSection = mainRow.createDiv("color-rule-left");

			leftSection.createEl("span", {
				text: `#${index + 1}`,
				cls: "color-rule-order",
			});

			const enableToggle = this.createRuleToggle(rule.enabled, async (checked) => {
				await this.plugin.settingsStore.updateSettings((s) => ({
					...s,
					colorRules: s.colorRules.map((r) => (r.id === rule.id ? { ...r, enabled: checked } : r)),
				}));
			});
			leftSection.appendChild(enableToggle);

			const expressionInput = this.createRuleInput(
				rule.expression,
				"fm.Status === 'Active'",
				"color-rule-expression-input",
				async (value) => {
					await this.plugin.settingsStore.updateSettings((s) => ({
						...s,
						colorRules: s.colorRules.map((r) => (r.id === rule.id ? { ...r, expression: value } : r)),
					}));
				}
			);
			leftSection.appendChild(expressionInput);

			// Right section: color picker + controls
			const rightSection = mainRow.createDiv("color-rule-right");

			// Integrated color picker using Setting
			const colorPickerWrapper = rightSection.createDiv("color-rule-picker-wrapper");
			new Setting(colorPickerWrapper).addColorPicker((colorPicker) => {
				colorPicker.setValue(rule.color);
				colorPicker.onChange(async (value) => {
					await this.plugin.settingsStore.updateSettings((s) => ({
						...s,
						colorRules: s.colorRules.map((r) => (r.id === rule.id ? { ...r, color: value } : r)),
					}));
				});
			});

			const controlsSection = rightSection.createDiv("color-rule-controls");

			this.createMoveButtons(
				controlsSection,
				index,
				colorRules.length,
				async () => {
					await this.plugin.settingsStore.updateSettings((s) => ({
						...s,
						colorRules: this.swapRules(s.colorRules, rule.id, -1),
					}));
					this.renderColorRulesList(container);
				},
				async () => {
					await this.plugin.settingsStore.updateSettings((s) => ({
						...s,
						colorRules: this.swapRules(s.colorRules, rule.id, 1),
					}));
					this.renderColorRulesList(container);
				}
			);

			this.createDeleteButton(controlsSection, async () => {
				await this.plugin.settingsStore.updateSettings((s) => ({
					...s,
					colorRules: s.colorRules.filter((r) => r.id !== rule.id),
				}));
				this.renderColorRulesList(container);
			});
		});
	}

	private renderExcludedPropertyRulesList(container: HTMLElement): void {
		container.empty();
		const { pathExcludedProperties } = this.plugin.settingsStore.currentSettings;

		if (pathExcludedProperties.length === 0) {
			const emptyState = container.createDiv();
			emptyState.textContent =
				"No path-based exclusion rules defined. Click 'Add Rule' to create one. Default excluded properties will be used for all files.";
			return;
		}

		pathExcludedProperties.forEach((rule, index) => {
			const ruleContainer = container.createDiv("color-rule-item");
			const mainRow = ruleContainer.createDiv("color-rule-main-row");
			const leftSection = mainRow.createDiv("color-rule-left");

			leftSection.createEl("span", {
				text: `#${index + 1}`,
				cls: "color-rule-order",
			});

			const enableToggle = this.createRuleToggle(rule.enabled, async (checked) => {
				await this.plugin.settingsStore.updateSettings((s) => ({
					...s,
					pathExcludedProperties: s.pathExcludedProperties.map((r) =>
						r.id === rule.id ? { ...r, enabled: checked } : r
					),
				}));
			});
			leftSection.appendChild(enableToggle);

			const pathInput = this.createRuleInput(rule.path, "Projects/", "color-rule-expression-input", async (value) => {
				await this.plugin.settingsStore.updateSettings((s) => ({
					...s,
					pathExcludedProperties: s.pathExcludedProperties.map((r) => (r.id === rule.id ? { ...r, path: value } : r)),
				}));
			});
			leftSection.appendChild(pathInput);

			const rightSection = mainRow.createDiv("color-rule-right");

			const propertiesInput = this.createRuleInput(
				rule.excludedProperties.join(", "),
				"status, progress, date",
				"excluded-properties-input",
				async (value) => {
					const propsArray = value
						.split(",")
						.map((p) => p.trim())
						.filter((p) => p.length > 0);

					await this.plugin.settingsStore.updateSettings((s) => ({
						...s,
						pathExcludedProperties: s.pathExcludedProperties.map((r) =>
							r.id === rule.id ? { ...r, excludedProperties: propsArray } : r
						),
					}));
				}
			);
			rightSection.appendChild(propertiesInput);

			const controlsSection = rightSection.createDiv("color-rule-controls");

			this.createMoveButtons(
				controlsSection,
				index,
				pathExcludedProperties.length,
				async () => {
					await this.plugin.settingsStore.updateSettings((s) => ({
						...s,
						pathExcludedProperties: this.swapRules(s.pathExcludedProperties, rule.id, -1),
					}));
					this.renderExcludedPropertyRulesList(container);
				},
				async () => {
					await this.plugin.settingsStore.updateSettings((s) => ({
						...s,
						pathExcludedProperties: this.swapRules(s.pathExcludedProperties, rule.id, 1),
					}));
					this.renderExcludedPropertyRulesList(container);
				}
			);

			this.createDeleteButton(controlsSection, async () => {
				await this.plugin.settingsStore.updateSettings((s) => ({
					...s,
					pathExcludedProperties: s.pathExcludedProperties.filter((r) => r.id !== rule.id),
				}));
				this.renderExcludedPropertyRulesList(container);
			});
		});
	}

	private addFilteringSettings(containerEl: HTMLElement): void {
		new Setting(containerEl).setName("Graph filtering").setHeading();

		const desc = containerEl.createDiv();
		desc.createEl("p", {
			text: "Show only nodes (and their edges) whose frontmatter matches ALL expressions. Each line should be a JavaScript expression returning true/false. Access frontmatter properties directly by name. The source node is always shown.",
		});

		// Examples section
		const examplesContainer = desc.createDiv("settings-info-box");
		examplesContainer.createEl("strong", { text: "Example filter expressions:" });
		const examplesList = examplesContainer.createEl("ul");

		const examples = [
			{
				expression: "Status === 'Active'",
				description: "Only show nodes with Status = 'Active'",
			},
			{
				expression: "type === 'project'",
				description: "Only show project-type nodes",
			},
			{
				expression: "Array.isArray(tags) && tags.includes('important')",
				description: "Only show nodes tagged as important",
			},
		];

		for (const example of examples) {
			const li = examplesList.createEl("li", { cls: "color-example-item" });

			li.createEl("code", { text: example.expression, cls: "settings-info-box-example" });

			li.createSpan({ text: "→", cls: "color-arrow" });

			li.createSpan({ text: example.description, cls: "color-example-description" });
		}

		// Warning section
		const warningContainer = desc.createDiv("settings-warning-box");
		warningContainer.createEl("strong", { text: "⚠️ Important:" });
		warningContainer.createEl("p", {
			text: "Access frontmatter properties directly by name. Invalid expressions will be ignored. All expressions must evaluate to true for a node to be shown.",
		});

		this.uiBuilder.addTextArray(containerEl, {
			key: "filterExpressions",
			name: "Filter expressions",
			desc: "One per line. Changes apply on blur or Ctrl/Cmd+Enter. Only nodes matching all expressions are shown in the graph.",
			placeholder: "Status === 'Active'\ntype === 'project'",
			multiline: true,
		});

		// Filter presets section
		new Setting(containerEl).setName("Filter presets").setHeading();

		const presetDesc = containerEl.createDiv();
		presetDesc.createEl("p", {
			text: "Create named filter presets for quick access in the graph. Use the command 'Toggle Graph Filter (Preset Selector)' to show a dropdown with your presets. Selecting a preset fills the filter expression input.",
		});

		// Presets list
		const presetsListContainer = containerEl.createDiv();
		this.renderFilterPresetsList(presetsListContainer);

		// Add new preset button
		new Setting(containerEl)
			.setName("Add filter preset")
			.setDesc("Create a new filter preset")
			.addButton((button) => {
				button.setButtonText("Add Preset");
				button.onClick(async () => {
					const newPreset = {
						name: "",
						expression: "",
					};

					await this.plugin.settingsStore.updateSettings((s) => ({
						...s,
						filterPresets: [...s.filterPresets, newPreset],
					}));

					this.renderFilterPresetsList(presetsListContainer);
				});
			});
	}

	private renderFilterPresetsList(container: HTMLElement): void {
		container.empty();
		const { filterPresets } = this.plugin.settingsStore.settings$.value;

		if (filterPresets.length === 0) {
			const emptyState = container.createDiv("setting-item-description");
			emptyState.textContent = "No filter presets defined. Click 'Add Preset' to create one.";
			return;
		}

		for (let index = 0; index < filterPresets.length; index++) {
			const preset = filterPresets[index];
			const presetContainer = container.createDiv("filter-preset-item");

			// Name input
			const nameInput = presetContainer.createEl("input", {
				type: "text",
				value: preset.name,
				placeholder: "Preset name (e.g., 'Active Tasks', 'Projects')",
				cls: "filter-preset-name-input",
			});

			const updateName = async () => {
				await this.plugin.settingsStore.updateSettings((s) => ({
					...s,
					filterPresets: s.filterPresets.map((p, i) => (i === index ? { ...p, name: nameInput.value } : p)),
				}));
			};

			nameInput.addEventListener("blur", updateName);
			nameInput.addEventListener("keydown", (e: KeyboardEvent) => {
				if (e.key === "Enter") {
					e.preventDefault();
					updateName();
				}
			});

			// Expression input
			const expressionInput = presetContainer.createEl("input", {
				type: "text",
				value: preset.expression,
				placeholder: "Filter expression (e.g., Status === 'Active')",
				cls: "filter-preset-expression-input",
			});

			const updateExpression = async () => {
				await this.plugin.settingsStore.updateSettings((s) => ({
					...s,
					filterPresets: s.filterPresets.map((p, i) => (i === index ? { ...p, expression: expressionInput.value } : p)),
				}));
			};

			expressionInput.addEventListener("blur", updateExpression);
			expressionInput.addEventListener("keydown", (e: KeyboardEvent) => {
				if (e.key === "Enter") {
					e.preventDefault();
					updateExpression();
				}
			});

			// Delete button
			const deleteButton = presetContainer.createEl("button", {
				text: "×",
				attr: { title: "Delete preset" },
				cls: "filter-preset-btn-delete",
			});
			deleteButton.onclick = async () => {
				await this.plugin.settingsStore.updateSettings((s) => ({
					...s,
					filterPresets: s.filterPresets.filter((_, i) => i !== index),
				}));
				this.renderFilterPresetsList(container);
			};
		}
	}

	private addRescanSection(containerEl: HTMLElement): void {
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
							// Property management removed - manual sync only
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

	private addExampleSection(containerEl: HTMLElement): void {
		const { currentSettings: settings } = this.plugin.settingsStore;

		new Setting(containerEl).setName("How it works").setHeading();

		const exampleContainer = containerEl.createDiv("settings-info-box");

		exampleContainer.createEl("h3", { text: "Hierarchical structure example" });
		exampleContainer.createEl("p", {
			text: "The plugin visualizes a three-level hierarchy: Goals → Projects → Tasks",
		});

		const hierarchyExample = exampleContainer.createDiv();
		hierarchyExample.createEl("h4", { text: "Example structure:" });
		hierarchyExample.createEl("pre", {
			text: `# Goal file (in ${settings.goalsDirectory}/)
---
title: Complete Master's Degree
---

# Project file (in ${settings.projectsDirectory}/)
---
${settings.projectGoalProp}: "[[Complete Master's Degree]]"
title: Thesis Research
---

# Task file (in ${settings.tasksDirectory}/)
---
${settings.taskGoalProp}: "[[Complete Master's Degree]]"
${settings.taskProjectProp}: "[[Thesis Research]]"
title: Literature Review
---`,
			cls: "settings-info-box-example",
		});

		const infoBox = exampleContainer.createDiv("settings-info-note");
		infoBox.createEl("strong", { text: "ℹ️ Note: " });
		infoBox.appendText(
			"The graph view dynamically renders the hierarchy based on these property links. Projects and tasks automatically appear under their linked goals and projects."
		);
	}
}

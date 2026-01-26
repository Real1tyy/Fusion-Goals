import type { SettingsUIBuilder } from "@real1ty-obsidian-plugins";
import { Setting } from "obsidian";
import type FusionGoalsPlugin from "../../../main";
import type { BasesAdditionalView, FusionGoalsSettings, FusionGoalsSettingsSchema } from "../../../types/settings";
import { createDeleteButton, createMoveButtons, createRuleInput } from "../controls";
import type { SettingsSection } from "../types";

export class BasesViewSettingsSection implements SettingsSection {
	readonly id = "bases-view";
	readonly label = "Bases View";

	private additionalViewsContainer: HTMLElement | null = null;

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

		new Setting(container).setName("Date Formulas").setHeading();

		container
			.createDiv("setting-item-description")
			.setText(
				"Automatically calculate and display relative date information. " +
					"These formulas will add dynamic columns to all Bases view tables showing time relationships."
			);

		this.uiBuilder.addToggle(container, {
			key: "basesDaysRemainingEnabled",
			name: "Enable Days Remaining formula",
			desc: "When enabled, adds a 'Days Remaining' column showing relative time until the end date (e.g., 'in 5 days', '2 days ago').",
		});

		this.uiBuilder.addText(container, {
			key: "basesDaysRemainingProperty",
			name: "End date property",
			desc: "Name of the frontmatter property containing the end/due date (e.g., 'End Date', 'Due Date', 'Deadline').",
			placeholder: "End Date",
		});

		this.uiBuilder.addToggle(container, {
			key: "basesDaysSinceStartEnabled",
			name: "Enable Days Since Start formula",
			desc: "When enabled, adds a 'Days Since Start' column showing relative time from the start date (e.g., '5 days ago', 'in 2 days').",
		});

		this.uiBuilder.addText(container, {
			key: "basesDaysSinceStartProperty",
			name: "Start date property",
			desc: "Name of the frontmatter property containing the start date (e.g., 'Start Date', 'Started', 'Begin Date').",
			placeholder: "Start Date",
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

		this.renderAdditionalViews(container);

		new Setting(container).setName("Status-based views").setHeading();

		container
			.createDiv("setting-item-description")
			.setText(
				"Configure the property name and values used to generate status-based views. " +
					"A view will be automatically created for each status value. These appear after additional custom views."
			);

		this.uiBuilder.addText(container, {
			key: "basesStatusProperty",
			name: "Status property name",
			desc: "Name of the frontmatter property used for status filtering (e.g., 'Status', 'State', 'Progress')",
			placeholder: "Status",
		});

		this.uiBuilder.addTextArray(container, {
			key: "basesStatusValues",
			name: "Status values",
			desc: "Comma-separated list of status values. A view will be created for each value.",
			placeholder: "In progress, Inbox, Planned, Next Up, Done, Icebox",
		});

		this.uiBuilder.addTextArray(container, {
			key: "basesGoalsProperties",
			name: "Goals properties",
			desc: "Comma-separated list of frontmatter properties to show as columns when viewing Goals files (e.g., Status, Priority)",
			placeholder: "Status, Priority",
		});

		this.uiBuilder.addTextArray(container, {
			key: "basesTasksProperties",
			name: "Tasks properties",
			desc: "Comma-separated list of frontmatter properties to show as columns when viewing Tasks files (e.g., Goal, Status, Priority)",
			placeholder: "Goal, Status, Priority",
		});

		const infoBox = container.createDiv("fusion-bases-settings-info-box");
		infoBox.createEl("strong", { text: "Column Order:" });
		const orderList = infoBox.createEl("ol");
		orderList.createEl("li", { text: "file.name (always first)" });
		orderList.createEl("li", {
			text: "Properties specified above (in the order listed)",
		});
	}

	private renderAdditionalViews(container: HTMLElement): void {
		new Setting(container).setName("Additional custom views").setHeading();

		container
			.createDiv("setting-item-description")
			.setText(
				"Define additional custom views with your own filter expressions. These views will appear FIRST in the dropdown, before status-based views. Views are rendered in the order shown below."
			);

		new Setting(container).setName("Additional views").addButton((button) => {
			button.setButtonText("Add view").onClick(async () => {
				const settings = this.plugin.settingsStore.settings$.value;
				await this.plugin.settingsStore.updateSettings((current: FusionGoalsSettings) => ({
					...current,
					basesAdditionalViews: [
						...settings.basesAdditionalViews,
						{
							id: `view-${Date.now()}`,
							name: "New View",
							filter: "",
						},
					],
				}));
				this.renderAdditionalViewsList();
			});
		});

		this.additionalViewsContainer = container.createDiv("fusion-additional-views-list");
		this.renderAdditionalViewsList();
	}

	private renderAdditionalViewsList(): void {
		if (!this.additionalViewsContainer) return;

		this.additionalViewsContainer.empty();

		const settings = this.plugin.settingsStore.settings$.value;
		const views = settings.basesAdditionalViews;

		if (views.length === 0) {
			this.additionalViewsContainer.createDiv({
				text: "No additional views configured",
				cls: "setting-item-description",
			});
			return;
		}

		for (let i = 0; i < views.length; i++) {
			const view = views[i];
			this.renderAdditionalViewItem(view, i);
		}
	}

	private renderAdditionalViewItem(view: BasesAdditionalView, index: number): void {
		if (!this.additionalViewsContainer) return;

		const itemEl = this.additionalViewsContainer.createDiv({
			cls: "fusion-rule-item",
		});

		const headerEl = itemEl.createDiv({ cls: "fusion-rule-header" });
		headerEl.createEl("strong", { text: view.name || "Unnamed View" });

		const controlsEl = headerEl.createDiv({ cls: "fusion-rule-controls" });

		createMoveButtons({
			container: controlsEl,
			index,
			totalCount: this.plugin.settingsStore.settings$.value.basesAdditionalViews.length,
			onMoveUp: async () => this.swapViews(index, index - 1),
			onMoveDown: async () => this.swapViews(index, index + 1),
		});

		createDeleteButton(controlsEl, async () => {
			const settings = this.plugin.settingsStore.settings$.value;
			await this.plugin.settingsStore.updateSettings((current: FusionGoalsSettings) => ({
				...current,
				basesAdditionalViews: settings.basesAdditionalViews.filter((_, idx) => idx !== index),
			}));
			this.renderAdditionalViewsList();
		});

		const contentEl = itemEl.createDiv({ cls: "fusion-rule-content" });

		const nameInput = createRuleInput(view.name, "View name", "fusion-view-name-input", async (value) => {
			await this.updateView(index, { name: value });
		});
		contentEl.appendChild(nameInput);

		const filterInput = createRuleInput(view.filter, "Filter expression", "fusion-view-filter-input", async (value) => {
			await this.updateView(index, { filter: value });
		});
		contentEl.appendChild(filterInput);
	}

	private async swapViews(indexA: number, indexB: number): Promise<void> {
		const settings = this.plugin.settingsStore.settings$.value;
		const views = [...settings.basesAdditionalViews];

		[views[indexA], views[indexB]] = [views[indexB], views[indexA]];

		await this.plugin.settingsStore.updateSettings((current: FusionGoalsSettings) => ({
			...current,
			basesAdditionalViews: views,
		}));
		this.renderAdditionalViewsList();
	}

	private async updateView(index: number, updates: Partial<BasesAdditionalView>): Promise<void> {
		const settings = this.plugin.settingsStore.settings$.value;
		const views = [...settings.basesAdditionalViews];
		views[index] = { ...views[index], ...updates };

		await this.plugin.settingsStore.updateSettings((current: FusionGoalsSettings) => ({
			...current,
			basesAdditionalViews: views,
		}));
	}
}

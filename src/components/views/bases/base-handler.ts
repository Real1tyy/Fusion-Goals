import type { App, TFile } from "obsidian";
import type FusionGoalsPlugin from "../../../main";

export type ViewType = string;

export interface ViewOption {
	type: ViewType;
	label: string;
}

export interface TopLevelViewOption {
	id: string;
	label: string;
}

export interface BaseHandlerConfig {
	folder: string;
	properties: string[];
}

/**
 * Abstract base handler for generating base code block markdown
 * Provides common functionality for all file type handlers
 */
export abstract class BaseHandler {
	protected app: App;
	protected plugin: FusionGoalsPlugin;
	protected selectedView: ViewType = "status-in-progress";
	protected selectedTopLevelView: string | null = null;

	constructor(app: App, plugin: FusionGoalsPlugin) {
		this.app = app;
		this.plugin = plugin;
	}

	abstract canHandle(file: TFile): boolean;

	protected abstract getConfig(): BaseHandlerConfig;

	abstract generateBasesMarkdown(file: TFile): string;

	abstract getTopLevelOptions(): TopLevelViewOption[];

	/**
	 * Get available view options in the following order:
	 * 1. Additional custom views (user-defined, in order)
	 * 2. Status-based views (from settings)
	 * 3. Archived view (if enabled)
	 * 4. All view
	 * 5. All Archived view (if enabled)
	 */
	getViewOptions(): ViewOption[] {
		const settings = this.plugin.settingsStore.settings$.value;
		const options: ViewOption[] = [];

		// 1. Add additional custom views FIRST (in order)
		for (const view of settings.basesAdditionalViews) {
			options.push({ type: `custom-${view.id}`, label: view.name });
		}

		// 2. Add status-based views from settings
		for (const statusValue of settings.basesStatusValues) {
			const id = statusValue.toLowerCase().replace(/\s+/g, "-");
			options.push({ type: `status-${id}`, label: statusValue });
		}

		// 3. Add "Archived" view if enabled
		if (settings.excludeArchived) {
			options.push({ type: "archived", label: "Archived" });
		}

		// 4. Add "All" and "All Archived" at the end
		options.push({ type: "all", label: "All" });

		if (settings.excludeArchived) {
			options.push({ type: "all-archived", label: "All Archived" });
		}

		return options;
	}

	setSelectedView(view: ViewType): void {
		this.selectedView = view;
	}

	getSelectedView(): ViewType {
		return this.selectedView;
	}

	setSelectedTopLevelView(viewId: string): void {
		this.selectedTopLevelView = viewId;
	}

	getSelectedTopLevelView(): string | null {
		return this.selectedTopLevelView;
	}

	protected generateOrderArray(properties: string[]): string {
		const settings = this.plugin.settingsStore.settings$.value;
		const orderProps = ["file.name", ...properties];

		if (settings.basesDaysRemainingEnabled && settings.basesDaysRemainingProperty?.trim()) {
			orderProps.push("formula.Days Remaining");
		}

		if (settings.basesDaysSinceStartEnabled && settings.basesDaysSinceStartProperty?.trim()) {
			orderProps.push("formula.Days Since");
		}

		return orderProps.map((prop) => `      - ${prop}`).join("\n");
	}

	protected buildFormulasSection(): string {
		const settings = this.plugin.settingsStore.settings$.value;
		const customFormulas = settings.basesCustomFormulas;
		const daysRemainingEnabled = settings.basesDaysRemainingEnabled;
		const daysRemainingProperty = settings.basesDaysRemainingProperty;
		const daysSinceStartEnabled = settings.basesDaysSinceStartEnabled;
		const daysSinceStartProperty = settings.basesDaysSinceStartProperty;

		const hasCustomFormulas = customFormulas && customFormulas.trim() !== "";
		const hasDaysRemaining = daysRemainingEnabled && daysRemainingProperty && daysRemainingProperty.trim() !== "";
		const hasDaysSinceStart = daysSinceStartEnabled && daysSinceStartProperty && daysSinceStartProperty.trim() !== "";

		if (!hasCustomFormulas && !hasDaysRemaining && !hasDaysSinceStart) {
			return "";
		}

		let formulasContent = "";

		// Helper to generate date formula with proper property reference
		const generateDateFormula = (propertyName: string): string => {
			const propRef =
				propertyName.includes(" ") || /[^a-zA-Z0-9_]/.test(propertyName) ? `note["${propertyName}"]` : propertyName;
			return `date(if(${propRef}.toString().contains("T"),${propRef}.slice(0, 19).replace("T", " "),${propRef})).relative()`;
		};

		if (hasDaysRemaining) {
			formulasContent += `  Days Remaining: |-\n    ${generateDateFormula(daysRemainingProperty)}\n`;
		}

		if (hasDaysSinceStart) {
			formulasContent += `  Days Since: |-\n    ${generateDateFormula(daysSinceStartProperty)}\n`;
		}

		// Add custom formulas after
		if (hasCustomFormulas) {
			formulasContent += customFormulas;
			if (!customFormulas.endsWith("\n")) {
				formulasContent += "\n";
			}
		}

		return `formulas:\n${formulasContent}`;
	}

	protected buildSortSection(): string {
		const sort = this.plugin.settingsStore.settings$.value.basesCustomSort;
		if (!sort || sort.trim() === "") {
			return "";
		}
		return `\n    sort:\n${sort}`;
	}

	private buildFilterSection(filterExpression: string, applyArchivedFilter: boolean, settings: any): string {
		const getArchivedFilter = (): string => {
			if (!settings.excludeArchived || !applyArchivedFilter) {
				return "";
			}
			return `\n        - ${settings.archivedProp} != true`;
		};

		if (!filterExpression && !getArchivedFilter()) {
			return "";
		}

		const filterLine = filterExpression ? `\n        - ${filterExpression}` : "";
		return `    filters:
      and:${filterLine}${getArchivedFilter()}
`;
	}

	/**
	 * Generate view configuration with reactive archived filtering.
	 * Uses current settings for status property, archived filtering, and custom views.
	 */
	protected generateViewConfig(viewType: ViewType, orderArray: string, extraConfig = ""): string {
		const settings = this.plugin.settingsStore.settings$.value;
		const { basesStatusProperty, basesStatusValues, basesAdditionalViews, archivedProp, excludeArchived } = settings;

		let viewName = "";
		let filtersSection = "";

		// Determine view name and filters based on view type
		if (viewType.startsWith("custom-")) {
			const viewId = viewType.replace("custom-", "");
			const customView = basesAdditionalViews.find((v) => v.id === viewId);
			if (customView) {
				viewName = customView.name;
				filtersSection = this.buildFilterSection(customView.filter, true, settings);
			}
		} else if (viewType.startsWith("status-")) {
			const statusId = viewType.replace("status-", "");
			const statusValue = basesStatusValues.find((v) => v.toLowerCase().replace(/\s+/g, "-") === statusId) || "";
			viewName = statusValue;
			const filterExpr = `${basesStatusProperty} == "${statusValue}"`;
			filtersSection = this.buildFilterSection(filterExpr, true, settings);
		} else if (viewType === "archived") {
			viewName = "Archived";
			filtersSection = excludeArchived
				? `    filters:
      and:
        - ${archivedProp} == true
`
				: "";
		} else if (viewType === "all") {
			viewName = "All";
			filtersSection = this.buildFilterSection("", true, settings);
		} else if (viewType === "all-archived") {
			viewName = "All Archived";
			filtersSection = "";
		}

		const sortSection = this.buildSortSection();

		return `  - type: table
    name: ${viewName}
${filtersSection}    order:
${orderArray}${sortSection}${extraConfig}`;
	}
}

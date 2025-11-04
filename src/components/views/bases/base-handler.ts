import type { App, TFile } from "obsidian";
import type FusionGoalsPlugin from "../../../main";

export type ViewType =
	| "all"
	| "all-archived"
	| "full"
	| "in-progress"
	| "inbox"
	| "planned"
	| "next-up"
	| "done"
	| "icebox"
	| "archived";

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
	protected selectedView: ViewType = "full";
	protected selectedTopLevelView: string | null = null;

	constructor(app: App, plugin: FusionGoalsPlugin) {
		this.app = app;
		this.plugin = plugin;
	}

	abstract canHandle(file: TFile): boolean;

	protected abstract getConfig(): BaseHandlerConfig;

	abstract generateBasesMarkdown(file: TFile): string;

	abstract getTopLevelOptions(): TopLevelViewOption[];

	getViewOptions(): ViewOption[] {
		const settings = this.plugin.settingsStore.settings$.value;
		const baseOptions: ViewOption[] = [
			{ type: "full", label: "Full" },
			{ type: "in-progress", label: "In Progress" },
			{ type: "inbox", label: "Inbox" },
			{ type: "planned", label: "Planned" },
			{ type: "next-up", label: "Next Up" },
			{ type: "done", label: "Done" },
			{ type: "icebox", label: "Icebox" },
		];

		if (settings.excludeArchived) {
			baseOptions.push({ type: "archived", label: "Archived" });
		}

		baseOptions.push({ type: "all", label: "All" });

		if (settings.excludeArchived) {
			baseOptions.push({ type: "all-archived", label: "All Archived" });
		}

		return baseOptions;
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
		const orderProps = ["file.name", ...properties];
		return orderProps.map((prop) => `      - ${prop}`).join("\n");
	}

	protected generateCommonFormulas(): string {
		return `  Start: |
    date(
        note["Start Date"].toString().split(".")[0].replace("T"," ")
      ).format("YYYY-MM-DD")
  _priority_sort: |-
    [
      ["Very High", 1],
      ["High", 2],
      ["Medium-High", 3],
      ["Medium", 4],
      ["Medium-Low", 5],
      ["Low", 6],
      ["Very Low", 7],
      ["null", 8]
    ].filter(value[0] == Priority.toString())[0][1]
  _status_sort: |-
    [
      ["In progress", 1],
      ["Next Up", 2],
      ["Planned", 3],
      ["Inbox", 4],
      ["Icebox", 5],
      ["Done", 6],
      ["null", 7]
    ].filter(value[0] == Status.toString())[0][1]`;
	}

	protected generateCommonSort(): string {
		return `    sort:
      - property: formula._status_sort
        direction: ASC
      - property: formula._priority_sort
        direction: ASC
      - property: file.mtime
        direction: DESC`;
	}

	/**
	 * Generate view configuration with reactive archived filtering.
	 * Uses current settings for archivedProp and excludeArchived.
	 */
	protected generateViewConfig(viewType: ViewType, orderArray: string, extraConfig = ""): string {
		const { archivedProp, excludeArchived } = this.plugin.settingsStore.settings$.value;
		const getArchivedFilter = (isArchivedView: boolean): string => {
			if (!excludeArchived) {
				return "";
			}
			return `\n        - ${archivedProp} ${isArchivedView ? "==" : "!="} true`;
		};

		const statusMap: Record<ViewType, { name: string; filters?: string }> = {
			all: {
				name: "All",
				filters: excludeArchived
					? `    filters:
      and:${getArchivedFilter(false)}
`
					: undefined,
			},
			"all-archived": {
				name: "All Archived",
				filters: undefined,
			},
			full: {
				name: "Full",
				filters: `    filters:
      and:
        - Status != "Done"${getArchivedFilter(false)}
`,
			},
			"in-progress": {
				name: "In Progress",
				filters: `    filters:
      and:
        - Status == "In progress"${getArchivedFilter(false)}
`,
			},
			inbox: {
				name: "Inbox",
				filters: `    filters:
      and:
        - Status == "Inbox"${getArchivedFilter(false)}
`,
			},
			planned: {
				name: "Planned",
				filters: `    filters:
      and:
        - Status == "Planned"${getArchivedFilter(false)}
`,
			},
			"next-up": {
				name: "Next Up",
				filters: `    filters:
      and:
        - Status == "Next Up"${getArchivedFilter(false)}
`,
			},
			done: {
				name: "Done",
				filters: `    filters:
      and:
        - Status == "Done"${getArchivedFilter(false)}
`,
			},
			icebox: {
				name: "Icebox",
				filters: `    filters:
      and:
        - Status == "Icebox"${getArchivedFilter(false)}
`,
			},
			archived: {
				name: "Archived",
				filters: `    filters:
      and:${getArchivedFilter(true)}
`,
			},
		};

		const config = statusMap[viewType];

		return `  - type: table
    name: ${config.name}
${config.filters || ""}    order:
${orderArray}
${this.generateCommonSort()}${extraConfig}`;
	}
}

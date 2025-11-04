import type { App, TFile } from "obsidian";
import type FusionGoalsPlugin from "../../../main";

export type ArchiveViewType = "active" | "archived" | "all";

export interface ViewButton {
	type: ArchiveViewType;
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
	protected selectedView: ArchiveViewType = "active";

	constructor(app: App, plugin: FusionGoalsPlugin) {
		this.app = app;
		this.plugin = plugin;
	}

	abstract canHandle(file: TFile): boolean;

	protected abstract getConfig(): BaseHandlerConfig;

	abstract generateBasesMarkdown(file: TFile): string;

	getViewButtons(): ViewButton[] {
		return [
			{ type: "active", label: "Active" },
			{ type: "archived", label: "Archived" },
			{ type: "all", label: "All" },
		];
	}

	setSelectedView(view: ArchiveViewType): void {
		this.selectedView = view;
	}

	getSelectedView(): ArchiveViewType {
		return this.selectedView;
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

	protected generateViewConfig(viewType: ArchiveViewType, orderArray: string, extraConfig = ""): string {
		const viewName = viewType.charAt(0).toUpperCase() + viewType.slice(1);

		let filters = "";
		if (viewType === "active") {
			filters = `    filters:
      and:
        - _Archived != true
        - Status != "Done"
`;
		} else if (viewType === "archived") {
			filters = `    filters:
      and:
        - _Archived == true
`;
		}

		return `  - type: table
    name: ${viewName}
${filters}    order:
${orderArray}
${this.generateCommonSort()}${extraConfig}`;
	}
}

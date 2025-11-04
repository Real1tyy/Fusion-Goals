import type { TFile } from "obsidian";
import { BaseHandler, type BaseHandlerConfig } from "./base-handler";

export class TasksBaseHandler extends BaseHandler {
	canHandle(file: TFile): boolean {
		return file.path.startsWith("Tasks/") && file.name !== "Tasks.md";
	}

	protected getConfig(): BaseHandlerConfig {
		const settings = this.plugin.settingsStore.settings$.value;
		return {
			folder: "Tasks",
			properties: settings.basesTasksProperties,
		};
	}

	generateBasesMarkdown(_file: TFile): string {
		const config = this.getConfig();
		const orderArray = this.generateOrderArray(config.properties);

		let selectedView = "";
		if (this.selectedView === "active") {
			selectedView = this.generateActiveView(orderArray);
		} else if (this.selectedView === "archived") {
			selectedView = this.generateArchivedView(orderArray);
		} else {
			selectedView = this.generateAllView(orderArray);
		}

		return `\`\`\`base
filters:
  and:
    - file.inFolder("${config.folder}")
    - file.name != "${config.folder}"
formulas:
${this.generateCommonFormulas()}
views:
${selectedView}
\`\`\``;
	}

	private generateActiveView(orderArray: string): string {
		return `  - type: table
    name: Active
    filters:
      and:
        - _Archived != true
    order:
${orderArray}
${this.generateCommonSort()}`;
	}

	private generateArchivedView(orderArray: string): string {
		return `  - type: table
    name: Archived
    filters:
      and:
        - _Archived == true
    order:
${orderArray}
${this.generateCommonSort()}`;
	}

	private generateAllView(orderArray: string): string {
		return `  - type: table
    name: All
    order:
${orderArray}
${this.generateCommonSort()}`;
	}
}

import type { TFile } from "obsidian";
import { BaseHandler, type BaseHandlerConfig, type TopLevelViewOption } from "./base-handler";

/**
 * Handler for goals-specific base code blocks
 */
export class GoalsBaseHandler extends BaseHandler {
	constructor(app: any, plugin: any) {
		super(app, plugin);
		this.selectedTopLevelView = "projects";
	}

	canHandle(file: TFile): boolean {
		return file.path.startsWith("Goals/") && file.name !== "Goals.md";
	}

	protected getConfig(): BaseHandlerConfig {
		const settings = this.plugin.settingsStore.settings$.value;
		return {
			folder: this.selectedTopLevelView === "projects" ? "Projects" : "Tasks",
			properties: settings.basesGoalsProperties,
		};
	}

	getTopLevelOptions(): TopLevelViewOption[] {
		return [
			{ id: "projects", label: "Projects" },
			{ id: "tasks", label: "Tasks" },
		];
	}

	generateBasesMarkdown(_file: TFile): string {
		const config = this.getConfig();
		const orderArray = this.generateOrderArray(config.properties);
		const viewContent = this.generateViewConfig(this.selectedView, orderArray);

		const folder = config.folder;

		return `\`\`\`base
filters:
  and:
    - Goal.contains(this.file.asLink())
    - file.inFolder("${folder}")
formulas:
${this.generateCommonFormulas()}
views:
${viewContent}
\`\`\``;
	}
}

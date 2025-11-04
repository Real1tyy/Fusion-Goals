import type { TFile } from "obsidian";
import { BaseHandler, type BaseHandlerConfig, type TopLevelViewOption } from "./base-handler";

/**
 * Handler for projects-specific base code blocks
 * Shows tasks associated with the project
 */
export class ProjectsBaseHandler extends BaseHandler {
	constructor(app: any, plugin: any) {
		super(app, plugin);
		this.selectedTopLevelView = "tasks";
	}

	canHandle(file: TFile): boolean {
		return file.path.startsWith("Projects/") && file.name !== "Projects.md";
	}

	protected getConfig(): BaseHandlerConfig {
		const settings = this.plugin.settingsStore.settings$.value;
		return {
			folder: "Tasks",
			properties: settings.basesProjectsProperties,
		};
	}

	getTopLevelOptions(): TopLevelViewOption[] {
		return [{ id: "tasks", label: "Tasks" }];
	}

	generateBasesMarkdown(_file: TFile): string {
		const config = this.getConfig();
		const orderArray = this.generateOrderArray(config.properties);
		const formulasSection = this.buildFormulasSection();

		// Use different column sizes based on view type
		const columnSize = this.selectedView === "archived" ? 541 : 401;
		const viewContent = this.generateViewConfig(
			this.selectedView,
			orderArray,
			`
    columnSize:
      file.name: ${columnSize}`
		);

		return `\`\`\`base
filters:
  and:
    - Project.contains(this.file.asLink())
    - file.inFolder("Tasks")
${formulasSection}views:
${viewContent}
\`\`\``;
	}
}

import type { TFile } from "obsidian";
import { BaseHandler, type BaseHandlerConfig } from "./base-handler";

/**
 * Handler for projects-specific base code blocks
 * Shows tasks associated with the project
 */
export class ProjectsBaseHandler extends BaseHandler {
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

	generateBasesMarkdown(_file: TFile): string {
		const config = this.getConfig();
		const orderArray = this.generateOrderArray(config.properties);

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
formulas:
  _AllChildrenWithCurrent: file.properties._AllChildren.join(this.file.asLink())
${this.generateCommonFormulas()}
views:
${viewContent}
\`\`\``;
	}
}

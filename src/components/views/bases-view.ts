import { type App, Component, MarkdownRenderer } from "obsidian";
import { RegisteredEventsComponent } from "./component";

export const VIEW_TYPE_BASES = "fusion-bases-view";

/**
 * Bases view component that uses Obsidian's Bases API to render
 * Children, Parent, and Related files using native base code blocks
 */
export class BasesView extends RegisteredEventsComponent {
	private app: App;
	private contentEl: HTMLElement;
	private component: Component;

	constructor(app: App, containerEl: HTMLElement) {
		super();
		this.app = app;
		this.contentEl = containerEl;
		this.component = new Component();
		this.component.load();
	}

	async render(): Promise<void> {
		this.contentEl.empty();
		this.contentEl.addClass("fusion-bases-view");

		// Get the active file
		const activeFile = this.app.workspace.getActiveFile();

		if (!activeFile) {
			this.renderEmptyState("No active file. Open a note to see its bases view.");
			return;
		}

		// Detect file type based on folder
		const isTaskFile = activeFile.path.startsWith("Tasks/") && activeFile.name !== "Tasks.md";
		const isProjectFile = activeFile.path.startsWith("Projects/") && activeFile.name !== "Projects.md";
		const isGoalFile = activeFile.path.startsWith("Goals/") && activeFile.name !== "Goals.md";

		// Create the base code block markdown based on file type
		let basesMarkdown = "";

		if (isTaskFile) {
			// Task-specific base code block - shows archived tasks
			basesMarkdown = `
\`\`\`base
filters:
  and:
    - file.inFolder("Tasks")
    - file.name != "Tasks"
formulas:
  Start: |
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
    ].filter(value[0] == Status.toString())[0][1]
views:
  - type: table
    name: Archived
    filters:
      and:
        - _Archived == true
    order:
      - file.name
      - Goal
      - Project
      - Child
      - Related
      - Status
      - Priority
      - Difficulty
      - formula.Start
    sort:
      - property: formula._status_sort
        direction: ASC
      - property: formula._priority_sort
        direction: ASC
      - property: file.mtime
        direction: DESC
\`\`\`
`;
		} else if (isProjectFile) {
			// Project-specific base code block - shows tasks for this project
			basesMarkdown = `
\`\`\`base
filters:
  and:
    - Project.contains(this.file.asLink())
    - file.inFolder("Tasks")
formulas:
  _AllChildrenWithCurrent: file.properties._AllChildren.join(this.file.asLink())
  Start: |
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
    ].filter(value[0] == Status.toString())[0][1]
views:
  - type: table
    name: Full
    filters:
      and:
        - _Archived != true
        - Status != "Done"
    order:
      - file.name
      - Status
      - Priority
      - Difficulty
      - formula.Start
    sort:
      - property: formula._status_sort
        direction: ASC
      - property: formula._priority_sort
        direction: ASC
      - property: file.mtime
        direction: DESC
    columnSize:
      file.name: 401
\`\`\`
`;
		} else if (isGoalFile) {
			// Goal-specific base code block - shows projects for this goal
			basesMarkdown = `
\`\`\`base
filters:
  and:
    - Goal.contains(this.file.asLink())
    - file.inFolder("Projects")
formulas:
  Start: |
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
    ].filter(value[0] == Status.toString())[0][1]
views:
  - type: table
    name: Full
    filters:
      and:
        - _Archived != true
        - Status != "Done"
    order:
      - file.name
      - Status
      - Priority
      - Difficulty
      - formula.Start
    sort:
      - property: formula._status_sort
        direction: ASC
      - property: formula._priority_sort
        direction: ASC
      - property: file.mtime
        direction: DESC
\`\`\`
`;
		} else {
			// Empty base code block for all other files
			basesMarkdown = `
\`\`\`base
views:
  - type: table
    name: Empty
    filters:
      and:
        - false
\`\`\`
`;
		}

		// Create container for the rendered markdown
		const markdownContainer = this.contentEl.createDiv({
			cls: "fusion-bases-markdown-container",
		});

		// Render using Obsidian's MarkdownRenderer
		// This will process the base code block and render the tables
		await MarkdownRenderer.render(this.app, basesMarkdown, markdownContainer, activeFile.path, this.component);
	}

	private renderEmptyState(message: string): void {
		this.contentEl.createDiv({
			text: message,
			cls: "fusion-bases-empty-state",
		});
	}

	async updateActiveFile(): Promise<void> {
		await this.render();
	}

	destroy(): void {
		if (this.component) {
			this.component.unload();
		}

		this.contentEl.empty();
		this.cleanupEvents();
	}
}

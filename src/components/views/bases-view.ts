import { type App, Component, MarkdownRenderer } from "obsidian";
import type { Subscription } from "rxjs";
import type FusionGoalsPlugin from "../../main";
import { type BaseHandler, GoalsBaseHandler, ProjectsBaseHandler, TasksBaseHandler } from "./bases";
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
	private plugin: FusionGoalsPlugin;
	private settingsSubscription: Subscription | null = null;
	private viewSelectorEl: HTMLElement | null = null;
	private handlers: BaseHandler[];
	private currentHandler: BaseHandler | null = null;

	constructor(app: App, containerEl: HTMLElement, plugin: FusionGoalsPlugin) {
		super();
		this.app = app;
		this.contentEl = containerEl;
		this.plugin = plugin;
		this.component = new Component();
		this.component.load();

		this.handlers = [
			new TasksBaseHandler(app, plugin),
			new ProjectsBaseHandler(app, plugin),
			new GoalsBaseHandler(app, plugin),
		];

		// Subscribe to settings changes to re-render
		this.settingsSubscription = this.plugin.settingsStore.settings$.subscribe(() => {
			this.render();
		});
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

		this.currentHandler = this.handlers.find((handler) => handler.canHandle(activeFile)) ?? null;

		if (!this.currentHandler) {
			this.renderEmptyBase();
			return;
		}

		this.createViewSelector();

		const basesMarkdown = this.currentHandler.generateBasesMarkdown(activeFile);

		// Debug logging: Print the entire generated markdown structure
		console.log("=== Generated Base Markdown ===");
		console.log(basesMarkdown);
		console.log("=== End Base Markdown ===");

		// Create container for the rendered markdown
		const markdownContainer = this.contentEl.createDiv({
			cls: "fusion-bases-markdown-container",
		});

		// Render using Obsidian's MarkdownRenderer
		await MarkdownRenderer.render(this.app, basesMarkdown, markdownContainer, activeFile.path, this.component);
	}

	private createViewSelector(): void {
		if (!this.currentHandler) return;

		this.viewSelectorEl = this.contentEl.createDiv({
			cls: "fusion-bases-view-selector",
		});

		const viewButtons = this.currentHandler.getViewButtons();
		const currentView = this.currentHandler.getSelectedView();

		for (const { type, label } of viewButtons) {
			const button = this.viewSelectorEl.createEl("button", {
				text: label,
				cls: "fusion-bases-view-button",
			});

			if (type === currentView) {
				button.addClass("is-active");
			}

			button.addEventListener("click", async () => {
				if (this.currentHandler) {
					this.currentHandler.setSelectedView(type);
					await this.render();
				}
			});
		}
	}

	private renderEmptyBase(): void {
		this.renderEmptyState("Nothing configured for this note. This view only works with Goals, Projects, and Tasks.");
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
		if (this.settingsSubscription) {
			this.settingsSubscription.unsubscribe();
			this.settingsSubscription = null;
		}

		if (this.component) {
			this.component.unload();
		}

		this.currentHandler = null;
		this.viewSelectorEl = null;
		this.contentEl.empty();
		this.cleanupEvents();
	}
}

import type { App, TFile } from "obsidian";
import { formatDaysRemaining, getDaysRemainingClass } from "../utils/date";
import type { PropertyTooltip } from "./property-tooltip";

export interface DeadlineTableItem {
	file: TFile;
	title: string;
	daysRemaining: number | null;
	daysIncoming: number | null;
}

interface DeadlineTableOptions {
	app: App;
	container: HTMLElement;
	items: DeadlineTableItem[];
	emptyMessage: string;
	propertyTooltip: PropertyTooltip;
	onFileOpen: (file: TFile, ctrlKey: boolean) => Promise<void>;
}

export class DeadlineTable {
	private app: App;
	private container: HTMLElement;
	private propertyTooltip: PropertyTooltip;
	private onFileOpen: (file: TFile, ctrlKey: boolean) => Promise<void>;

	constructor(options: DeadlineTableOptions) {
		this.app = options.app;
		this.container = options.container;
		this.propertyTooltip = options.propertyTooltip;
		this.onFileOpen = options.onFileOpen;
	}

	render(items: DeadlineTableItem[], emptyMessage: string): void {
		this.container.empty();

		if (items.length === 0) {
			this.container.createEl("div", {
				cls: "startup-overview-empty",
				text: emptyMessage,
			});
			return;
		}

		const tableEl = this.container.createEl("table", { cls: "startup-overview-table" });

		this.renderTableHeader(tableEl);
		this.renderTableBody(tableEl, items);
	}

	private renderTableHeader(tableEl: HTMLTableElement): void {
		const thead = tableEl.createEl("thead");
		const headerRow = thead.createEl("tr");
		headerRow.createEl("th", { text: "Title" });
		headerRow.createEl("th", { text: "Days Remaining" });
		headerRow.createEl("th", { text: "Days Incoming" });
	}

	private renderTableBody(tableEl: HTMLTableElement, items: DeadlineTableItem[]): void {
		const tbody = tableEl.createEl("tbody");

		for (const item of items) {
			const row = tbody.createEl("tr");
			this.renderTitleCell(row, item);
			this.renderDaysCell(row, item.daysRemaining);
			this.renderDaysCell(row, item.daysIncoming);
		}
	}

	private renderTitleCell(row: HTMLTableRowElement, item: DeadlineTableItem): void {
		const titleCell = row.createEl("td");
		const link = titleCell.createEl("a", {
			cls: "startup-overview-link",
			text: item.title,
		});

		// Show PropertyTooltip on normal hover
		link.addEventListener("mouseenter", (e) => {
			this.propertyTooltip.show(item.file.path, e);
		});

		link.addEventListener("mouseleave", () => {
			this.propertyTooltip.scheduleHide(300);
		});

		// Trigger Obsidian hover preview with Ctrl+hover
		link.addEventListener("mouseover", (e) => {
			if (e.ctrlKey || e.metaKey) {
				this.app.workspace.trigger("hover-link", {
					event: e,
					source: "deadline-overview-modal",
					hoverParent: this,
					targetEl: link,
					linktext: item.file.path,
					sourcePath: "",
				});
			}
		});

		link.addEventListener("click", async (e) => {
			e.preventDefault();
			await this.onFileOpen(item.file, e.ctrlKey || e.metaKey);
		});
	}

	private renderDaysCell(row: HTMLTableRowElement, days: number | null): void {
		const cell = row.createEl("td");

		if (days !== null) {
			cell.setText(formatDaysRemaining(days));
			cell.addClass(`startup-overview-${getDaysRemainingClass(days)}`);
		} else {
			cell.setText("—");
			cell.addClass("startup-overview-empty-cell");
		}
	}
}

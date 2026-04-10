import { extractDisplayName, formatDateTimeForInput, inputValueToISOString } from "@real1ty-obsidian-plugins";
import {
	type App,
	Component,
	type MarkdownPostProcessorContext,
	MarkdownRenderChild,
	MarkdownRenderer,
	Modal,
	TFile,
} from "obsidian";

import { metricRepository } from "../core/metric-repository";
import type { MetricEntry } from "../types/metric";
import { MetricTimelineModal } from "./metric-timeline-modal";

interface MetricStats {
	total: number;
	count: number;
	velocity7d: number;
	velocity30d: number;
	velocity365d: number;
}

export class MetricBlockRenderer extends MarkdownRenderChild {
	constructor(
		containerEl: HTMLElement,
		private app: App,
		private sourceContent: string,
		private context: MarkdownPostProcessorContext
	) {
		super(containerEl);
		const file = this.app.vault.getFileByPath(this.context.sourcePath);
		if (file instanceof TFile) {
			metricRepository.loadFromRaw(this.sourceContent, this.app, file);
		}
	}

	override onload(): void {
		this.render();
	}

	private render(): void {
		const el = this.containerEl;
		el.empty();
		el.addClass("fusion-metric-block");

		this.renderStats(el);
		this.renderActions(el);
		this.renderTable(el);
	}

	private computeStats(): MetricStats {
		const entries = metricRepository.getAll();
		const now = Date.now();
		const ms7d = 7 * 24 * 60 * 60 * 1000;
		const ms30d = 30 * 24 * 60 * 60 * 1000;
		const ms365d = 365 * 24 * 60 * 60 * 1000;

		let total = 0;
		let velocity7d = 0;
		let velocity30d = 0;
		let velocity365d = 0;

		for (const entry of entries) {
			total += entry.value;
			const age = now - new Date(entry.timestamp).getTime();
			if (age <= ms7d) velocity7d += entry.value;
			if (age <= ms30d) velocity30d += entry.value;
			if (age <= ms365d) velocity365d += entry.value;
		}

		return { total, count: entries.length, velocity7d, velocity30d, velocity365d };
	}

	private renderStats(el: HTMLElement): void {
		if (metricRepository.getAll().length === 0) return;

		const stats = this.computeStats();
		const statsRow = el.createDiv({ cls: "fusion-metric-stats" });

		const items: [string, number][] = [
			["Total", stats.total],
			["Count", stats.count],
			["7d", stats.velocity7d],
			["30d", stats.velocity30d],
			["365d", stats.velocity365d],
		];

		for (const [label, value] of items) {
			const item = statsRow.createDiv({ cls: "fusion-metric-stats-item" });
			item.createSpan({ text: label, cls: "fusion-metric-stats-label" });
			item.createSpan({ text: String(value), cls: "fusion-metric-stats-value" });
		}
	}

	private renderActions(el: HTMLElement): void {
		const actionsRow = el.createDiv({ cls: "fusion-metric-actions" });

		const quickBtn = actionsRow.createEl("button", {
			text: "Quick +1",
			cls: "fusion-metric-btn",
		});
		quickBtn.addEventListener("click", () => {
			void this.addEntry(1, new Date().toISOString());
		});

		const customBtn = actionsRow.createEl("button", {
			text: "Add Custom",
			cls: "fusion-metric-btn",
		});
		customBtn.addEventListener("click", () => {
			this.showCustomInput(actionsRow);
		});

		const entries = metricRepository.getAll();
		if (entries.length > 0) {
			const timelineBtn = actionsRow.createEl("button", {
				text: "Timeline",
				cls: "fusion-metric-btn",
			});
			timelineBtn.addEventListener("click", () => {
				const fileName = extractDisplayName(this.context.sourcePath);
				new MetricTimelineModal(this.app, metricRepository.getAll(), `${fileName} — Timeline`).open();
			});
		}
	}

	private showCustomInput(actionsRow: HTMLElement): void {
		const existing = actionsRow.querySelector(".fusion-metric-custom-input-row");
		if (existing) return;

		const inputRow = actionsRow.createDiv({ cls: "fusion-metric-custom-input-row" });

		const valueInput = inputRow.createEl("input", {
			type: "number",
			placeholder: "Value",
			cls: "fusion-metric-custom-input",
		});

		const datetimeInput = inputRow.createEl("input", {
			type: "datetime-local",
			cls: "fusion-metric-datetime-input",
		});
		datetimeInput.value = formatDateTimeForInput(new Date().toISOString());

		const descriptionInput = inputRow.createEl("textarea", {
			placeholder: "Description (optional)",
			cls: "fusion-metric-description-input",
		});
		descriptionInput.rows = 2;

		const confirmBtn = inputRow.createEl("button", {
			text: "Add",
			cls: "fusion-metric-btn",
		});

		const handleConfirm = (): void => {
			const value = parseFloat(valueInput.value);
			if (isNaN(value)) return;
			const timestamp = inputValueToISOString(datetimeInput.value) ?? new Date().toISOString();
			const description = descriptionInput.value.trim() || undefined;
			inputRow.remove();
			void this.addEntry(value, timestamp, description);
		};

		confirmBtn.addEventListener("click", handleConfirm);

		const handleKeydown = (e: KeyboardEvent): void => {
			if (e.key === "Escape") {
				inputRow.remove();
			}
		};

		const handleInputKeydown = (e: KeyboardEvent): void => {
			if (e.key === "Enter") {
				handleConfirm();
			} else if (e.key === "Escape") {
				inputRow.remove();
			}
		};

		valueInput.addEventListener("keydown", handleInputKeydown);
		datetimeInput.addEventListener("keydown", handleInputKeydown);
		descriptionInput.addEventListener("keydown", handleKeydown);

		valueInput.focus();
	}

	private async addEntry(value: number, timestamp: string, description?: string): Promise<void> {
		const entry: MetricEntry = { timestamp, value, ...(description ? { description } : {}) };
		await metricRepository.create(entry);
		this.render();
	}

	private async deleteEntry(timestamp: string): Promise<void> {
		await metricRepository.delete(timestamp);
		this.render();
	}

	private async saveEditedEntry(
		oldTimestamp: string,
		value: number,
		timestamp: string,
		description?: string
	): Promise<void> {
		await metricRepository.update(oldTimestamp, { timestamp, value, ...(description ? { description } : {}) });
		this.render();
	}

	private renderTable(el: HTMLElement): void {
		const entries = metricRepository.getAll();
		if (entries.length === 0) return;

		const tableContainer = el.createDiv({ cls: "fusion-metric-table-container" });
		const table = tableContainer.createEl("table", { cls: "fusion-metric-table" });

		const thead = table.createEl("thead");
		const headerRow = thead.createEl("tr");
		headerRow.createEl("th", { text: "Date" });
		headerRow.createEl("th", { text: "Value" });
		headerRow.createEl("th", { text: "Description" });
		headerRow.createEl("th", { text: "Actions" });

		const tbody = table.createEl("tbody");

		for (const entry of entries) {
			const row = tbody.createEl("tr");
			const date = new Date(entry.timestamp);

			row.createEl("td", { text: date.toLocaleString() });
			row.createEl("td", { text: String(entry.value) });
			const descCell = row.createEl("td", { cls: "fusion-metric-description-cell" });
			if (entry.description) {
				const maxLen = 50;
				const truncated =
					entry.description.length > maxLen ? entry.description.slice(0, maxLen) + "…" : entry.description;
				descCell.createSpan({ text: truncated, cls: "fusion-metric-description-snippet" });
				if (entry.description.length > maxLen) {
					const viewBtn = descCell.createEl("button", {
						text: "View",
						cls: "fusion-metric-row-btn fusion-metric-description-view-btn",
					});
					viewBtn.addEventListener("click", () => {
						new MetricDescriptionModal(this.app, entry.description ?? "").open();
					});
				}
			}

			const actionsCell = row.createEl("td", { cls: "fusion-metric-row-actions" });

			const editBtn = actionsCell.createEl("button", {
				text: "Edit",
				cls: "fusion-metric-row-btn",
			});
			editBtn.addEventListener("click", () => {
				this.startInlineEdit(row, entry);
			});

			const deleteBtn = actionsCell.createEl("button", {
				text: "✕",
				cls: "fusion-metric-row-btn fusion-metric-row-btn-delete",
			});
			deleteBtn.addEventListener("click", () => {
				void this.deleteEntry(entry.timestamp);
			});
		}
	}

	private startInlineEdit(row: HTMLElement, entry: MetricEntry): void {
		row.empty();

		const dateCell = row.createEl("td");
		const datetimeInput = dateCell.createEl("input", {
			type: "datetime-local",
			cls: "fusion-metric-datetime-input",
		});
		datetimeInput.value = formatDateTimeForInput(entry.timestamp);

		const valueCell = row.createEl("td");
		const valueInput = valueCell.createEl("input", {
			type: "number",
			cls: "fusion-metric-custom-input",
		});
		valueInput.value = String(entry.value);

		const descriptionCell = row.createEl("td");
		const descriptionInput = descriptionCell.createEl("textarea", {
			placeholder: "Description (optional)",
			cls: "fusion-metric-description-input",
		});
		descriptionInput.rows = 2;
		descriptionInput.value = entry.description ?? "";

		const actionsCell = row.createEl("td", { cls: "fusion-metric-row-actions" });

		const confirmBtn = actionsCell.createEl("button", {
			text: "✓",
			cls: "fusion-metric-row-btn",
		});

		const cancelBtn = actionsCell.createEl("button", {
			text: "✕",
			cls: "fusion-metric-row-btn",
		});

		const handleConfirm = (): void => {
			const value = parseFloat(valueInput.value);
			if (isNaN(value)) return;
			const timestamp = inputValueToISOString(datetimeInput.value) ?? entry.timestamp;
			const description = descriptionInput.value.trim() || undefined;
			void this.saveEditedEntry(entry.timestamp, value, timestamp, description);
		};

		const handleCancel = (): void => {
			this.render();
		};

		confirmBtn.addEventListener("click", handleConfirm);
		cancelBtn.addEventListener("click", handleCancel);

		const handleInputKeydown = (e: KeyboardEvent): void => {
			if (e.key === "Enter") {
				handleConfirm();
			} else if (e.key === "Escape") {
				handleCancel();
			}
		};

		const handleTextareaKeydown = (e: KeyboardEvent): void => {
			if (e.key === "Escape") {
				handleCancel();
			}
		};

		valueInput.addEventListener("keydown", handleInputKeydown);
		datetimeInput.addEventListener("keydown", handleInputKeydown);
		descriptionInput.addEventListener("keydown", handleTextareaKeydown);

		valueInput.focus();
	}
}

class MetricDescriptionModal extends Modal {
	private component = new Component();

	constructor(
		app: App,
		private description: string
	) {
		super(app);
	}

	override onOpen(): void {
		const { contentEl, modalEl } = this;
		modalEl.addClass("fusion-metric-description-modal");
		contentEl.empty();
		this.component.load();

		contentEl.createEl("h3", { text: "Description" });
		const markdownContainer = contentEl.createDiv({ cls: "fusion-metric-description-full" });
		void MarkdownRenderer.render(this.app, this.description, markdownContainer, "", this.component);
	}

	override onClose(): void {
		this.component.unload();
		this.contentEl.empty();
	}
}

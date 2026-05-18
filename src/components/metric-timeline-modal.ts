import { Modal, type App } from "obsidian";
import { DataSet } from "vis-data";
import { Timeline, type TimelineOptions } from "vis-timeline";

import type { MetricEntry } from "../types/metric";

export class MetricTimelineModal extends Modal {
	private timeline: Timeline | null = null;
	private timelineContainer!: HTMLElement;

	constructor(
		app: App,
		private entries: MetricEntry[],
		private title: string
	) {
		super(app);
	}

	override onOpen(): void {
		const { contentEl, modalEl } = this;
		contentEl.empty();

		modalEl.addClass("fusion-metric-timeline-modal");

		const header = contentEl.createDiv("fusion-metric-timeline-modal-header");
		header.createEl("h2", { text: this.title });

		this.timelineContainer = contentEl.createDiv("fusion-metric-timeline-modal-container");

		this.renderTimeline();
	}

	override onClose(): void {
		if (this.timeline) {
			this.timeline.destroy();
			this.timeline = null;
		}
		this.contentEl.empty();
	}

	private renderTimeline(): void {
		if (this.timeline) {
			this.timeline.destroy();
			this.timeline = null;
		}

		if (this.entries.length === 0) {
			this.timelineContainer.empty();
			this.timelineContainer.createEl("p", {
				text: "No entries to display",
				cls: "fusion-metric-timeline-modal-empty",
			});
			return;
		}

		const sorted = [...this.entries].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
		const firstDate = new Date(sorted[0].timestamp);
		const lastDate = new Date(sorted[sorted.length - 1].timestamp);

		const timeSpan = lastDate.getTime() - firstDate.getTime();
		const padding = Math.max(timeSpan * 0.1, 86400000);
		const rangeStart = new Date(firstDate.getTime() - padding);
		const rangeEnd = new Date(lastDate.getTime() + padding);

		const timelineItems = this.entries.map((entry, index) => {
			const date = new Date(entry.timestamp);
			let title = `${date.toLocaleString()} — Value: ${entry.value}`;
			if (entry.description) {
				title += `\n${entry.description}`;
			}
			return {
				id: index,
				content: String(entry.value),
				title,
				start: date,
				type: "point" as const,
			};
		});

		const items = new DataSet(timelineItems);

		const options: TimelineOptions = {
			editable: false,
			selectable: false,
			showCurrentTime: true,
			zoomable: true,
			moveable: true,
			height: "600px",
			margin: { item: 10 },
			orientation: "top",
			start: rangeStart,
			end: rangeEnd,
			zoomMin: 86400000,
			zoomMax: 31536000000 * 10,
			stack: true,
			verticalScroll: true,
			maxHeight: "600px",
		};

		this.timelineContainer.empty();
		this.timeline = new Timeline(this.timelineContainer, items, options);
	}
}

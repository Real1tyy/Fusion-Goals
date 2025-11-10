import { extractDisplayName, getFileContext } from "@real1ty-obsidian-plugins/utils";
import type { App } from "obsidian";
import type { Subscription } from "rxjs";
import { extractDateInfo } from "src/utils/date";
import type { SettingsStore } from "../core/settings-store";
import type { FusionGoalsSettings } from "../types/settings";
import { filterSpecificProperties, formatValue, parseInlineWikiLinks } from "../utils/frontmatter-value";

export interface PropertyTooltipOptions {
	settingsStore: SettingsStore;
	currentFilePath?: string;
	onFileOpen?: (filePath: string, event: MouseEvent) => void;
	isZoomMode?: () => boolean;
	hideDateInfo?: boolean;
	tooltipWidth?: number;
}

export class PropertyTooltip {
	private tooltipEl: HTMLElement | null = null;
	private hideTimer: number | null = null;
	private settings: FusionGoalsSettings;
	private settingsSubscription: Subscription | null = null;
	private currentFilePath: string | null = null;
	private currentMouseEvent: MouseEvent | null = null;

	constructor(
		private app: App,
		private options: PropertyTooltipOptions
	) {
		this.settings = options.settingsStore.currentSettings;

		// Subscribe to settings changes to update tooltip dynamically
		this.settingsSubscription = options.settingsStore.settings$.subscribe((settings) => {
			const previousSettings = this.settings;
			this.settings = settings;

			if (this.tooltipEl && this.currentFilePath && this.currentMouseEvent) {
				if (
					previousSettings.graphTooltipShowDates !== settings.graphTooltipShowDates ||
					previousSettings.graphShowDaysSince !== settings.graphShowDaysSince ||
					previousSettings.graphShowDaysRemaining !== settings.graphShowDaysRemaining ||
					previousSettings.startDateProperty !== settings.startDateProperty ||
					previousSettings.endDateProperty !== settings.endDateProperty
				) {
					this.show(this.currentFilePath, this.currentMouseEvent);
				} else {
					this.tooltipEl.style.maxWidth = `${settings.graphTooltipWidth}px`;
				}
			}
		});
	}

	show(filePath: string, mouseEvent: MouseEvent): void {
		this.currentFilePath = filePath;
		this.currentMouseEvent = mouseEvent;

		// Don't show tooltip if setting is disabled
		if (!this.settings.showGraphTooltips) {
			return;
		}

		if (this.options.isZoomMode?.()) {
			return;
		}

		if (this.settings.displayNodeProperties.length === 0) {
			return;
		}

		const { file, frontmatter } = getFileContext(this.app, filePath);
		if (!file || !frontmatter) {
			return;
		}

		const propertyData = filterSpecificProperties(frontmatter, this.settings.displayNodeProperties, this.settings);

		// Create tooltip element
		this.hide();
		this.tooltipEl = document.createElement("div");
		this.tooltipEl.addClass("nexus-property-tooltip");
		const tooltipWidth = this.options.tooltipWidth ?? this.settings.graphTooltipWidth;
		this.tooltipEl.style.maxWidth = `${tooltipWidth}px`;

		// Keep tooltip open when hovering over it
		this.tooltipEl.addEventListener("mouseenter", () => {
			this.cancelHideTimer();
		});

		this.tooltipEl.addEventListener("mouseleave", () => {
			this.hide();
		});

		// Add clickable title at the top
		const displayName = extractDisplayName(filePath);
		const titleEl = this.tooltipEl.createEl("div", {
			cls: "nexus-property-tooltip-title",
		});

		const titleLink = titleEl.createEl("a", {
			text: displayName,
			cls: "nexus-property-tooltip-title-link",
		});

		titleLink.addEventListener("click", (e) => {
			e.preventDefault();
			e.stopPropagation();
			if (this.options.onFileOpen) {
				this.options.onFileOpen(filePath, e);
			}
		});

		const hasDateInfo = !this.options.hideDateInfo && this.renderDateInfo(this.tooltipEl, frontmatter);

		if (hasDateInfo || propertyData.length > 0) {
			this.tooltipEl.createDiv("nexus-property-tooltip-separator");
		}

		for (const { key, value } of propertyData) {
			const propEl = this.tooltipEl.createDiv("nexus-property-tooltip-item");
			const keyEl = propEl.createSpan("nexus-property-tooltip-key");
			keyEl.setText(`${key}:`);
			const valueEl = propEl.createSpan("nexus-property-tooltip-value");

			// Render value with clickable links
			this.renderPropertyValue(valueEl, value);
		}

		// Position tooltip to the left of cursor to avoid context menu overlap
		// NOTE: Inline styles are acceptable here - runtime-calculated position during hover interaction
		document.body.appendChild(this.tooltipEl);

		// Position to the left to avoid context menu (which appears on right-click)
		const offsetX = 35;
		const offsetY = 10;

		// Check if tooltip would go off-screen and adjust if needed
		const tooltipRect = this.tooltipEl.getBoundingClientRect();
		let left = mouseEvent.clientX - tooltipRect.width - offsetX;
		const top = mouseEvent.clientY + offsetY;

		// If tooltip goes off the left edge, position to the right of cursor instead
		if (left < 0) {
			left = mouseEvent.clientX + 15;
		}

		// Ensure tooltip doesn't go off the bottom
		let adjustedTop = top;
		if (top + tooltipRect.height > window.innerHeight) {
			adjustedTop = window.innerHeight - tooltipRect.height - 10;
		}

		this.tooltipEl.style.left = `${left}px`;
		this.tooltipEl.style.top = `${adjustedTop}px`;
	}

	hide(): void {
		this.cancelHideTimer();

		if (this.tooltipEl) {
			this.tooltipEl.remove();
			this.tooltipEl = null;
		}

		// Clear current state when hiding
		this.currentFilePath = null;
		this.currentMouseEvent = null;
	}

	scheduleHide(delayMs = 300): void {
		this.cancelHideTimer();

		this.hideTimer = window.setTimeout(() => {
			this.hide();
			this.hideTimer = null;
		}, delayMs);
	}

	cancelHideTimer(): void {
		if (this.hideTimer !== null) {
			window.clearTimeout(this.hideTimer);
			this.hideTimer = null;
		}
	}

	private renderPropertyValue(container: HTMLElement, value: unknown): void {
		if (value === null || value === undefined) {
			container.setText("");
			return;
		}

		// Handle arrays
		if (Array.isArray(value)) {
			const stringValues = value.filter((item) => typeof item === "string");

			if (stringValues.length === 0) {
				container.setText("");
				return;
			}

			// Render each item
			for (let i = 0; i < stringValues.length; i++) {
				if (i > 0) {
					container.createSpan({ text: ", ", cls: "nexus-property-separator" });
				}
				this.renderStringValue(container, stringValues[i]);
			}
			return;
		}

		// Handle strings with potential wiki links
		if (typeof value === "string") {
			this.renderStringValue(container, value);
			return;
		}

		container.setText(formatValue(value));
	}

	private renderStringValue(container: HTMLElement, text: string): void {
		const segments = parseInlineWikiLinks(text);

		for (const segment of segments) {
			if (segment.type === "text") {
				container.createSpan({ text: segment.content });
			} else if (segment.type === "link" && segment.linkPath && segment.displayText) {
				const linkEl = container.createEl("a", {
					text: segment.displayText,
					cls: "nexus-property-link",
				});

				linkEl.addEventListener("click", (e) => {
					e.preventDefault();
					e.stopPropagation();
					if (this.options.onFileOpen && segment.linkPath) {
						this.options.onFileOpen(segment.linkPath, e);
					}
				});
			}
		}
	}

	private renderDateInfo(tooltipEl: HTMLElement, frontmatter: Record<string, unknown>): boolean {
		// Don't show dates if the setting is disabled
		if (!this.settings.graphTooltipShowDates) {
			return false;
		}

		const dateParts = extractDateInfo({
			frontmatter,
			startDateProperty: this.settings.startDateProperty,
			endDateProperty: this.settings.endDateProperty,
			showDaysSince: this.settings.graphShowDaysSince,
			showDaysRemaining: this.settings.graphShowDaysRemaining,
		});

		if (dateParts.length === 0) return false;

		// Render date info
		const dateContainer = tooltipEl.createDiv("nexus-property-tooltip-dates");

		for (const { label, value } of dateParts) {
			const dateItem = dateContainer.createDiv("nexus-property-tooltip-date-item");
			dateItem.createSpan({ text: `${label}: `, cls: "nexus-property-tooltip-date-label" });
			dateItem.createSpan({ text: value, cls: "nexus-property-tooltip-date-value" });
		}

		return true;
	}

	destroy(): void {
		if (this.settingsSubscription) {
			this.settingsSubscription.unsubscribe();
			this.settingsSubscription = null;
		}

		this.hide();
	}
}

import { type App, Modal, TFile } from "obsidian";
import type { Subscription } from "rxjs";
import type { Indexer } from "../core/indexer";
import type { SettingsStore } from "../core/settings-store";
import { FILE_TYPE_CONFIG, type FileType } from "../types/constants";
import { parseDaysFromString } from "../utils/date";
import { buildPropertyMapping, sanitizeExpression } from "../utils/expression";
import { DeadlineTable, type DeadlineTableItem } from "./deadline-table";
import { GraphFilter } from "./graph-filter";
import { GraphSearch } from "./graph-search";
import { PropertyTooltip } from "./property-tooltip";

interface TableItem {
	file: TFile;
	title: string;
	filePath: string;
	fileType: FileType;
	daysRemaining: number | null;
	daysIncoming: number | null;
	frontmatter: Record<string, unknown>;
}

type SortMode = "days-remaining" | "days-incoming";
type SortOrder = "asc" | "desc";

const ITEMS_PER_PAGE = 20;

export class DeadlineOverviewModal extends Modal {
	private indexer: Indexer;
	private settingsSubscription?: Subscription;
	private currentTab: FileType = "goal";
	private currentPage = 1;
	private itemsPerPage = ITEMS_PER_PAGE;
	private sortMode: SortMode = "days-remaining";
	private sortOrder: SortOrder = "asc";
	private allItems: Map<FileType, TableItem[]> = new Map();
	private showPastEvents = false;
	private showFutureEvents = false;
	private graphSearch: GraphSearch | null = null;
	private graphFilter: GraphFilter | null = null;
	private searchFilterContainer: HTMLElement | null = null;
	private isInitialRender = true;
	private propertyTooltip: PropertyTooltip;
	private deadlineTable: DeadlineTable | null = null;

	constructor(
		app: App,
		indexer: Indexer,
		private settingsStore: SettingsStore
	) {
		super(app);
		this.indexer = indexer;

		this.propertyTooltip = new PropertyTooltip(this.app, {
			settingsStore: this.settingsStore,
			onFileOpen: async (filePath, event) => {
				const file = this.app.vault.getAbstractFileByPath(filePath);
				if (!(file instanceof TFile)) return;

				if (event.ctrlKey || event.metaKey) {
					await this.app.workspace.getLeaf("tab").openFile(file);
				} else {
					await this.app.workspace.getLeaf().openFile(file);
					this.close();
				}
			},
		});
	}

	private async setupAndRender(): Promise<void> {
		await this.loadData();
		this.renderContent();
	}

	async onOpen(): Promise<void> {
		const { contentEl } = this;
		contentEl.addClass("startup-overview-modal");

		await this.setupAndRender();

		this.settingsSubscription = this.settingsStore.settings$.subscribe(async () => {
			await this.setupAndRender();
		});
	}

	private async loadData(): Promise<void> {
		const goals: TableItem[] = [];
		const projects: TableItem[] = [];
		const tasks: TableItem[] = [];

		for (const [filePath, relationships] of this.indexer.getRelationshipsCache()) {
			const file = this.app.vault.getAbstractFileByPath(filePath);
			if (!(file instanceof TFile)) continue;

			const settings = this.settingsStore.settings$.value;
			if (settings.deadlineFilterExpressions.length > 0) {
				const passesFilters = this.evaluateGlobalFilters(relationships.frontmatter, settings.deadlineFilterExpressions);
				if (!passesFilters) {
					continue;
				}
			}

			const daysRemaining = relationships.daysRemaining ? parseDaysFromString(relationships.daysRemaining) : null;
			const daysIncoming = relationships.daysSince ? parseDaysFromString(relationships.daysSince) : null;

			const item: TableItem = {
				file,
				title: file.basename,
				filePath,
				fileType: relationships.type,
				daysRemaining,
				daysIncoming,
				frontmatter: relationships.frontmatter,
			};

			switch (relationships.type) {
				case "goal":
					goals.push(item);
					break;
				case "project":
					projects.push(item);
					break;
				case "task":
					tasks.push(item);
					break;
			}
		}

		this.allItems.set("goal", goals);
		this.allItems.set("project", projects);
		this.allItems.set("task", tasks);
	}

	private getFilteredItemsForType(fileType: FileType): TableItem[] {
		let items = this.allItems.get(fileType) || [];

		// Filter based on past/future event toggles
		items = items.filter((item) => {
			// Past events: daysRemaining is negative
			const isPastEvent = item.daysRemaining !== null && item.daysRemaining < 0;

			// Future events: daysIncoming is positive
			const isFutureEvent = item.daysIncoming !== null && item.daysIncoming > 0;

			// Current/active events: not past and not future
			const isCurrentEvent = !isPastEvent && !isFutureEvent;

			if (isCurrentEvent) return true;
			if (isPastEvent && this.showPastEvents) return true;
			if (isFutureEvent && this.showFutureEvents) return true;

			return false;
		});

		if (this.graphSearch) {
			items = items.filter((item) => this.graphSearch!.shouldInclude(item.title));
		}

		if (this.graphFilter) {
			items = items.filter((item) => this.graphFilter!.shouldInclude(item.frontmatter));
		}

		return items;
	}

	private getSortedItems(): TableItem[] {
		const items = this.getFilteredItemsForType(this.currentTab);

		return [...items].sort((a, b) => {
			let aValue: number | null;
			let bValue: number | null;

			if (this.sortMode === "days-remaining") {
				aValue = a.daysRemaining;
				bValue = b.daysRemaining;
			} else {
				aValue = a.daysIncoming;
				bValue = b.daysIncoming;
			}

			if (aValue === null && bValue === null) return 0;
			if (aValue === null) return 1;
			if (bValue === null) return -1;

			const diff = aValue - bValue;
			return this.sortOrder === "asc" ? diff : -diff;
		});
	}

	private evaluateGlobalFilters(frontmatter: Record<string, unknown>, expressions: string[]): boolean {
		return expressions.every((expression) => {
			try {
				const propertyMapping = buildPropertyMapping(Object.keys(frontmatter));
				const sanitized = sanitizeExpression(expression.trim(), propertyMapping);
				const params = Array.from(propertyMapping.values());
				const func = new Function(...params, `"use strict"; return ${sanitized};`) as (...args: any[]) => boolean;
				const values = Array.from(propertyMapping.keys()).map((key) => frontmatter[key]);
				return func(...values);
			} catch (error) {
				console.warn("Invalid global filter expression:", expression, error);
				return true; // Skip invalid filters
			}
		});
	}

	private getPaginatedItems(): TableItem[] {
		const startIdx = (this.currentPage - 1) * this.itemsPerPage;
		const endIdx = startIdx + this.itemsPerPage;
		return this.getSortedItems().slice(startIdx, endIdx);
	}

	private getTotalPages(): number {
		return Math.ceil(this.getSortedItems().length / this.itemsPerPage);
	}

	private renderContent(): void {
		const { contentEl } = this;

		if (this.isInitialRender) {
			contentEl.empty();

			const headerEl = contentEl.createEl("div", { cls: "startup-overview-header" });
			headerEl.createEl("h2", { text: "Deadlines Overview" });

			this.renderPastEventsToggle(contentEl);
			contentEl.createEl("div", { cls: "deadline-overview-tabs-container" });

			this.renderSearchAndFilter(contentEl);

			contentEl.createEl("div", { cls: "deadline-overview-sort-container" });
			contentEl.createEl("div", { cls: "deadline-overview-table-container" });
			contentEl.createEl("div", { cls: "deadline-overview-pagination-container" });

			this.isInitialRender = false;
		}

		// Update only the dynamic parts
		this.updateTabs();
		this.updateSortControls();
		this.updateTable();
		this.updatePagination();
	}

	private updateTabs(): void {
		const container = this.contentEl.querySelector(".deadline-overview-tabs-container") as HTMLElement;
		if (!container) return;

		container.empty();
		const tabsContainer = container.createEl("div", { cls: "startup-overview-tabs" });

		for (const [fileType, config] of Object.entries(FILE_TYPE_CONFIG) as Array<
			[FileType, (typeof FILE_TYPE_CONFIG)[FileType]]
		>) {
			const tabEl = tabsContainer.createEl("button", {
				cls: `startup-overview-tab${this.currentTab === fileType ? " active" : ""}`,
			});
			tabEl.createEl("span", { text: config.icon });
			tabEl.createEl("span", { text: config.tabLabel });

			const count = this.getFilteredCountForType(fileType);
			tabEl.createEl("span", { text: `(${count})`, cls: "startup-overview-tab-count" });

			tabEl.addEventListener("click", () => {
				this.currentTab = fileType;
				this.currentPage = 1;
				this.renderContent();
			});
		}
	}

	private getFilteredCountForType(fileType: FileType): number {
		return this.getFilteredItemsForType(fileType).length;
	}

	private renderPastEventsToggle(container: HTMLElement): void {
		const toggleContainer = container.createEl("div", { cls: "deadline-overview-toggle-container" });

		const createToggle = (labelText: string, checked: boolean, onChange: (checked: boolean) => void) => {
			const label = toggleContainer.createEl("label", { cls: "deadline-overview-toggle-label" });

			const checkbox = label.createEl("input", {
				type: "checkbox",
				cls: "deadline-overview-toggle-checkbox",
			});
			checkbox.checked = checked;

			checkbox.addEventListener("change", () => {
				onChange(checkbox.checked);
				this.currentPage = 1;
				this.renderContent();
			});

			label.createEl("span", { text: labelText, cls: "deadline-overview-toggle-text" });
		};

		createToggle("Past events", this.showPastEvents, (checked) => {
			this.showPastEvents = checked;
		});
		createToggle("Future events", this.showFutureEvents, (checked) => {
			this.showFutureEvents = checked;
		});
	}

	private renderSearchAndFilter(container: HTMLElement): void {
		if (!this.searchFilterContainer) {
			this.searchFilterContainer = container.createEl("div", { cls: "deadline-overview-filters" });

			const searchContainer = this.searchFilterContainer.createEl("div", { cls: "deadline-overview-search" });
			this.graphSearch = new GraphSearch(
				searchContainer,
				() => {
					this.currentPage = 1;
					this.renderContent();
				},
				true
			);

			const filterInputContainer = this.searchFilterContainer.createEl("div", { cls: "deadline-overview-filter" });
			this.graphFilter = new GraphFilter(
				filterInputContainer,
				() => {
					this.currentPage = 1;
					this.renderContent();
				},
				true
			);
		} else {
			container.appendChild(this.searchFilterContainer);
		}
	}

	private updateSortControls(): void {
		const container = this.contentEl.querySelector(".deadline-overview-sort-container") as HTMLElement;
		if (!container) return;

		container.empty();
		const sortContainer = container.createEl("div", { cls: "startup-overview-sort" });

		// Sort mode selector
		const sortModeContainer = sortContainer.createEl("div", { cls: "startup-overview-sort-mode" });
		sortModeContainer.createEl("span", { text: "Sort by:", cls: "startup-overview-sort-label" });

		const sortModes: Array<{ mode: SortMode; label: string }> = [
			{ mode: "days-remaining", label: "Days Remaining" },
			{ mode: "days-incoming", label: "Days Incoming" },
		];

		for (const mode of sortModes) {
			const button = sortModeContainer.createEl("button", {
				cls: `startup-overview-sort-button${this.sortMode === mode.mode ? " active" : ""}`,
				text: mode.label,
			});

			button.addEventListener("click", () => {
				this.sortMode = mode.mode;
				this.currentPage = 1;
				this.renderContent();
			});
		}

		// Sort order toggle
		const sortOrderButton = sortContainer.createEl("button", {
			cls: "startup-overview-sort-order",
			title: this.sortOrder === "asc" ? "Ascending" : "Descending",
		});
		sortOrderButton.createEl("span", { text: this.sortOrder === "asc" ? "↑" : "↓" });
		sortOrderButton.createEl("span", { text: this.sortOrder === "asc" ? "Ascending" : "Descending" });

		sortOrderButton.addEventListener("click", () => {
			this.sortOrder = this.sortOrder === "asc" ? "desc" : "asc";
			this.renderContent();
		});
	}

	private updateTable(): void {
		const container = this.contentEl.querySelector(".deadline-overview-table-container") as HTMLElement;
		if (!container) return;

		if (!this.deadlineTable) {
			this.deadlineTable = new DeadlineTable({
				app: this.app,
				container,
				items: [],
				emptyMessage: "",
				propertyTooltip: this.propertyTooltip,
				onFileOpen: async (file: TFile, ctrlKey: boolean) => {
					if (ctrlKey) {
						await this.app.workspace.getLeaf("tab").openFile(file);
					} else {
						await this.app.workspace.getLeaf().openFile(file);
						this.close();
					}
				},
			});
		}

		const items = this.getPaginatedItems();
		const config = FILE_TYPE_CONFIG[this.currentTab];
		const emptyMessage = `No ${config.plural} found`;

		// Convert TableItem to DeadlineTableItem
		const tableItems: DeadlineTableItem[] = items.map((item) => ({
			file: item.file,
			title: item.title,
			daysRemaining: item.daysRemaining,
			daysIncoming: item.daysIncoming,
		}));

		this.deadlineTable.render(tableItems, emptyMessage);
	}

	private updatePagination(): void {
		const container = this.contentEl.querySelector(".deadline-overview-pagination-container") as HTMLElement;
		if (!container) return;

		container.empty();
		const totalPages = this.getTotalPages();
		const totalItems = this.getSortedItems().length;
		const currentItems = this.getPaginatedItems().length;
		const startItem = totalItems === 0 ? 0 : (this.currentPage - 1) * this.itemsPerPage + 1;
		const endItem = (this.currentPage - 1) * this.itemsPerPage + currentItems;

		const paginationContainer = container.createEl("div", { cls: "startup-overview-pagination" });

		// Total count info
		const countInfo = paginationContainer.createEl("div", { cls: "startup-overview-pagination-count" });
		countInfo.setText(`Showing ${startItem}-${endItem} of ${totalItems} items`);

		if (totalPages <= 1) return;

		// Navigation buttons container
		const navContainer = paginationContainer.createEl("div", { cls: "startup-overview-pagination-nav" });

		// First page button
		const firstButton = navContainer.createEl("button", {
			cls: "startup-overview-page-button",
			text: "⟪ First",
		});
		if (this.currentPage === 1) {
			firstButton.disabled = true;
		}
		firstButton.addEventListener("click", () => {
			this.currentPage = 1;
			this.renderContent();
		});

		// Previous button
		const prevButton = navContainer.createEl("button", {
			cls: "startup-overview-page-button",
			text: "← Prev",
		});
		if (this.currentPage === 1) {
			prevButton.disabled = true;
		}
		prevButton.addEventListener("click", () => {
			if (this.currentPage > 1) {
				this.currentPage--;
				this.renderContent();
			}
		});

		// Page input and info
		const pageInputContainer = navContainer.createEl("div", { cls: "startup-overview-page-input-container" });
		pageInputContainer.createEl("span", { text: "Page" });

		const pageInput = pageInputContainer.createEl("input", {
			cls: "startup-overview-page-input",
			type: "number",
			attr: {
				min: "1",
				max: totalPages.toString(),
				value: this.currentPage.toString(),
			},
		});
		pageInput.addEventListener("keydown", (e) => {
			if (e.key === "Enter") {
				const newPage = parseInt(pageInput.value, 10);
				if (newPage >= 1 && newPage <= totalPages) {
					this.currentPage = newPage;
					this.renderContent();
				} else {
					pageInput.value = this.currentPage.toString();
				}
			}
		});
		pageInput.addEventListener("blur", () => {
			const newPage = parseInt(pageInput.value, 10);
			if (newPage >= 1 && newPage <= totalPages) {
				this.currentPage = newPage;
				this.renderContent();
			} else {
				pageInput.value = this.currentPage.toString();
			}
		});

		pageInputContainer.createEl("span", { text: `of ${totalPages}` });

		// Next button
		const nextButton = navContainer.createEl("button", {
			cls: "startup-overview-page-button",
			text: "Next →",
		});
		if (this.currentPage === totalPages) {
			nextButton.disabled = true;
		}
		nextButton.addEventListener("click", () => {
			if (this.currentPage < totalPages) {
				this.currentPage++;
				this.renderContent();
			}
		});

		// Last page button
		const lastButton = navContainer.createEl("button", {
			cls: "startup-overview-page-button",
			text: "Last ⟫",
		});
		if (this.currentPage === totalPages) {
			lastButton.disabled = true;
		}
		lastButton.addEventListener("click", () => {
			this.currentPage = totalPages;
			this.renderContent();
		});
	}

	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();
		this.settingsSubscription?.unsubscribe();

		// Clean up components
		this.graphSearch = null;
		this.graphFilter = null;
		this.searchFilterContainer = null;
		this.deadlineTable = null;
		this.isInitialRender = true;

		// Clean up property tooltip
		this.propertyTooltip.destroy();
	}
}

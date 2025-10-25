export interface GraphHeaderProps {
	currentFileName: string;
	startFromCurrent: boolean;
	onStartFromCurrentChange: (value: boolean) => void;
}

export class GraphHeader {
	private headerEl: HTMLElement;
	private toggleCheckbox: HTMLInputElement | null = null;
	private titleEl: HTMLElement | null = null;
	private startFromCurrentContainer: HTMLElement | null = null;

	constructor(
		private containerEl: HTMLElement,
		private props: GraphHeaderProps
	) {
		this.headerEl = this.containerEl.createEl("div", { cls: "nexus-graph-view-header" });
		this.render();
	}

	private makeContainerClickable(container: HTMLElement, checkbox: HTMLInputElement): void {
		container.style.cursor = "pointer";
		container.addEventListener("click", (e) => {
			// Don't double-trigger if clicking the checkbox itself
			if (e.target === checkbox) return;
			checkbox.click();
		});
	}

	private render(): void {
		this.headerEl.empty();

		// Title
		this.titleEl = this.headerEl.createEl("h4", {
			text: this.props.currentFileName || "No file selected",
			cls: "nexus-graph-view-title",
		});

		// Controls container
		const controlsContainer = this.headerEl.createEl("div", { cls: "nexus-graph-controls-container" });

		// Start from current file checkbox
		this.startFromCurrentContainer = controlsContainer.createEl("div", { cls: "nexus-graph-toggle-container" });
		this.toggleCheckbox = this.startFromCurrentContainer.createEl("input", { type: "checkbox" });
		this.toggleCheckbox.addClass("nexus-graph-toggle-checkbox");
		this.toggleCheckbox.checked = this.props.startFromCurrent;

		this.startFromCurrentContainer.createEl("label", {
			text: "Current file only",
			cls: "nexus-graph-toggle-label",
		});

		this.toggleCheckbox.addEventListener("change", () => {
			this.props.onStartFromCurrentChange(this.toggleCheckbox?.checked ?? false);
		});

		this.makeContainerClickable(this.startFromCurrentContainer, this.toggleCheckbox);

		this.updateVisibility();
	}

	updateTitle(fileName: string): void {
		if (this.titleEl) {
			this.titleEl.textContent = `Relationship Graph: ${fileName}`;
		}
	}

	private updateVisibility(): void {
		// Toggle is always visible for regular files
	}

	update(props: Partial<GraphHeaderProps>): void {
		this.props = { ...this.props, ...props };
		if (props.currentFileName !== undefined) {
			this.updateTitle(props.currentFileName);
		}
		if (this.toggleCheckbox && props.startFromCurrent !== undefined) {
			this.toggleCheckbox.checked = props.startFromCurrent;
		}
		this.updateVisibility();
	}

	destroy(): void {
		this.headerEl.remove();
		this.toggleCheckbox = null;
		this.titleEl = null;
		this.startFromCurrentContainer = null;
	}
}

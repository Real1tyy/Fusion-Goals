import { InputFilterManager } from "@real1ty-obsidian-plugins";

export class GraphSearch extends InputFilterManager<string> {
	constructor(parentEl: HTMLElement, onSearchChange: () => void, initiallyVisible: boolean, onHide?: () => void) {
		super(parentEl, {
			placeholder: "Search nodes by name...",
			cssClass: "fusion-graph-search-input",
			cssPrefix: "fusion",
			onFilterChange: onSearchChange,
			initiallyVisible,
			onHide,
		});
	}

	shouldInclude(nodeName: string): boolean {
		if (!this.currentValue) return true;
		return nodeName.toLowerCase().includes(this.currentValue.toLowerCase());
	}
}

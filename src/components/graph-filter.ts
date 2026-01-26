import { buildPropertyMapping, InputFilterManager, sanitizeExpression } from "@real1ty-obsidian-plugins";

export class GraphFilter extends InputFilterManager<Record<string, any>> {
	private compiledFunc: ((...args: any[]) => boolean) | null = null;
	private propertyMapping = new Map<string, string>();

	constructor(
		parentEl: HTMLElement,
		onFilterChange: () => void,
		initiallyVisible: boolean = false,
		onHide?: () => void
	) {
		super(parentEl, {
			placeholder: "Filter nodes (e.g., status === 'active')",
			cssClass: "fusion-graph-filter-input",
			cssPrefix: "fusion",
			onFilterChange,
			initiallyVisible,
			onHide,
		});
	}

	protected updateFilterValue(value: string): void {
		super.updateFilterValue(value);
		this.compiledFunc = null;
		this.propertyMapping.clear();
	}

	setFilterValue(value: string): void {
		if (this.inputEl) {
			this.inputEl.value = value;
		}
		this.updateFilterValue(value);
	}

	shouldInclude(frontmatter: Record<string, any>): boolean {
		if (!this.currentValue) return true;

		try {
			if (this.propertyMapping.size === 0) {
				this.propertyMapping = buildPropertyMapping(Object.keys(frontmatter));
			}

			if (!this.compiledFunc) {
				const sanitized = sanitizeExpression(this.currentValue, this.propertyMapping);
				const params = Array.from(this.propertyMapping.values());
				this.compiledFunc = new Function(...params, `"use strict"; return ${sanitized};`) as (
					...args: any[]
				) => boolean;
			}

			const values = Array.from(this.propertyMapping.keys()).map((key) => frontmatter[key]);
			return this.compiledFunc(...values);
		} catch (_error) {
			return true;
		}
	}
}

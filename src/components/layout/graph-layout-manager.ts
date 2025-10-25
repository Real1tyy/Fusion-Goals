import type { Core, ElementDefinition } from "cytoscape";

export interface LayoutConfig {
	animationDuration: number;
}

export interface GraphLayoutManagerConfig {
	getCy: () => Core;
}

export class GraphLayoutManager {
	constructor(private readonly config: GraphLayoutManagerConfig) {}

	private get cy(): Core {
		return this.config.getCy();
	}

	applyLayout(_nodes: ElementDefinition[], _edges: ElementDefinition[], config: LayoutConfig): void {
		const { animationDuration } = config;

		const layout = this.cy.layout({
			name: "dagre",
			rankDir: "TB",
			align: undefined,
			nodeSep: 80,
			rankSep: 120,
			edgeSep: 50,
			ranker: "network-simplex",
			animate: animationDuration > 0,
			animationDuration: animationDuration,
			animationEasing: "ease-out-cubic",
			fit: true,
			padding: 80,
		} as any);

		// For animated layouts, center after animation completes
		if (animationDuration > 0) {
			this.cy.one("layoutstop", () => {
				try {
					this.cy.resize();
				} catch {
					// ignore
				}

				requestAnimationFrame(() => {
					this.cy.fit();
					this.cy.center();
				});
			});
		}

		layout.run();

		// For instant layouts, center immediately
		if (animationDuration === 0) {
			setTimeout(() => {
				this.cy.resize();
				this.cy.fit();
				this.cy.center();
			}, 0);
		}
	}
}

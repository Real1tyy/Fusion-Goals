import type { Core, ElementDefinition } from "cytoscape";
import { NodeOrganizer } from "./node-organizer";

export interface LayoutConfig {
	animationDuration: number;
}

const PADDING = 100;

export interface GraphLayoutManagerConfig {
	getCy: () => Core;
}

export class GraphLayoutManager {
	private readonly nodeOrganizer = new NodeOrganizer();

	constructor(private readonly config: GraphLayoutManagerConfig) {}

	private get cy(): Core {
		return this.config.getCy();
	}

	applyLayout(nodes: ElementDefinition[], edges: ElementDefinition[], config: LayoutConfig): void {
		const { animationDuration } = config;

		this.applyDagreLayout(animationDuration);
		this.distributeIsolatedNodes(nodes, edges, animationDuration);
	}

	/**
	 * Detects isolated single nodes (nodes with no edges) and distributes them
	 * in a grid pattern to prevent overlapping. This is especially important
	 * after filtering when previously connected nodes become isolated.
	 */
	private distributeIsolatedNodes(
		nodes: ElementDefinition[],
		edges: ElementDefinition[],
		animationDuration: number
	): void {
		const trees = this.nodeOrganizer.identifyConnectedComponents(nodes, edges);
		const { singleNodeTrees } = this.nodeOrganizer.separateTreesBySize(trees);

		if (!this.nodeOrganizer.hasOverlappingIsolatedNodes(this.cy, singleNodeTrees)) {
			return;
		}

		const singleNodeIds = new Set(singleNodeTrees.flat());
		const connectedNodeIds = nodes.map((n) => n.data?.id as string).filter((id) => !singleNodeIds.has(id));

		const connectedBounds = this.nodeOrganizer.calculateBounds(this.cy, connectedNodeIds);

		const newPositions = this.nodeOrganizer.calculateIsolatedNodeGridPositions(singleNodeTrees, connectedBounds, {
			minNodeSpacing: 80,
			padding: PADDING,
			aspectRatio: 1.5,
		});

		newPositions.forEach((position, nodeId) => {
			const cyNode = this.cy.getElementById(nodeId);
			if (cyNode.length > 0) {
				if (animationDuration > 0) {
					cyNode.animate({
						position,
						duration: animationDuration,
						easing: "ease-out-cubic",
					});
				} else {
					cyNode.position(position);
				}
			}
		});

		if (animationDuration > 0) {
			setTimeout(() => {
				this.cy.fit(undefined, PADDING);
			}, animationDuration);
		} else {
			this.cy.fit(undefined, PADDING);
		}
	}

	private applyDagreLayout(animationDuration: number): void {
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

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
			animate: false, // Don't animate Dagre, we'll animate position adjustments
			fit: false,
			padding: 80,
		} as any);

		// For animated layouts, center after animation completes
		if (animationDuration > 0) {
			this.cy.one("layoutstop", () => {
				this.adjustNodePositionsByLevel(120, animationDuration);
			});
		}

		layout.run();

		// For instant layouts, adjust positions immediately
		if (animationDuration === 0) {
			setTimeout(() => {
				this.adjustNodePositionsByLevel(120, 0);
			}, 0);
		}
	}

	/**
	 * Adjusts node Y positions based on explicit level data.
	 * This ensures nodes respect their assigned hierarchy level regardless of edge structure.
	 */
	private adjustNodePositionsByLevel(rankSep: number, animationDuration: number): void {
		// Group nodes by their explicit level
		const nodesByLevel = new Map<number, any[]>();
		this.cy.nodes().forEach((node) => {
			const level = node.data("level") as number;
			if (!nodesByLevel.has(level)) {
				nodesByLevel.set(level, []);
			}
			nodesByLevel.get(level)!.push(node);
		});

		// Find the minimum Y position for each level
		const minYByLevel = new Map<number, number>();
		nodesByLevel.forEach((nodes, level) => {
			const minY = Math.min(...nodes.map((n) => n.position().y));
			minYByLevel.set(level, minY);
		});

		// Calculate target Y positions for each level based on rankSep
		const sortedLevels = Array.from(nodesByLevel.keys()).sort((a, b) => a - b);
		const targetYByLevel = new Map<number, number>();

		// Start from level 0 position
		const level0Y = minYByLevel.get(sortedLevels[0]) || 0;
		sortedLevels.forEach((level) => {
			targetYByLevel.set(level, level0Y + level * rankSep);
		});

		// Adjust node positions to match their explicit level
		this.cy.nodes().forEach((node) => {
			const level = node.data("level") as number;
			const currentPos = node.position();
			const targetY = targetYByLevel.get(level)!;
			const newPosition = { x: currentPos.x, y: targetY };

			if (animationDuration > 0) {
				node.animate({
					position: newPosition,
					duration: animationDuration,
					easing: "ease-out-cubic",
				});
			} else {
				node.position(newPosition);
			}
		});

		// Fit viewport after position adjustments
		if (animationDuration > 0) {
			setTimeout(() => {
				try {
					this.cy.resize();
					this.cy.fit(undefined, PADDING);
					this.cy.center();
				} catch {
					// ignore
				}
			}, animationDuration);
		} else {
			try {
				this.cy.resize();
				this.cy.fit(undefined, PADDING);
				this.cy.center();
			} catch {
				// ignore
			}
		}
	}
}

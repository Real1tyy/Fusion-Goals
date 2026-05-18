import type cytoscape from "cytoscape";
import type { Core, ElementDefinition } from "cytoscape";

import { NodeOrganizer } from "./node-organizer";

interface DagreLayoutOptions {
	name: "dagre";
	rankDir?: "TB" | "LR";
	nodeSep?: number;
	edgeSep?: number;
	rankSep?: number;
	ranker?: "network-simplex" | "tight-tree" | "longest-path";
	animate?: boolean;
	fit?: boolean;
	padding?: number;
}

export interface LayoutConfig {
	animationDuration: number;
	useMultiRowLayout?: boolean;
	maxChildrenPerRow?: number;
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
		const { animationDuration, useMultiRowLayout, maxChildrenPerRow } = config;

		this.applyDagreLayout(animationDuration, useMultiRowLayout, maxChildrenPerRow, nodes, edges);
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
		const connectedNodeIds = nodes.map((n) => n.data.id as string).filter((id) => !singleNodeIds.has(id));

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
			window.setTimeout(() => {
				this.cy.fit(undefined, PADDING);
			}, animationDuration);
		} else {
			this.cy.fit(undefined, PADDING);
		}
	}

	private applyDagreLayout(
		animationDuration: number,
		useMultiRowLayout?: boolean,
		maxChildrenPerRow?: number,
		nodes?: ElementDefinition[],
		edges?: ElementDefinition[]
	): void {
		const dagreOptions: DagreLayoutOptions = {
			name: "dagre",
			rankDir: "TB",
			nodeSep: 80,
			rankSep: 120,
			edgeSep: 50,
			ranker: "network-simplex",
			animate: false,
			fit: false,
			padding: 80,
		};
		const layout = this.cy.layout(dagreOptions as cytoscape.LayoutOptions);

		layout.run();

		if (useMultiRowLayout && maxChildrenPerRow && nodes && edges) {
			this.applyMultiRowChildLayout(nodes, edges, maxChildrenPerRow);
		}

		this.runLayoutWithAnimationHandling(
			() =>
				this.cy.layout({
					name: "preset",
					fit: true,
					padding: 80,
					animate: animationDuration > 0,
					animationDuration: animationDuration,
					animationEasing: "ease-out-cubic",
				}),
			animationDuration
		);
	}

	private runLayoutWithAnimationHandling(
		layoutFactory: () => cytoscape.Layouts | undefined,
		animationDuration: number
	): void {
		const layout = layoutFactory();
		if (!layout) return;

		if (animationDuration > 0) {
			this.cy.one("layoutstop", () => this.ensureCentered());
		}

		layout.run();

		if (animationDuration === 0) {
			window.setTimeout(() => {
				this.cy.resize();
				this.cy.fit();
				this.cy.center();
			}, 0);
		}
	}

	private ensureCentered(): void {
		try {
			this.cy.resize();
		} catch {
			// ignore
		}

		window.requestAnimationFrame(() => {
			this.cy.fit();
			this.cy.center();
		});
	}

	/**
	 * Apply multi-row layout to children of parents with many children.
	 * Distributes children in staggered rows (maxPerRow, maxPerRow-1, maxPerRow, maxPerRow-1...)
	 * to use more vertical space and less horizontal space.
	 */
	private applyMultiRowChildLayout(
		nodes: ElementDefinition[],
		edges: ElementDefinition[],
		maxChildrenPerRow: number
	): void {
		const HORIZONTAL_SPACING = 120;
		const ROW_VERTICAL_SPACING = 140;
		const GENERATION_GAP = 160;
		const GROUP_HORIZONTAL_GAP = 180;

		// Build parent-child relationships (hierarchy edges only)
		const parentToChildren = new Map<string, string[]>();

		edges.forEach((edge) => {
			const source = edge.data.source as string;
			const target = edge.data.target as string;

			if (!parentToChildren.has(source)) {
				parentToChildren.set(source, []);
			}
			parentToChildren.get(source)!.push(target);
		});

		// Group nodes by level
		const nodesByLevel = new Map<number, ElementDefinition[]>();
		nodes.forEach((node) => {
			const level = node.data["level"] as number;
			if (!nodesByLevel.has(level)) {
				nodesByLevel.set(level, []);
			}
			nodesByLevel.get(level)!.push(node);
		});

		const levels = Array.from(nodesByLevel.keys()).sort((a, b) => a - b);
		if (levels.length === 0) return;

		const maxLevel = Math.max(...levels);

		const getNodeIdsAtLevel = (level: number): string[] =>
			(nodesByLevel.get(level) ?? []).map((n) => n.data.id as string).filter(Boolean);

		const getMaxYForIds = (ids: string[]): number => {
			let maxY = -Infinity;
			for (const id of ids) {
				const cyNode = this.cy.getElementById(id);
				if (cyNode.length === 0) continue;
				maxY = Math.max(maxY, cyNode.position().y);
			}
			return maxY;
		};

		const generationStartY = new Map<number, number>();
		const generationBottomY = new Map<number, number>();

		// Keep level 0 as-is, but we still need its bounds for the next generation baseline
		const level0Ids = getNodeIdsAtLevel(0);
		generationBottomY.set(0, getMaxYForIds(level0Ids));

		// Process generations top-down.
		// Key rule: each generation starts below the *bottom row* of the previous generation,
		// so grandchildren can never end up above parents that were pushed down into later rows.
		for (let level = 0; level < maxLevel; level++) {
			const parentIds = getNodeIdsAtLevel(level);
			if (parentIds.length === 0) continue;

			// Recompute bottom Y for this generation from current positions (may have been re-laid out)
			const currentGenerationBottom = getMaxYForIds(parentIds);
			generationBottomY.set(level, currentGenerationBottom);

			const childLevel = level + 1;
			const baselineY = currentGenerationBottom + GENERATION_GAP;
			generationStartY.set(childLevel, baselineY);

			// Position all children of this generation, but keep branches separated.
			const groups = parentIds
				.map((parentId) => {
					const parentCy = this.cy.getElementById(parentId);
					if (parentCy.length === 0) return null;

					const children = parentToChildren.get(parentId) ?? [];
					if (children.length === 0) return null;

					const desiredCenterX = parentCy.position().x;
					const widestRowCount = Math.min(children.length, maxChildrenPerRow);
					const estimatedWidth = widestRowCount <= 1 ? 0 : (widestRowCount - 1) * HORIZONTAL_SPACING;

					return {
						parentId,
						children,
						desiredCenterX,
						estimatedWidth,
					};
				})
				.filter((g): g is NonNullable<typeof g> => Boolean(g))
				.sort((a, b) => a.desiredCenterX - b.desiredCenterX);

			const groupCenterXByParent = new Map<string, number>();
			let prevMaxX = -Infinity;
			for (const group of groups) {
				const halfWidth = group.estimatedWidth / 2;
				let centerX = group.desiredCenterX;
				let maxX = centerX + halfWidth;

				const minX = centerX - halfWidth;
				if (prevMaxX !== -Infinity && minX < prevMaxX + GROUP_HORIZONTAL_GAP) {
					const shift = prevMaxX + GROUP_HORIZONTAL_GAP - minX;
					centerX += shift;
					maxX += shift;
				}

				groupCenterXByParent.set(group.parentId, centerX);
				prevMaxX = Math.max(prevMaxX, maxX);
			}

			for (const group of groups) {
				const centerX = groupCenterXByParent.get(group.parentId) ?? group.desiredCenterX;
				const childPositions = this.calculateStaggeredChildPositions(group.children, centerX, baselineY, {
					maxPerRow: maxChildrenPerRow,
					horizontalSpacing: HORIZONTAL_SPACING,
					rowVerticalSpacing: ROW_VERTICAL_SPACING,
				});

				childPositions.forEach((pos, childId) => {
					const childCy = this.cy.getElementById(childId);
					if (childCy.length > 0) {
						childCy.position(pos);
					}
				});
			}

			// Update bounds for the child generation based on new positions.
			const childIds = getNodeIdsAtLevel(childLevel);
			if (childIds.length > 0) {
				generationBottomY.set(childLevel, getMaxYForIds(childIds));

				// For nodes that are at this level but weren't direct children of any processed parent,
				// ensure they don't float above the generation baseline (push down only if needed).
				const startY = generationStartY.get(childLevel);
				if (startY !== undefined) {
					for (const nodeId of childIds) {
						const cyNode = this.cy.getElementById(nodeId);
						if (cyNode.length === 0) continue;
						const pos = cyNode.position();
						if (pos.y < startY) {
							cyNode.position({ x: pos.x, y: startY });
						}
					}
					// Recompute after adjustments
					generationBottomY.set(childLevel, getMaxYForIds(childIds));
				}
			}
		}
	}

	/**
	 * Calculate staggered row positions for children.
	 * Pattern: maxPerRow in first row, maxPerRow-1 in second row (offset), maxPerRow in third row, etc.
	 */
	private calculateStaggeredChildPositions(
		children: string[],
		parentCenterX: number,
		baselineY: number,
		options: {
			maxPerRow: number;
			horizontalSpacing: number;
			rowVerticalSpacing: number;
		}
	): Map<string, { x: number; y: number }> {
		const positions = new Map<string, { x: number; y: number }>();
		const { maxPerRow, horizontalSpacing, rowVerticalSpacing } = options;

		let childIndex = 0;
		let rowIndex = 0;

		while (childIndex < children.length) {
			// Alternate between maxPerRow and maxPerRow-1
			const isEvenRow = rowIndex % 2 === 0;
			const nodesInThisRow = isEvenRow ? maxPerRow : Math.max(1, maxPerRow - 1);
			const actualNodesInRow = Math.min(nodesInThisRow, children.length - childIndex);

			// Calculate row width and starting X
			const rowWidth = (actualNodesInRow - 1) * horizontalSpacing;
			const startX = parentCenterX - rowWidth / 2;

			// Add offset for odd rows (staggered effect)
			const xOffset = isEvenRow ? 0 : horizontalSpacing / 2;

			// Position nodes in this row
			for (let i = 0; i < actualNodesInRow; i++) {
				const childId = children[childIndex];
				const x = startX + i * horizontalSpacing + xOffset;
				const y = baselineY + rowIndex * rowVerticalSpacing;

				positions.set(childId, { x, y });
				childIndex++;
			}

			rowIndex++;
		}

		return positions;
	}
}

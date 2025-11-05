import type { ElementDefinition } from "cytoscape";
import type { App } from "obsidian";
import { ColorEvaluator } from "../utils/colors";
import { extractDisplayName, extractFilePath, type FileContext, getFileContext } from "../utils/file";
import { FilterEvaluator } from "../utils/filters";
import { parseLinkedPathsFromProperty } from "../utils/property-utils";
import type { Indexer } from "./indexer";
import type { SettingsStore } from "./settings-store";

export interface GraphData {
	nodes: ElementDefinition[];
	edges: ElementDefinition[];
}

export interface GraphBuilderOptions {
	sourcePath: string;
	startFromCurrent: boolean;
	searchQuery?: string;
	filterEvaluator?: (frontmatter: Record<string, any>) => boolean;
}

interface ValidFileContext extends FileContext {
	wikiLink: string;
}

/**
 * Builds graph data (nodes and edges) from hierarchical relationships.
 * Uses the hierarchical cache structure: Goals → Projects, Tasks | Projects → Tasks
 */
export class GraphBuilder {
	private readonly filterEvaluator: FilterEvaluator;
	private readonly colorEvaluator: ColorEvaluator;
	private hierarchyMaxDepth: number;

	constructor(
		private readonly app: App,
		private readonly indexer: Indexer,
		settingsStore: SettingsStore
	) {
		this.filterEvaluator = new FilterEvaluator(settingsStore.settings$);
		this.colorEvaluator = new ColorEvaluator(settingsStore.settings$);

		// Initialize and subscribe to depth settings
		this.hierarchyMaxDepth = settingsStore.settings$.value.hierarchyMaxDepth;
		settingsStore.settings$.subscribe((settings) => {
			this.hierarchyMaxDepth = settings.hierarchyMaxDepth;
		});
	}

	private resolveValidContexts(filePaths: string[], excludePaths: Set<string>): ValidFileContext[] {
		return filePaths
			.map((filePath) => {
				const fileContext = getFileContext(this.app, filePath);
				return { wikiLink: filePath, ...fileContext };
			})
			.filter((ctx): ctx is ValidFileContext => {
				if (ctx.file === null || !ctx.frontmatter || excludePaths.has(ctx.path)) {
					return false;
				}
				return this.filterEvaluator.evaluateFilters(ctx.frontmatter);
			});
	}

	private createNodeElement(pathOrWikiLink: string, level: number, isSource: boolean): ElementDefinition {
		const filePath = extractFilePath(pathOrWikiLink);
		const displayName = extractDisplayName(pathOrWikiLink);
		const estimatedWidth = Math.max(80, Math.min(displayName.length * 8, 150));
		const estimatedHeight = 45;

		const { frontmatter } = getFileContext(this.app, filePath);
		const nodeColor = this.colorEvaluator.evaluateColor(frontmatter ?? {});

		return {
			data: {
				id: filePath,
				label: displayName,
				level: level,
				isSource: isSource,
				width: estimatedWidth,
				height: estimatedHeight,
				nodeColor: nodeColor,
			},
		};
	}

	buildGraph(options: GraphBuilderOptions): GraphData {
		const fileType = this.indexer.getFileType(options.sourcePath);
		let graphData: GraphData;

		if (options.startFromCurrent) {
			// When "Start from current" is enabled, just build from current file
			graphData = this.buildHierarchyGraphData(options.sourcePath, true);
		} else if (fileType === "project") {
			graphData = this.buildProjectView(options.sourcePath);
		} else if (fileType === "task") {
			graphData = this.buildTaskView(options.sourcePath);
		} else {
			graphData = this.buildHierarchyGraphData(options.sourcePath, false);
		}

		return this.applyGraphFilters(graphData, options.searchQuery, options.filterEvaluator);
	}

	private buildProjectView(projectPath: string): GraphData {
		const nodes: ElementDefinition[] = [];
		const edges: ElementDefinition[] = [];
		const processedPaths = new Set<string>();

		const goalPath = this.getParentPath(projectPath);
		if (!goalPath) {
			return this.buildHierarchyGraphData(projectPath, false);
		}

		const goalNode = this.createNodeElement(goalPath, 0, false);
		nodes.push(goalNode);
		processedPaths.add(goalPath);

		const goalHierarchy = this.indexer.getGoalHierarchy(goalPath);
		if (goalHierarchy) {
			const projectPaths = goalHierarchy.projects;
			const validProjects = this.resolveValidContexts(projectPaths, processedPaths);

			for (const ctx of validProjects) {
				const isSource = ctx.path === projectPath;
				const projectNode = this.createNodeElement(ctx.wikiLink, 1, isSource);
				nodes.push(projectNode);
				processedPaths.add(ctx.path);

				// Add edge from goal to project
				edges.push({ data: { source: goalPath, target: ctx.path } });

				// Only add tasks for the source project
				if (isSource && this.hierarchyMaxDepth > 2) {
					const taskPaths = this.getChildrenPaths(ctx.path);
					const validTasks = this.resolveValidContexts(taskPaths, processedPaths);

					for (const taskCtx of validTasks) {
						const taskNode = this.createNodeElement(taskCtx.wikiLink, 2, false);
						nodes.push(taskNode);
						processedPaths.add(taskCtx.path);

						// Add edge from project to task
						edges.push({ data: { source: ctx.path, target: taskCtx.path } });
					}
				}
			}
		}

		return { nodes, edges };
	}

	private buildTaskView(taskPath: string): GraphData {
		const nodes: ElementDefinition[] = [];
		const edges: ElementDefinition[] = [];
		const processedPaths = new Set<string>();

		// Find parent project
		const projectPath = this.getParentPath(taskPath);
		if (!projectPath) {
			return this.buildHierarchyGraphData(taskPath, false);
		}

		// Find grandparent goal
		const goalPath = this.getParentPath(projectPath);
		if (!goalPath) {
			return this.buildHierarchyGraphData(taskPath, false);
		}

		// Add goal as root node (level 0)
		const goalNode = this.createNodeElement(goalPath, 0, false);
		nodes.push(goalNode);
		processedPaths.add(goalPath);

		// Add only the parent project (level 1)
		const projectNode = this.createNodeElement(projectPath, 1, false);
		nodes.push(projectNode);
		processedPaths.add(projectPath);

		// Add edge from goal to project
		edges.push({ data: { source: goalPath, target: projectPath } });

		// Add all sibling tasks for this project (level 2)
		if (this.hierarchyMaxDepth > 2) {
			const taskPaths = this.getChildrenPaths(projectPath);
			const validTasks = this.resolveValidContexts(taskPaths, processedPaths);

			for (const taskCtx of validTasks) {
				const isSourceTask = taskCtx.path === taskPath;
				const taskNode = this.createNodeElement(taskCtx.wikiLink, 2, isSourceTask);
				nodes.push(taskNode);
				processedPaths.add(taskCtx.path);

				// Add edge from project to task
				edges.push({ data: { source: projectPath, target: taskCtx.path } });
			}
		}

		return { nodes, edges };
	}

	private buildHierarchyGraphData(
		sourcePath: string,
		startFromCurrent: boolean,
		sharedProcessedPaths?: Set<string>,
		allowSourceHighlight = true
	): GraphData {
		const nodes: ElementDefinition[] = [];
		const edges: ElementDefinition[] = [];
		const processedPaths = sharedProcessedPaths || new Set<string>();

		const rootPath = startFromCurrent ? sourcePath : this.findTopmostParent(sourcePath);
		const rootNode = this.createNodeElement(rootPath, 0, allowSourceHighlight && rootPath === sourcePath);
		nodes.push(rootNode);
		processedPaths.add(rootPath);

		const queue: Array<{ path: string; level: number }> = [{ path: rootPath, level: 0 }];

		const processChildrenAtLevel = (children: ValidFileContext[], parentPath: string, targetLevel: number): void => {
			if (targetLevel >= this.hierarchyMaxDepth) return;

			const childNodes = children.map((ctx) =>
				this.createNodeElement(ctx.wikiLink, targetLevel, allowSourceHighlight && ctx.path === sourcePath)
			);
			const childEdges = children.map((ctx) => ({ data: { source: parentPath, target: ctx.path } }));

			nodes.push(...childNodes);
			edges.push(...childEdges);

			children.forEach((ctx) => {
				processedPaths.add(ctx.path);
				queue.push({ path: ctx.path, level: targetLevel });
			});
		};

		while (queue.length > 0) {
			const { path: currentPath, level: currentLevel } = queue.shift()!;

			if (currentLevel + 1 >= this.hierarchyMaxDepth) continue;

			const childPaths = this.getChildrenPaths(currentPath);
			const validChildren = this.resolveValidContexts(childPaths, processedPaths);
			const fileType = this.indexer.getFileType(currentPath);

			if (fileType === "goal") {
				const projects = validChildren.filter((child) => this.indexer.getFileType(child.path) === "project");
				const tasks = validChildren.filter((child) => this.indexer.getFileType(child.path) === "task");

				const settings = this.indexer.getSettings();
				const orphanTasks = tasks.filter((taskCtx) => {
					const projectLinks = parseLinkedPathsFromProperty(taskCtx.frontmatter?.[settings.taskProjectProp]);
					return projectLinks.length === 0;
				});

				processChildrenAtLevel(projects, currentPath, currentLevel + 1);
				processChildrenAtLevel(orphanTasks, currentPath, currentLevel + 2);
			} else {
				processChildrenAtLevel(validChildren, currentPath, currentLevel + 1);
			}
		}

		return { nodes, edges };
	}

	/**
	 * Get children paths for a file using hierarchical cache.
	 */
	private getChildrenPaths(filePath: string): string[] {
		const fileType = this.indexer.getFileType(filePath);

		if (fileType === "goal") {
			// Goals have both projects and tasks as direct children
			const goalHierarchy = this.indexer.getGoalHierarchy(filePath);
			if (goalHierarchy) {
				return [...goalHierarchy.projects, ...goalHierarchy.tasks];
			}
		} else if (fileType === "project") {
			// Projects have tasks as children
			const projectHierarchy = this.indexer.getProjectHierarchy(filePath);
			if (projectHierarchy) {
				return projectHierarchy.tasks;
			}
		}
		// Tasks have no children

		return [];
	}

	/**
	 * Get parent path for a file based on frontmatter links.
	 */
	private getParentPath(filePath: string): string | null {
		const { file, frontmatter } = getFileContext(this.app, filePath);
		if (!file || !frontmatter) return null;

		const fileType = this.indexer.getFileType(filePath);
		if (!fileType) return null;

		const settings = this.indexer.getSettings();

		if (fileType === "project") {
			const paths = parseLinkedPathsFromProperty(frontmatter[settings.projectGoalProp]);
			return paths.length > 0 ? paths[0] : null;
		}

		if (fileType === "task") {
			const paths = parseLinkedPathsFromProperty(frontmatter[settings.taskProjectProp]);
			return paths.length > 0 ? paths[0] : null;
		}

		// Goals have no parents
		return null;
	}

	private findTopmostParent(startPath: string, maxDepth = 50): string {
		const visited = new Set<string>();
		let topmostParent = startPath;
		let maxLevel = 0;

		const dfsUpwards = (filePath: string, currentLevel: number): void => {
			if (currentLevel > maxDepth || visited.has(filePath)) return;
			visited.add(filePath);

			if (currentLevel > maxLevel) {
				maxLevel = currentLevel;
				topmostParent = filePath;
			}

			const parentPath = this.getParentPath(filePath);
			if (parentPath && !visited.has(parentPath)) {
				const { file, frontmatter } = getFileContext(this.app, parentPath);
				if (file && frontmatter && this.filterEvaluator.evaluateFilters(frontmatter)) {
					dfsUpwards(parentPath, currentLevel + 1);
				}
			}
		};

		dfsUpwards(startPath, 0);
		return topmostParent;
	}

	private applyGraphFilters(
		graphData: GraphData,
		searchQuery?: string,
		filterEvaluator?: (frontmatter: Record<string, any>) => boolean
	): GraphData {
		// Apply both search and expression filters here - frontmatter property filters are applied during graph building
		if (!searchQuery && !filterEvaluator) return graphData;

		const filteredNodes = graphData.nodes.filter((node) => {
			const { isSource, label, id } = node.data || {};

			// Always keep source node
			if (isSource) return true;

			// Apply search filter
			if (searchQuery) {
				const nodeName = (label as string).toLowerCase();
				if (!nodeName.includes(searchQuery.toLowerCase())) {
					return false;
				}
			}

			// Apply expression filter on frontmatter
			if (filterEvaluator) {
				const { frontmatter } = getFileContext(this.app, id as string);
				if (!frontmatter || !filterEvaluator(frontmatter)) {
					return false;
				}
			}

			return true;
		});

		const keepNodeIds = new Set(filteredNodes.map((node) => node.data?.id as string));

		const filteredEdges = graphData.edges.filter(
			(edge) => keepNodeIds.has(edge.data?.source as string) && keepNodeIds.has(edge.data?.target as string)
		);

		return { nodes: filteredNodes, edges: filteredEdges };
	}
}

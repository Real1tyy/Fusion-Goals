import { type App, type MetadataCache, type TAbstractFile, TFile, type Vault } from "obsidian";
import {
	type BehaviorSubject,
	from,
	fromEventPattern,
	lastValueFrom,
	merge,
	type Observable,
	of,
	Subject,
	type Subscription,
} from "rxjs";
import { debounceTime, filter, groupBy, map, mergeMap, switchMap, toArray } from "rxjs/operators";
import { parseWikiLink } from "src/utils/frontmatter-value";
import { type FileType, SCAN_CONCURRENCY } from "../types/constants";
import type { Frontmatter, FusionGoalsSettings } from "../types/settings";

export interface FileRelationships {
	filePath: string;
	mtime: number;
	type: FileType;
	frontmatter: Frontmatter;
}

export type IndexerEventType = "file-changed" | "file-deleted";

export interface IndexerEvent {
	type: IndexerEventType;
	fileType: FileType;
	filePath: string;
	oldRelationships?: FileRelationships;
	newRelationships?: FileRelationships;
}

type VaultEvent = "create" | "modify" | "delete" | "rename";
type FileIntent =
	| { kind: "changed"; file: TFile; path: string; fileType: FileType }
	| { kind: "deleted"; path: string; fileType: FileType };

/**
 * Hierarchical cache structure:
 * - Goals have arrays of projects and tasks
 * - Projects have arrays of tasks
 */
export interface GoalHierarchy {
	projects: string[];
	tasks: string[];
}

export interface ProjectHierarchy {
	tasks: string[];
}

export class Indexer {
	private settings: FusionGoalsSettings;
	private fileSub: Subscription | null = null;
	private settingsSubscription: Subscription | null = null;
	private vault: Vault;
	private metadataCache: MetadataCache;
	private scanEventsSubject = new Subject<IndexerEvent>();
	private relationshipsCache = new Map<string, FileRelationships>();

	// Hierarchical caches
	private goalCache = new Map<string, GoalHierarchy>();
	private projectCache = new Map<string, ProjectHierarchy>();

	public readonly events$: Observable<IndexerEvent>;

	constructor(app: App, settingsStore: BehaviorSubject<FusionGoalsSettings>) {
		this.vault = app.vault;
		this.metadataCache = app.metadataCache;
		this.settings = settingsStore.value;

		this.settingsSubscription = settingsStore.subscribe((newSettings) => {
			this.settings = newSettings;
		});

		this.events$ = this.scanEventsSubject.asObservable();
	}

	async start(): Promise<void> {
		// Validate that required directories are defined
		if (!this.settings.goalsDirectory || !this.settings.projectsDirectory || !this.settings.tasksDirectory) {
			console.warn(
				"⚠️ Fusion Goals: One or more required directories (goals, projects, tasks) are not defined. Plugin will not function properly."
			);
			return;
		}

		await this.buildInitialCache();

		const fileSystemEvents$ = this.buildFileSystemEvents$();
		this.fileSub = fileSystemEvents$.subscribe((event) => {
			this.scanEventsSubject.next(event);
		});
	}

	stop(): void {
		this.fileSub?.unsubscribe();
		this.fileSub = null;

		this.settingsSubscription?.unsubscribe();
		this.settingsSubscription = null;

		this.relationshipsCache.clear();
		this.goalCache.clear();
		this.projectCache.clear();
	}

	private async buildInitialCache(): Promise<void> {
		const allFiles = this.vault.getMarkdownFiles();
		const relevantFiles = allFiles.filter((file) => this.getFileType(file.path) !== null);

		for (const file of relevantFiles) {
			const frontmatter = this.metadataCache.getFileCache(file)?.frontmatter;
			if (frontmatter) {
				const fileType = this.getFileType(file.path);
				if (fileType) {
					const relationships = this.extractRelationships(file, frontmatter, fileType);
					this.relationshipsCache.set(file.path, relationships);
					this.updateHierarchicalCache(relationships);
				}
			}
		}
	}

	async scanAllFiles(): Promise<void> {
		const allFiles = this.vault.getMarkdownFiles();
		const relevantFiles = allFiles.filter((file) => this.getFileType(file.path) !== null);

		const events$ = from(relevantFiles).pipe(
			mergeMap(async (file) => {
				try {
					return await this.buildEvent(file);
				} catch (error) {
					console.error(`Error processing file ${file.path}:`, error);
					return null;
				}
			}, SCAN_CONCURRENCY),
			filter((event): event is IndexerEvent => event !== null),
			toArray()
		);

		try {
			const allEvents = await lastValueFrom(events$);

			for (const event of allEvents) {
				this.scanEventsSubject.next(event);
			}
		} catch (error) {
			console.error("❌ Error during file scanning:", error);
		}
	}

	/**
	 * Determine file type based on directory path.
	 * Returns null if file is not in any of the tracked directories.
	 */
	getFileType(filePath: string): FileType | null {
		const { goalsDirectory, projectsDirectory, tasksDirectory } = this.settings;

		const normalizeDir = (dir: string) => (dir.endsWith("/") ? dir : `${dir}/`);
		const goalsDir = normalizeDir(goalsDirectory);
		const projectsDir = normalizeDir(projectsDirectory);
		const tasksDir = normalizeDir(tasksDirectory);

		if (filePath.startsWith(goalsDir) || filePath === goalsDirectory) {
			return "goal";
		}
		if (filePath.startsWith(projectsDir) || filePath === projectsDirectory) {
			return "project";
		}
		if (filePath.startsWith(tasksDir) || filePath === tasksDirectory) {
			return "task";
		}

		return null;
	}

	private fromVaultEvent(eventName: VaultEvent): Observable<any> {
		return fromEventPattern(
			(handler) => this.vault.on(eventName as any, handler),
			(handler) => this.vault.off(eventName as any, handler)
		);
	}

	private static isMarkdownFile(f: TAbstractFile): f is TFile {
		return f instanceof TFile && f.extension === "md";
	}

	private toRelevantFiles<T extends TAbstractFile>() {
		return (source: Observable<T>) =>
			source.pipe(
				filter(Indexer.isMarkdownFile),
				filter((f) => this.getFileType(f.path) !== null)
			);
	}

	private debounceByPath<T>(ms: number, key: (x: T) => string) {
		return (source: Observable<T>) =>
			source.pipe(
				groupBy(key),
				mergeMap((g$) => g$.pipe(debounceTime(ms)))
			);
	}

	private buildFileSystemEvents$(): Observable<IndexerEvent> {
		const created$ = this.fromVaultEvent("create").pipe(this.toRelevantFiles());
		const modified$ = this.fromVaultEvent("modify").pipe(this.toRelevantFiles());
		const deleted$ = this.fromVaultEvent("delete").pipe(this.toRelevantFiles());
		const renamed$ = this.fromVaultEvent("rename");

		const changedIntents$ = merge(created$, modified$).pipe(
			this.debounceByPath(300, (f) => f.path),
			map((file): FileIntent => {
				const fileType = this.getFileType(file.path);
				return { kind: "changed", file, path: file.path, fileType: fileType! };
			})
		);

		const deletedIntents$ = deleted$.pipe(
			map((file): FileIntent => {
				const fileType = this.getFileType(file.path);
				return { kind: "deleted", path: file.path, fileType: fileType! };
			})
		);

		// Handle renames by updating the cache internally without emitting events
		// Obsidian automatically updates all wiki links, so we just sync the cache
		// Debounce by 1.5 seconds to let Obsidian finish updating all links
		renamed$
			.pipe(
				filter(([f]) => Indexer.isMarkdownFile(f)),
				debounceTime(1500)
			)
			.subscribe(([newFile, oldPath]) => {
				this.handleRename(newFile, oldPath);
			});

		const intents$ = merge(changedIntents$, deletedIntents$);

		return intents$.pipe(
			switchMap((intent) => {
				if (intent.kind === "deleted") {
					const oldRelationships = this.relationshipsCache.get(intent.path);
					this.relationshipsCache.delete(intent.path);

					// Remove from hierarchical cache
					if (oldRelationships) {
						this.removeFromHierarchicalCache(oldRelationships);
					}

					return of<IndexerEvent>({
						type: "file-deleted",
						fileType: intent.fileType,
						filePath: intent.path,
						oldRelationships,
					});
				}
				return from(this.buildEvent(intent.file)).pipe(filter((e): e is IndexerEvent => e !== null));
			})
		);
	}

	private handleRename(newFile: TFile, oldPath: string): void {
		const oldRelationships = this.relationshipsCache.get(oldPath);
		const frontmatter = this.metadataCache.getFileCache(newFile)?.frontmatter;

		if (!frontmatter || !oldRelationships) {
			return;
		}

		// Remove old entry from hierarchical cache
		this.removeFromHierarchicalCache(oldRelationships);

		// Update cache for renamed file
		const newRelationships = this.extractRelationships(newFile, frontmatter, oldRelationships.type);
		this.relationshipsCache.delete(oldPath);
		this.relationshipsCache.set(newFile.path, newRelationships);

		// Add new entry to hierarchical cache
		this.updateHierarchicalCache(newRelationships);
	}

	private async buildEvent(file: TFile): Promise<IndexerEvent | null> {
		const frontmatter = this.metadataCache.getFileCache(file)?.frontmatter;
		if (!frontmatter) {
			return null;
		}

		const fileType = this.getFileType(file.path);
		if (!fileType) {
			return null;
		}

		const oldRelationships = this.relationshipsCache.get(file.path);
		const newRelationships = this.extractRelationships(file, frontmatter, fileType);

		// Update cache with new relationships
		this.relationshipsCache.set(file.path, newRelationships);

		// Update hierarchical cache
		if (oldRelationships) {
			this.removeFromHierarchicalCache(oldRelationships);
		}
		this.updateHierarchicalCache(newRelationships);

		return {
			type: "file-changed",
			fileType,
			filePath: file.path,
			oldRelationships,
			newRelationships,
		};
	}

	extractRelationships(file: TFile, frontmatter: Frontmatter, fileType: FileType): FileRelationships {
		return {
			filePath: file.path,
			mtime: file.stat.mtime,
			type: fileType,
			frontmatter,
		};
	}

	/**
	 * Update the hierarchical cache based on file relationships.
	 * Goals → Projects, Tasks
	 * Projects → Tasks
	 */
	private updateHierarchicalCache(relationships: FileRelationships): void {
		const { filePath, frontmatter, type } = relationships;
		const { projectGoalProp, taskGoalProp, taskProjectProp } = this.settings;

		if (type === "project") {
			// Extract goal reference from project
			const goalLink = frontmatter[projectGoalProp];
			if (goalLink && typeof goalLink === "string") {
				const parsed = parseWikiLink(goalLink);
				if (parsed?.linkPath) {
					const goalPath = `${parsed.linkPath}.md`;

					// Ensure goal entry exists
					if (!this.goalCache.has(goalPath)) {
						this.goalCache.set(goalPath, { projects: [], tasks: [] });
					}

					const goalHierarchy = this.goalCache.get(goalPath)!;
					if (!goalHierarchy.projects.includes(filePath)) {
						goalHierarchy.projects.push(filePath);
					}
				}
			}
		} else if (type === "task") {
			// Extract goal reference from task
			const goalLink = frontmatter[taskGoalProp];
			if (goalLink && typeof goalLink === "string") {
				const parsed = parseWikiLink(goalLink);
				if (parsed?.linkPath) {
					const goalPath = `${parsed.linkPath}.md`;

					// Ensure goal entry exists
					if (!this.goalCache.has(goalPath)) {
						this.goalCache.set(goalPath, { projects: [], tasks: [] });
					}

					const goalHierarchy = this.goalCache.get(goalPath)!;
					if (!goalHierarchy.tasks.includes(filePath)) {
						goalHierarchy.tasks.push(filePath);
					}
				}
			}

			// Extract project reference from task
			const projectLink = frontmatter[taskProjectProp];
			if (projectLink && typeof projectLink === "string") {
				const parsed = parseWikiLink(projectLink);
				if (parsed?.linkPath) {
					const projectPath = `${parsed.linkPath}.md`;

					// Ensure project entry exists
					if (!this.projectCache.has(projectPath)) {
						this.projectCache.set(projectPath, { tasks: [] });
					}

					const projectHierarchy = this.projectCache.get(projectPath)!;
					if (!projectHierarchy.tasks.includes(filePath)) {
						projectHierarchy.tasks.push(filePath);
					}
				}
			}
		}
	}

	/**
	 * Remove file from hierarchical cache.
	 */
	private removeFromHierarchicalCache(relationships: FileRelationships): void {
		const { filePath, frontmatter, type } = relationships;
		const { projectGoalProp, taskGoalProp, taskProjectProp } = this.settings;

		if (type === "goal") {
			// Remove the goal entry entirely
			this.goalCache.delete(filePath);
		} else if (type === "project") {
			// Remove project from its goal's projects array
			const goalLink = frontmatter[projectGoalProp];
			if (goalLink && typeof goalLink === "string") {
				const parsed = parseWikiLink(goalLink);
				if (parsed?.linkPath) {
					const goalPath = `${parsed.linkPath}.md`;
					const goalHierarchy = this.goalCache.get(goalPath);
					if (goalHierarchy) {
						goalHierarchy.projects = goalHierarchy.projects.filter((p) => p !== filePath);
					}
				}
			}

			// Remove the project entry entirely
			this.projectCache.delete(filePath);
		} else if (type === "task") {
			// Remove task from its goal's tasks array
			const goalLink = frontmatter[taskGoalProp];
			if (goalLink && typeof goalLink === "string") {
				const parsed = parseWikiLink(goalLink);
				if (parsed?.linkPath) {
					const goalPath = `${parsed.linkPath}.md`;
					const goalHierarchy = this.goalCache.get(goalPath);
					if (goalHierarchy) {
						goalHierarchy.tasks = goalHierarchy.tasks.filter((t) => t !== filePath);
					}
				}
			}

			// Remove task from its project's tasks array
			const projectLink = frontmatter[taskProjectProp];
			if (projectLink && typeof projectLink === "string") {
				const parsed = parseWikiLink(projectLink);
				if (parsed?.linkPath) {
					const projectPath = `${parsed.linkPath}.md`;
					const projectHierarchy = this.projectCache.get(projectPath);
					if (projectHierarchy) {
						projectHierarchy.tasks = projectHierarchy.tasks.filter((t) => t !== filePath);
					}
				}
			}
		}
	}

	/**
	 * Get hierarchical data for a goal.
	 */
	getGoalHierarchy(goalPath: string): GoalHierarchy | null {
		return this.goalCache.get(goalPath) ?? null;
	}

	/**
	 * Get hierarchical data for a project.
	 */
	getProjectHierarchy(projectPath: string): ProjectHierarchy | null {
		return this.projectCache.get(projectPath) ?? null;
	}

	/**
	 * Get all goals (keys of goalCache).
	 */
	getAllGoals(): string[] {
		return Array.from(this.goalCache.keys());
	}

	/**
	 * Get all projects (keys of projectCache).
	 */
	getAllProjects(): string[] {
		return Array.from(this.projectCache.keys());
	}

	/**
	 * Get current settings (readonly).
	 */
	getSettings(): Readonly<FusionGoalsSettings> {
		return this.settings;
	}
}

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
	[key: string]: string[];
}

export interface ProjectHierarchy {
	tasks: string[];
	[key: string]: string[];
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
			await this.buildEvent(file);
		}

		// Log hierarchical caches
		console.log("📦 Goal Cache:");
		for (const [goalPath, hierarchy] of this.goalCache.entries()) {
			console.log(JSON.stringify({ goalPath, ...hierarchy }));
		}

		console.log("📦 Project Cache:");
		for (const [projectPath, hierarchy] of this.projectCache.entries()) {
			console.log(JSON.stringify({ projectPath, ...hierarchy }));
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
		const newRelationships: FileRelationships = {
			filePath: newFile.path,
			mtime: newFile.stat.mtime,
			type: oldRelationships.type,
			frontmatter,
		};
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
		const newRelationships: FileRelationships = {
			filePath: file.path,
			mtime: file.stat.mtime,
			type: fileType,
			frontmatter,
		};

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

	private parseLinkedPath(frontmatter: Frontmatter, propName: string): string | null {
		const value = frontmatter[propName];
		if (value && typeof value === "string") {
			const parsed = parseWikiLink(value);
			if (parsed?.linkPath) {
				return `${parsed.linkPath}.md`;
			}
		}
		return null;
	}

	private updateHierarchicalCache(relationships: FileRelationships): void {
		const { filePath, frontmatter, type } = relationships;
		const { projectGoalProp, taskGoalProp, taskProjectProp } = this.settings;

		const addToCache = <T extends { [key: string]: string[] }>(
			cache: Map<string, T>,
			propName: string,
			arrayKey: keyof T,
			defaultEntry: T
		) => {
			const linkedPath = this.parseLinkedPath(frontmatter, propName);
			if (linkedPath) {
				if (!cache.has(linkedPath)) {
					cache.set(linkedPath, defaultEntry);
				}
				const entry = cache.get(linkedPath)!;
				if (!entry[arrayKey].includes(filePath)) {
					entry[arrayKey].push(filePath);
				}
			}
		};

		if (type === "project") {
			addToCache(this.goalCache, projectGoalProp, "projects", { projects: [], tasks: [] });
		} else if (type === "task") {
			addToCache(this.goalCache, taskGoalProp, "tasks", { projects: [], tasks: [] });
			addToCache(this.projectCache, taskProjectProp, "tasks", { tasks: [] });
		}
	}

	private removeFromHierarchicalCache(relationships: FileRelationships): void {
		const { filePath, frontmatter, type } = relationships;
		const { projectGoalProp, taskGoalProp, taskProjectProp } = this.settings;

		const removeFromCache = <T extends { [key: string]: string[] }>(
			cache: Map<string, T>,
			propName: string,
			arrayKey: keyof T
		) => {
			const linkedPath = this.parseLinkedPath(frontmatter, propName);
			if (linkedPath) {
				const entry = cache.get(linkedPath);
				if (entry) {
					entry[arrayKey] = entry[arrayKey].filter((p) => p !== filePath) as T[keyof T];
				}
			}
		};

		if (type === "goal") {
			this.goalCache.delete(filePath);
		} else if (type === "project") {
			removeFromCache(this.goalCache, projectGoalProp, "projects");
			this.projectCache.delete(filePath);
		} else if (type === "task") {
			removeFromCache(this.goalCache, taskGoalProp, "tasks");
			removeFromCache(this.projectCache, taskProjectProp, "tasks");
		}
	}

	getGoalHierarchy(goalPath: string): GoalHierarchy | null {
		return this.goalCache.get(goalPath) ?? null;
	}

	getProjectHierarchy(projectPath: string): ProjectHierarchy | null {
		return this.projectCache.get(projectPath) ?? null;
	}

	getAllGoals(): string[] {
		return Array.from(this.goalCache.keys());
	}

	getAllProjects(): string[] {
		return Array.from(this.projectCache.keys());
	}

	getSettings(): Readonly<FusionGoalsSettings> {
		return this.settings;
	}
}

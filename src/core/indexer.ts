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
import {
	applyInheritanceRemovals,
	applyInheritanceUpdates,
	detectPropertyRemovals,
	getInheritableProperties,
} from "src/utils/inheritance";
import { normalizePathToFilename } from "src/utils/path";
import { parseLinkedPathsFromProperty } from "src/utils/property";
import { type FileType, SCAN_CONCURRENCY } from "../types/constants";
import type { Frontmatter, FusionGoalsSettings } from "../types/settings";
import { calculateDaysRemainingFromFrontmatter } from "../utils/date";
import type { InheritanceRemoval, InheritanceUpdate } from "../utils/inheritance";

export interface FileRelationships {
	filePath: string;
	mtime: number;
	type: FileType;
	frontmatter: Frontmatter;
	daysSince: string | null;
	daysRemaining: string | null;
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

export interface GoalChildrenCache {
	tasks: string[];
}

export class Indexer {
	private settings: FusionGoalsSettings;
	private fileSub: Subscription | null = null;
	private settingsSubscription: Subscription | null = null;
	private app: App;
	private vault: Vault;
	private metadataCache: MetadataCache;
	private scanEventsSubject = new Subject<IndexerEvent>();
	private relationshipsCache = new Map<string, FileRelationships>();

	private goalToChildren = new Map<string, GoalChildrenCache>();

	private isInitialCacheBuilt = false;

	public readonly events$: Observable<IndexerEvent>;

	constructor(app: App, settingsStore: BehaviorSubject<FusionGoalsSettings>) {
		this.app = app;
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
		if (!this.settings.goalsDirectory || !this.settings.tasksDirectory) {
			console.warn(
				"⚠️ Fusion Goals: One or more required directories (goals, tasks) are not defined. Plugin will not function properly."
			);
			return;
		}

		console.log(
			`🚀 Starting indexer with directories: Goals: "${this.settings.goalsDirectory}" Tasks: "${this.settings.tasksDirectory}"`
		);

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
		this.goalToChildren.clear();
		this.isInitialCacheBuilt = false;
	}

	private async buildInitialCache(): Promise<void> {
		const allFiles = this.vault.getMarkdownFiles();
		const relevantFiles = allFiles.filter((file) => this.getFileType(file.path) !== null);

		for (const file of relevantFiles) {
			await this.buildEvent(file);
		}

		this.isInitialCacheBuilt = true;
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

			this.isInitialCacheBuilt = true;

			await this.propagateAllInheritance();
		} catch (error) {
			console.error("❌ Error during file scanning:", error);
		}
	}

	getFileType(filePath: string): FileType | null {
		const { goalsDirectory, tasksDirectory } = this.settings;

		const normalizeDir = (dir: string) => (dir.endsWith("/") ? dir : `${dir}/`);
		const goalsDir = normalizeDir(goalsDirectory);
		const tasksDir = normalizeDir(tasksDirectory);

		if (filePath.startsWith(goalsDir)) {
			return "goal";
		}
		if (filePath.startsWith(tasksDir)) {
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

		// Handle renames by updating the cache and emitting events for affected files
		// Obsidian automatically updates all wiki links, so we just sync the cache
		// Debounce by 1 second to let Obsidian finish updating all links
		renamed$
			.pipe(
				filter(([f]) => Indexer.isMarkdownFile(f)),
				debounceTime(1000)
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

					if (oldRelationships) {
						this.deleteFromHierarchicalCache(oldRelationships);
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

		this.deleteFromHierarchicalCache(oldRelationships);

		const newRelationships: FileRelationships = {
			filePath: newFile.path,
			mtime: newFile.stat.mtime,
			type: oldRelationships.type,
			frontmatter,
			daysSince: oldRelationships.daysSince,
			daysRemaining: oldRelationships.daysRemaining,
		};
		this.relationshipsCache.delete(oldPath);
		this.relationshipsCache.set(newFile.path, newRelationships);

		// Add new entry to hierarchical cache
		this.updateHierarchicalCache(newRelationships);

		// Emit event for the renamed file itself
		this.scanEventsSubject.next({
			type: "file-changed",
			fileType: newRelationships.type,
			filePath: newFile.path,
			oldRelationships,
			newRelationships,
		});
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

		const { daysSince, daysRemaining } = this.calculateDateValues(frontmatter);

		const oldRelationships = this.relationshipsCache.get(file.path);
		const newRelationships: FileRelationships = {
			filePath: file.path,
			mtime: file.stat.mtime,
			type: fileType,
			frontmatter,
			daysSince: daysSince ?? null,
			daysRemaining: daysRemaining ?? null,
		};

		this.relationshipsCache.set(file.path, newRelationships);
		this.updateHierarchicalCache(newRelationships);

		if (this.isInitialCacheBuilt && fileType === "goal") {
			await this.propagateInheritance(newRelationships, oldRelationships);
		}

		return {
			type: "file-changed",
			fileType,
			filePath: file.path,
			oldRelationships,
			newRelationships,
		};
	}

	private calculateDateValues(frontmatter: Frontmatter): { daysSince?: string; daysRemaining?: string } {
		const { startDateProperty, endDateProperty } = this.settings;
		const result: { daysSince?: string; daysRemaining?: string } = {};

		// Always calculate date values for use in deadlines overview and other features
		const setDateValue = (property: string | undefined, key: "daysSince" | "daysRemaining") => {
			if (property) {
				const value = frontmatter[property];
				const days = calculateDaysRemainingFromFrontmatter(value);
				if (days !== null) {
					result[key] = days;
				}
			}
		};

		setDateValue(startDateProperty, "daysSince");
		setDateValue(endDateProperty, "daysRemaining");

		return result;
	}

	private updateHierarchicalCache(relationships: FileRelationships): void {
		const { filePath, frontmatter, type } = relationships;
		const { taskGoalProp } = this.settings;

		const normalizedKey = normalizePathToFilename(filePath);

		const linkToParents = (parentCache: Map<string, GoalChildrenCache>, parentPaths: string[], childKey: string) => {
			for (const parentPath of parentPaths) {
				const normalizedParentKey = normalizePathToFilename(parentPath);
				if (!parentCache.has(normalizedParentKey)) {
					parentCache.set(normalizedParentKey, { tasks: [] });
				}
				const children = parentCache.get(normalizedParentKey)!;
				if (!children.tasks.includes(childKey)) {
					children.tasks.push(childKey);
				}
			}
		};

		if (type === "goal") {
			if (!this.goalToChildren.has(normalizedKey)) {
				this.goalToChildren.set(normalizedKey, { tasks: [] });
			}
		} else if (type === "task") {
			const goalPaths = parseLinkedPathsFromProperty(frontmatter[taskGoalProp]);
			linkToParents(this.goalToChildren, goalPaths, normalizedKey);
		}
	}

	private deleteFromHierarchicalCache(relationships: FileRelationships): void {
		const { filePath, frontmatter, type } = relationships;
		const { taskGoalProp } = this.settings;

		const normalizedKey = normalizePathToFilename(filePath);

		const unlinkFromParents = (
			parentCache: Map<string, GoalChildrenCache>,
			parentPaths: string[],
			childKey: string
		) => {
			for (const parentPath of parentPaths) {
				const normalizedParentKey = normalizePathToFilename(parentPath);
				const children = parentCache.get(normalizedParentKey);
				if (children) {
					children.tasks = children.tasks.filter((p) => p !== childKey);
				}
			}
		};

		if (type === "goal") {
			this.goalToChildren.delete(normalizedKey);
		} else if (type === "task") {
			const goalPaths = parseLinkedPathsFromProperty(frontmatter[taskGoalProp]);
			unlinkFromParents(this.goalToChildren, goalPaths, normalizedKey);
		}
	}

	getGoalHierarchy(goalPath: string): GoalChildrenCache | null {
		const normalized = normalizePathToFilename(goalPath);
		const cache = this.goalToChildren.get(normalized);
		if (!cache) return null;

		return {
			tasks: this.resolveFullPaths(cache.tasks),
		};
	}

	getAllGoals(): string[] {
		return this.resolveFullPaths(Array.from(this.goalToChildren.keys()));
	}

	private resolveFullPaths(normalizedFilenames: string[]): string[] {
		return normalizedFilenames
			.map((filename) => {
				for (const fullPath of this.relationshipsCache.keys()) {
					if (normalizePathToFilename(fullPath) === filename) {
						return fullPath;
					}
				}
				return filename;
			})
			.filter((path) => path !== undefined);
	}

	getRelationships(filePath: string): FileRelationships | null {
		return this.relationshipsCache.get(filePath) ?? null;
	}

	getRelationshipsCache(): ReadonlyMap<string, FileRelationships> {
		return this.relationshipsCache;
	}

	getSettings(): Readonly<FusionGoalsSettings> {
		return this.settings;
	}

	private async propagateAllInheritance(): Promise<void> {
		if (!this.settings.enableFrontmatterInheritance) {
			return;
		}
		for (const [_goalPath, goalData] of this.relationshipsCache.entries()) {
			if (goalData.type === "goal") {
				await this.propagateInheritance(goalData);
			}
		}
	}

	private async propagateInheritance(parentFile: FileRelationships, oldParentFile?: FileRelationships): Promise<void> {
		if (!this.settings.enableFrontmatterInheritance) {
			return;
		}

		const { type, frontmatter, filePath } = parentFile;
		const normalizedKey = normalizePathToFilename(filePath);
		const inheritableProps = getInheritableProperties(frontmatter, this.settings);
		const propertyRemovals = oldParentFile
			? detectPropertyRemovals(oldParentFile.frontmatter, frontmatter, this.settings)
			: {};

		const createInheritanceChanges = (
			affectedPaths: string[],
			customProperties?: Record<string, unknown>
		): { updates: InheritanceUpdate[]; removals: InheritanceRemoval[] } => {
			const propsToUse = customProperties ?? inheritableProps;
			const updates = affectedPaths.map((fullPath) => ({
				filePath: fullPath,
				properties: propsToUse,
			}));

			const removals =
				Object.keys(propertyRemovals).length > 0
					? affectedPaths.map((fullPath) => ({
							filePath: fullPath,
							propertyRemovals,
						}))
					: [];

			return { updates, removals };
		};

		let allUpdates: InheritanceUpdate[] = [];
		let allRemovals: InheritanceRemoval[] = [];

		if (type === "goal") {
			const hierarchy = this.goalToChildren.get(normalizedKey);
			if (hierarchy) {
				const taskPaths = this.resolveFullPaths(hierarchy.tasks);
				({ updates: allUpdates, removals: allRemovals } = createInheritanceChanges(taskPaths));
			}
		}

		await applyInheritanceRemovals(this.app, allRemovals);
		await applyInheritanceUpdates(this.app, allUpdates);
	}
}

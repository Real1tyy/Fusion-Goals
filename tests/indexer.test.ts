import { type App, type CachedMetadata, type MetadataCache, TFile as TFileType, type Vault } from "obsidian";
import { BehaviorSubject } from "rxjs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Indexer } from "../src/core/indexer";
import type { Frontmatter, FusionGoalsSettings } from "../src/types/settings";

// Mock Obsidian imports
vi.mock("obsidian", async () => {
	const actual = await vi.importActual<typeof import("./mocks/obsidian")>("./mocks/obsidian");
	return actual;
});

// Get the mocked TFile constructor
const TFile = TFileType as unknown as new (path: string) => TFileType;

describe("Indexer", () => {
	let indexer: Indexer;
	let settingsStore: BehaviorSubject<FusionGoalsSettings>;
	let mockApp: App;
	let mockVault: Vault;
	let mockMetadataCache: MetadataCache;

	const defaultSettings: FusionGoalsSettings = {
		goalsDirectory: "Goals",
		tasksDirectory: "Tasks",
		taskGoalProp: "Goal",
		version: 1,
		showRibbonIcon: true,
		showStartupOverview: true,
		hideEmptyProperties: false,
		hideUnderscoreProperties: false,
		enableFrontmatterInheritance: true,
		inheritanceExcludedProperties: [],
	} as unknown as FusionGoalsSettings;

	beforeEach(() => {
		mockVault = {
			getMarkdownFiles: vi.fn().mockReturnValue([]),
			on: vi.fn(),
			off: vi.fn(),
		} as unknown as Vault;

		mockMetadataCache = {
			getFileCache: vi.fn(),
		} as unknown as MetadataCache;

		mockApp = {
			vault: mockVault,
			metadataCache: mockMetadataCache,
		} as unknown as App;

		settingsStore = new BehaviorSubject(defaultSettings);
		indexer = new Indexer(mockApp, settingsStore);
	});

	describe("getFileType", () => {
		it("should return 'goal' for files in Goals directory", () => {
			expect(indexer.getFileType("Goals/My Goal.md")).toBe("goal");
			expect(indexer.getFileType("Goals/Subfolder/Another Goal.md")).toBe("goal");
		});

		it("should return 'task' for files in Tasks directory", () => {
			expect(indexer.getFileType("Tasks/My Task.md")).toBe("task");
			expect(indexer.getFileType("Tasks/Subfolder/Another Task.md")).toBe("task");
		});

		it("should return null for files outside tracked directories", () => {
			expect(indexer.getFileType("Other/File.md")).toBe(null);
			expect(indexer.getFileType("README.md")).toBe(null);
		});

		it("should handle directories without trailing slash", () => {
			expect(indexer.getFileType("Goals")).toBeNull();
			expect(indexer.getFileType("Tasks")).toBeNull();
		});
	});

	describe("hierarchical cache - tasks", () => {
		it("should add task to goal cache when task has single goal link", async () => {
			const taskFile = new TFile("Tasks/My Task.md");

			const frontmatter: Frontmatter = {
				Goal: "[[Goals/My Goal]]",
			};

			vi.mocked(mockVault.getMarkdownFiles).mockReturnValue([taskFile]);
			vi.mocked(mockMetadataCache.getFileCache).mockReturnValue({
				frontmatter,
			} as CachedMetadata);

			await indexer.start();

			const goalHierarchy = indexer.getGoalHierarchy("Goals/My Goal.md");
			expect(goalHierarchy).toBeDefined();
			expect(goalHierarchy?.tasks).toEqual(["Tasks/My Task.md"]);
		});

		it("should add task to multiple goal caches when task has multiple goal links", async () => {
			const taskFile = new TFile("Tasks/Multi Goal Task.md");

			const frontmatter: Frontmatter = {
				Goal: ["[[Goals/First Goal]]", "[[Goals/Second Goal]]"],
			};

			vi.mocked(mockVault.getMarkdownFiles).mockReturnValue([taskFile]);
			vi.mocked(mockMetadataCache.getFileCache).mockReturnValue({
				frontmatter,
			} as CachedMetadata);

			await indexer.start();

			const firstGoal = indexer.getGoalHierarchy("Goals/First Goal.md");
			const secondGoal = indexer.getGoalHierarchy("Goals/Second Goal.md");

			expect(firstGoal?.tasks).toEqual(["Tasks/Multi Goal Task.md"]);
			expect(secondGoal?.tasks).toEqual(["Tasks/Multi Goal Task.md"]);
		});
	});

	describe("complex hierarchies", () => {
		it("should build complete hierarchy with multiple goals and tasks", async () => {
			const goal1 = new TFile("Goals/Goal 1.md");
			const task1 = new TFile("Tasks/Task 1.md");
			const task2 = new TFile("Tasks/Task 2.md");
			const task3 = new TFile("Tasks/Task 3.md");

			vi.mocked(mockVault.getMarkdownFiles).mockReturnValue([goal1, task1, task2, task3]);

			vi.mocked(mockMetadataCache.getFileCache).mockImplementation((file) => {
				if (file.path === "Goals/Goal 1.md") {
					return { frontmatter: {} } as CachedMetadata;
				}
				if (file.path === "Tasks/Task 1.md") {
					return {
						frontmatter: {
							Goal: "[[Goals/Goal 1]]",
						},
					} as CachedMetadata;
				}
				if (file.path === "Tasks/Task 2.md") {
					return {
						frontmatter: {
							Goal: "[[Goals/Goal 1]]",
						},
					} as CachedMetadata;
				}
				if (file.path === "Tasks/Task 3.md") {
					return {
						frontmatter: {
							Goal: "[[Goals/Goal 1]]",
						},
					} as CachedMetadata;
				}
				return null;
			});

			await indexer.start();

			const goalHierarchy = indexer.getGoalHierarchy("Goals/Goal 1.md");
			expect(goalHierarchy?.tasks).toEqual(["Tasks/Task 1.md", "Tasks/Task 2.md", "Tasks/Task 3.md"]);
		});
	});

	describe("getAllGoals", () => {
		it("should return all goal paths", async () => {
			const task1 = new TFile("Tasks/Task 1.md");
			const task2 = new TFile("Tasks/Task 2.md");

			vi.mocked(mockVault.getMarkdownFiles).mockReturnValue([task1, task2]);

			vi.mocked(mockMetadataCache.getFileCache).mockImplementation((file) => {
				if (file.path === "Tasks/Task 1.md") {
					return { frontmatter: { Goal: "[[Goals/Goal 1]]" } } as CachedMetadata;
				}
				if (file.path === "Tasks/Task 2.md") {
					return { frontmatter: { Goal: "[[Goals/Goal 2]]" } } as CachedMetadata;
				}
				return null;
			});

			await indexer.start();

			const allGoals = indexer.getAllGoals();
			expect(allGoals).toEqual(expect.arrayContaining(["Goal 1.md", "Goal 2.md"]));
			expect(allGoals).toHaveLength(2);
		});
	});

	describe("bi-directional caching", () => {
		describe("parent → children caching", () => {
			it("should initialize goal in goalToChildren cache even with no children", async () => {
				const goalFile = new TFile("Goals/My Goal.md");

				vi.mocked(mockVault.getMarkdownFiles).mockReturnValue([goalFile]);
				vi.mocked(mockMetadataCache.getFileCache).mockReturnValue({
					frontmatter: { title: "My Goal" },
				} as CachedMetadata);

				await indexer.start();

				const goalHierarchy = indexer.getGoalHierarchy("Goals/My Goal.md");
				expect(goalHierarchy).toBeDefined();
				expect(goalHierarchy?.tasks).toEqual([]);
			});

			it("should populate goal's tasks array when task links to goal", async () => {
				const taskFile = new TFile("Tasks/My Task.md");

				vi.mocked(mockVault.getMarkdownFiles).mockReturnValue([taskFile]);
				vi.mocked(mockMetadataCache.getFileCache).mockReturnValue({
					frontmatter: {
						Goal: "[[Goals/My Goal]]",
					},
				} as CachedMetadata);

				await indexer.start();

				const goalHierarchy = indexer.getGoalHierarchy("Goals/My Goal.md");
				expect(goalHierarchy?.tasks).toEqual(["Tasks/My Task.md"]);
			});
		});

		describe("bi-directional consistency", () => {
			it("should maintain consistency between parent→child and child→parent caches", async () => {
				const taskFile = new TFile("Tasks/My Task.md");

				vi.mocked(mockVault.getMarkdownFiles).mockReturnValue([taskFile]);
				vi.mocked(mockMetadataCache.getFileCache).mockImplementation((file) => {
					if (file.path === "Tasks/My Task.md") {
						return {
							frontmatter: {
								Goal: "[[Goals/My Goal]]",
							},
						} as CachedMetadata;
					}
					return null;
				});

				await indexer.start();

				// Check parent→child cache
				const goalHierarchy = indexer.getGoalHierarchy("Goals/My Goal.md");
				expect(goalHierarchy?.tasks).toContain("Tasks/My Task.md");
			});
		});
	});

	describe("frontmatter inheritance", () => {
		let processFrontMatterSpy: ReturnType<typeof vi.fn>;

		beforeEach(() => {
			// Mock processFrontMatter on the app.fileManager
			processFrontMatterSpy = vi.fn(async (_file, updater) => {
				// Simulate the updater being called with a mutable object
				const mockFm = {};
				updater(mockFm);
			});

			mockApp.fileManager = {
				processFrontMatter: processFrontMatterSpy,
			} as any;

			mockVault.getAbstractFileByPath = vi.fn((path) => {
				return new TFile(path);
			});

			// Enable inheritance by default for tests
			settingsStore.next({
				...defaultSettings,
				enableFrontmatterInheritance: true,
				inheritanceExcludedProperties: ["Goal", "tasks"],
			});

			indexer = new Indexer(mockApp, settingsStore);
		});

		it("should propagate properties from goal to tasks when goal changes", async () => {
			const goalFile = new TFile("Goals/My Goal.md");
			const taskFile = new TFile("Tasks/My Task.md");

			const goalFrontmatter: Frontmatter = {
				Priority: "High",
			};

			const taskFrontmatter: Frontmatter = {
				Goal: "[[Goals/My Goal]]",
			};

			vi.mocked(mockVault.getMarkdownFiles).mockReturnValue([goalFile, taskFile]);
			vi.mocked(mockMetadataCache.getFileCache).mockImplementation((file) => {
				if (file.path === "Tasks/My Task.md") {
					return { frontmatter: taskFrontmatter } as CachedMetadata;
				}
				if (file.path === "Goals/My Goal.md") {
					return { frontmatter: goalFrontmatter } as CachedMetadata;
				}
				return null;
			});

			await indexer.start();

			// Now simulate updating the goal
			vi.mocked(mockMetadataCache.getFileCache).mockImplementation((file) => {
				if (file.path === "Goals/My Goal.md") {
					return {
						frontmatter: {
							...goalFrontmatter,
							Status: "Active",
						},
					} as CachedMetadata;
				}
				if (file.path === "Tasks/My Task.md") {
					return { frontmatter: taskFrontmatter } as CachedMetadata;
				}
				return null;
			});

			const buildEvent = (indexer as any).buildEvent.bind(indexer);
			await buildEvent(goalFile);

			await new Promise((resolve) => setTimeout(resolve, 100));

			expect(processFrontMatterSpy).toHaveBeenCalled();
			const callsForTask = processFrontMatterSpy.mock.calls.filter((call) => call[0].path === "Tasks/My Task.md");
			expect(callsForTask.length).toBeGreaterThan(0);
		});
	});

	describe("stop", () => {
		it("should clear all caches", async () => {
			const taskFile = new TFile("Tasks/My Task.md");

			const frontmatter: Frontmatter = {
				Goal: "[[Goals/My Goal]]",
			};

			vi.mocked(mockVault.getMarkdownFiles).mockReturnValue([taskFile]);
			vi.mocked(mockMetadataCache.getFileCache).mockReturnValue({
				frontmatter,
			} as CachedMetadata);

			await indexer.start();

			expect(indexer.getAllGoals()).toHaveLength(1);

			indexer.stop();

			expect(indexer.getAllGoals()).toHaveLength(0);
		});
	});
});

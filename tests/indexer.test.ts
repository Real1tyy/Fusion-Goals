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
		projectsDirectory: "Projects",
		tasksDirectory: "Tasks",
		projectGoalProp: "Goal",
		taskGoalProp: "Goal",
		taskProjectProp: "Project",
	} as FusionGoalsSettings;

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

		it("should return 'project' for files in Projects directory", () => {
			expect(indexer.getFileType("Projects/My Project.md")).toBe("project");
			expect(indexer.getFileType("Projects/Subfolder/Another Project.md")).toBe("project");
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
			expect(indexer.getFileType("Goals")).toBe("goal");
			expect(indexer.getFileType("Projects")).toBe("project");
			expect(indexer.getFileType("Tasks")).toBe("task");
		});
	});

	describe("hierarchical cache - projects", () => {
		it("should add project to goal cache when project has single goal link", async () => {
			const projectFile = new TFile("Projects/My Project.md");

			const frontmatter: Frontmatter = {
				Goal: "[[Goals/My Goal]]",
			};

			vi.mocked(mockVault.getMarkdownFiles).mockReturnValue([projectFile]);
			vi.mocked(mockMetadataCache.getFileCache).mockReturnValue({
				frontmatter,
			} as CachedMetadata);

			await indexer.start();

			const goalHierarchy = indexer.getGoalHierarchy("Goals/My Goal.md");
			expect(goalHierarchy).toBeDefined();
			expect(goalHierarchy?.projects).toEqual(["Projects/My Project.md"]);
			expect(goalHierarchy?.tasks).toEqual([]);
		});

		it("should add project to multiple goal caches when project has multiple goal links", async () => {
			const projectFile = new TFile("Projects/Multi Goal Project.md");

			const frontmatter: Frontmatter = {
				Goal: ["[[Goals/First Goal]]", "[[Goals/Second Goal]]", "[[Goals/Third Goal]]"],
			};

			vi.mocked(mockVault.getMarkdownFiles).mockReturnValue([projectFile]);
			vi.mocked(mockMetadataCache.getFileCache).mockReturnValue({
				frontmatter,
			} as CachedMetadata);

			await indexer.start();

			const firstGoal = indexer.getGoalHierarchy("Goals/First Goal.md");
			const secondGoal = indexer.getGoalHierarchy("Goals/Second Goal.md");
			const thirdGoal = indexer.getGoalHierarchy("Goals/Third Goal.md");

			expect(firstGoal?.projects).toEqual(["Projects/Multi Goal Project.md"]);
			expect(secondGoal?.projects).toEqual(["Projects/Multi Goal Project.md"]);
			expect(thirdGoal?.projects).toEqual(["Projects/Multi Goal Project.md"]);
		});

		it("should handle project with goal link containing alias", async () => {
			const projectFile = new TFile("Projects/My Project.md");

			const frontmatter: Frontmatter = {
				Goal: "[[Goals/My Goal|Display Name]]",
			};

			vi.mocked(mockVault.getMarkdownFiles).mockReturnValue([projectFile]);
			vi.mocked(mockMetadataCache.getFileCache).mockReturnValue({
				frontmatter,
			} as CachedMetadata);

			await indexer.start();

			const goalHierarchy = indexer.getGoalHierarchy("Goals/My Goal.md");
			expect(goalHierarchy?.projects).toEqual(["Projects/My Project.md"]);
		});

		it("should not add project to cache when goal link is empty", async () => {
			const projectFile = new TFile("Projects/No Goal Project.md");

			const frontmatter: Frontmatter = {
				Goal: [],
			};

			vi.mocked(mockVault.getMarkdownFiles).mockReturnValue([projectFile]);
			vi.mocked(mockMetadataCache.getFileCache).mockReturnValue({
				frontmatter,
			} as CachedMetadata);

			await indexer.start();

			expect(indexer.getAllGoals()).toEqual([]);
		});
	});

	describe("hierarchical cache - tasks", () => {
		it("should add task to goal cache when task has single goal link", async () => {
			const taskFile = new TFile("Tasks/My Task.md");

			const frontmatter: Frontmatter = {
				Goal: "[[Goals/My Goal]]",
				Project: [],
			};

			vi.mocked(mockVault.getMarkdownFiles).mockReturnValue([taskFile]);
			vi.mocked(mockMetadataCache.getFileCache).mockReturnValue({
				frontmatter,
			} as CachedMetadata);

			await indexer.start();

			const goalHierarchy = indexer.getGoalHierarchy("Goals/My Goal.md");
			expect(goalHierarchy).toBeDefined();
			expect(goalHierarchy?.tasks).toEqual(["Tasks/My Task.md"]);
			expect(goalHierarchy?.projects).toEqual([]);
		});

		it("should add task to multiple goal caches when task has multiple goal links", async () => {
			const taskFile = new TFile("Tasks/Multi Goal Task.md");

			const frontmatter: Frontmatter = {
				Goal: ["[[Goals/First Goal]]", "[[Goals/Second Goal]]"],
				Project: [],
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

		it("should add task to project cache when task has single project link", async () => {
			const taskFile = new TFile("Tasks/My Task.md");

			const frontmatter: Frontmatter = {
				Goal: [],
				Project: "[[Projects/My Project]]",
			};

			vi.mocked(mockVault.getMarkdownFiles).mockReturnValue([taskFile]);
			vi.mocked(mockMetadataCache.getFileCache).mockReturnValue({
				frontmatter,
			} as CachedMetadata);

			await indexer.start();

			const projectHierarchy = indexer.getProjectHierarchy("Projects/My Project.md");
			expect(projectHierarchy).toBeDefined();
			expect(projectHierarchy?.tasks).toEqual(["Tasks/My Task.md"]);
		});

		it("should add task to multiple project caches when task has multiple project links", async () => {
			const taskFile = new TFile("Tasks/Multi Project Task.md");

			const frontmatter: Frontmatter = {
				Goal: [],
				Project: ["[[Projects/First Project]]", "[[Projects/Second Project]]"],
			};

			vi.mocked(mockVault.getMarkdownFiles).mockReturnValue([taskFile]);
			vi.mocked(mockMetadataCache.getFileCache).mockReturnValue({
				frontmatter,
			} as CachedMetadata);

			await indexer.start();

			const firstProject = indexer.getProjectHierarchy("Projects/First Project.md");
			const secondProject = indexer.getProjectHierarchy("Projects/Second Project.md");

			expect(firstProject?.tasks).toEqual(["Tasks/Multi Project Task.md"]);
			expect(secondProject?.tasks).toEqual(["Tasks/Multi Project Task.md"]);
		});

		it("should add task to both goal and project caches", async () => {
			const taskFile = new TFile("Tasks/Complete Task.md");

			const frontmatter: Frontmatter = {
				Goal: "[[Goals/My Goal]]",
				Project: "[[Projects/My Project]]",
			};

			vi.mocked(mockVault.getMarkdownFiles).mockReturnValue([taskFile]);
			vi.mocked(mockMetadataCache.getFileCache).mockReturnValue({
				frontmatter,
			} as CachedMetadata);

			await indexer.start();

			const goalHierarchy = indexer.getGoalHierarchy("Goals/My Goal.md");
			const projectHierarchy = indexer.getProjectHierarchy("Projects/My Project.md");

			expect(goalHierarchy?.tasks).toEqual(["Tasks/Complete Task.md"]);
			expect(projectHierarchy?.tasks).toEqual(["Tasks/Complete Task.md"]);
		});
	});

	describe("complex hierarchies", () => {
		it("should build complete hierarchy with multiple goals, projects, and tasks", async () => {
			const goal1 = new TFile("Goals/Goal 1.md");
			const project1 = new TFile("Projects/Project 1.md");
			const project2 = new TFile("Projects/Project 2.md");
			const task1 = new TFile("Tasks/Task 1.md");
			const task2 = new TFile("Tasks/Task 2.md");
			const task3 = new TFile("Tasks/Task 3.md");

			vi.mocked(mockVault.getMarkdownFiles).mockReturnValue([goal1, project1, project2, task1, task2, task3]);

			vi.mocked(mockMetadataCache.getFileCache).mockImplementation((file) => {
				if (file.path === "Goals/Goal 1.md") {
					return { frontmatter: {} } as CachedMetadata;
				}
				if (file.path === "Projects/Project 1.md") {
					return { frontmatter: { Goal: "[[Goals/Goal 1]]" } } as CachedMetadata;
				}
				if (file.path === "Projects/Project 2.md") {
					return { frontmatter: { Goal: "[[Goals/Goal 1]]" } } as CachedMetadata;
				}
				if (file.path === "Tasks/Task 1.md") {
					return {
						frontmatter: {
							Goal: "[[Goals/Goal 1]]",
							Project: "[[Projects/Project 1]]",
						},
					} as CachedMetadata;
				}
				if (file.path === "Tasks/Task 2.md") {
					return {
						frontmatter: {
							Goal: "[[Goals/Goal 1]]",
							Project: "[[Projects/Project 1]]",
						},
					} as CachedMetadata;
				}
				if (file.path === "Tasks/Task 3.md") {
					return {
						frontmatter: {
							Goal: "[[Goals/Goal 1]]",
							Project: "[[Projects/Project 2]]",
						},
					} as CachedMetadata;
				}
				return null;
			});

			await indexer.start();

			const goalHierarchy = indexer.getGoalHierarchy("Goals/Goal 1.md");
			expect(goalHierarchy?.projects).toEqual(["Projects/Project 1.md", "Projects/Project 2.md"]);
			expect(goalHierarchy?.tasks).toEqual(["Tasks/Task 1.md", "Tasks/Task 2.md", "Tasks/Task 3.md"]);

			const project1Hierarchy = indexer.getProjectHierarchy("Projects/Project 1.md");
			expect(project1Hierarchy?.tasks).toEqual(["Tasks/Task 1.md", "Tasks/Task 2.md"]);

			const project2Hierarchy = indexer.getProjectHierarchy("Projects/Project 2.md");
			expect(project2Hierarchy?.tasks).toEqual(["Tasks/Task 3.md"]);
		});
	});

	describe("getAllGoals and getAllProjects", () => {
		it("should return all goal paths", async () => {
			const project1 = new TFile("Projects/Project 1.md");
			const project2 = new TFile("Projects/Project 2.md");

			vi.mocked(mockVault.getMarkdownFiles).mockReturnValue([project1, project2]);

			vi.mocked(mockMetadataCache.getFileCache).mockImplementation((file) => {
				if (file.path === "Projects/Project 1.md") {
					return { frontmatter: { Goal: "[[Goals/Goal 1]]" } } as CachedMetadata;
				}
				if (file.path === "Projects/Project 2.md") {
					return { frontmatter: { Goal: "[[Goals/Goal 2]]" } } as CachedMetadata;
				}
				return null;
			});

			await indexer.start();

			const allGoals = indexer.getAllGoals();
			expect(allGoals).toEqual(expect.arrayContaining(["Goals/Goal 1.md", "Goals/Goal 2.md"]));
			expect(allGoals).toHaveLength(2);
		});

		it("should return all project paths", async () => {
			const task1 = new TFile("Tasks/Task 1.md");
			const task2 = new TFile("Tasks/Task 2.md");

			vi.mocked(mockVault.getMarkdownFiles).mockReturnValue([task1, task2]);

			vi.mocked(mockMetadataCache.getFileCache).mockImplementation((file) => {
				if (file.path === "Tasks/Task 1.md") {
					return { frontmatter: { Goal: [], Project: "[[Projects/Project 1]]" } } as CachedMetadata;
				}
				if (file.path === "Tasks/Task 2.md") {
					return { frontmatter: { Goal: [], Project: "[[Projects/Project 2]]" } } as CachedMetadata;
				}
				return null;
			});

			await indexer.start();

			const allProjects = indexer.getAllProjects();
			expect(allProjects).toEqual(expect.arrayContaining(["Projects/Project 1.md", "Projects/Project 2.md"]));
			expect(allProjects).toHaveLength(2);
		});
	});

	describe("stop", () => {
		it("should clear all caches", async () => {
			const projectFile = new TFile("Projects/My Project.md");

			const frontmatter: Frontmatter = {
				Goal: "[[Goals/My Goal]]",
			};

			vi.mocked(mockVault.getMarkdownFiles).mockReturnValue([projectFile]);
			vi.mocked(mockMetadataCache.getFileCache).mockReturnValue({
				frontmatter,
			} as CachedMetadata);

			await indexer.start();

			expect(indexer.getAllGoals()).toHaveLength(1);

			indexer.stop();

			expect(indexer.getAllGoals()).toHaveLength(0);
			expect(indexer.getAllProjects()).toHaveLength(0);
		});
	});
});

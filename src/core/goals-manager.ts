import { extractFileName, type VaultRow, type VaultTable, type VaultTableEvent } from "@real1ty-obsidian-plugins";
import { merge, type Observable } from "rxjs";
import { map } from "rxjs/operators";

import type { FileType } from "../types/constants";
import type { GoalFrontmatter, GoalRow, TaskFrontmatter, TaskRow } from "../types/frontmatter";
import type { FusionGoalsSettings } from "../types/settings";
import { calculateDaysRemainingFromFrontmatter } from "../utils/date";
import { normalizePathToFilename } from "../utils/path";
import { parseLinkedPathsFromProperty } from "../utils/property";

export interface GoalsManagerEvent {
	type: "row-created" | "row-updated" | "row-deleted";
	fileType: FileType;
	filePath: string;
}

const EMPTY_LABEL = "(Empty)";

export class GoalsManager {
	public readonly events$: Observable<GoalsManagerEvent>;

	constructor(
		private goalsTable: VaultTable<GoalFrontmatter>,
		private tasksTable: VaultTable<TaskFrontmatter>,
		private settingsGetter: () => FusionGoalsSettings
	) {
		this.events$ = merge(
			this.goalsTable.events$.pipe(map((e) => this.toManagerEvent(e, "goal"))),
			this.tasksTable.events$.pipe(map((e) => this.toManagerEvent(e, "task")))
		);
	}

	private toManagerEvent(
		event: VaultTableEvent<GoalFrontmatter | TaskFrontmatter>,
		fileType: FileType
	): GoalsManagerEvent {
		return { type: event.type, fileType, filePath: event.filePath };
	}

	getFileType(filePath: string): FileType | null {
		const name = extractFileName(filePath);
		if (this.goalsTable.has(name)) return "goal";
		if (this.tasksTable.has(name)) return "task";

		const settings = this.settingsGetter();
		const goalsDir = settings.goalsDirectory.endsWith("/") ? settings.goalsDirectory : `${settings.goalsDirectory}/`;
		const tasksDir = settings.tasksDirectory.endsWith("/") ? settings.tasksDirectory : `${settings.tasksDirectory}/`;

		if (filePath.startsWith(goalsDir)) return "goal";
		if (filePath.startsWith(tasksDir)) return "task";
		return null;
	}

	getGoal(filePath: string): GoalRow | undefined {
		return this.goalsTable.get(extractFileName(filePath));
	}

	getTask(filePath: string): TaskRow | undefined {
		return this.tasksTable.get(extractFileName(filePath));
	}

	getRow(filePath: string): VaultRow<GoalFrontmatter> | VaultRow<TaskFrontmatter> | undefined {
		const name = extractFileName(filePath);
		return this.goalsTable.get(name) ?? this.tasksTable.get(name);
	}

	getAllGoals(): ReadonlyArray<GoalRow> {
		return this.goalsTable.toArray();
	}

	getAllTasks(): ReadonlyArray<TaskRow> {
		return this.tasksTable.toArray();
	}

	getTasksForGoal(goalPath: string): TaskRow[] {
		const normalizedGoalPath = normalizePathToFilename(goalPath);
		return this.tasksTable.where((row) => {
			const goalLinks = parseLinkedPathsFromProperty(row.data.goal);
			return goalLinks.some((linkPath) => normalizePathToFilename(linkPath) === normalizedGoalPath);
		});
	}

	getDateInfo(filePath: string): { daysSince: string | null; daysRemaining: string | null } {
		const row = this.getRow(filePath);
		if (!row) return { daysSince: null, daysRemaining: null };

		return {
			daysSince: calculateDaysRemainingFromFrontmatter(row.data.startDate) ?? null,
			daysRemaining: calculateDaysRemainingFromFrontmatter(row.data.endDate) ?? null,
		};
	}

	getSettings(): Readonly<FusionGoalsSettings> {
		return this.settingsGetter();
	}

	// --- CRUD operations ---

	async createGoal(fileName: string, data: Partial<GoalFrontmatter>): Promise<GoalRow> {
		return this.goalsTable.create({ fileName, data: data as GoalFrontmatter });
	}

	async updateGoal(fileName: string, data: Partial<GoalFrontmatter>): Promise<GoalRow> {
		return this.goalsTable.update(fileName, data as GoalFrontmatter);
	}

	async deleteGoal(fileName: string): Promise<void> {
		return this.goalsTable.delete(fileName);
	}

	async createTask(fileName: string, data: Partial<TaskFrontmatter>): Promise<TaskRow> {
		return this.tasksTable.create({ fileName, data: data as TaskFrontmatter });
	}

	async updateTask(fileName: string, data: Partial<TaskFrontmatter>): Promise<TaskRow> {
		return this.tasksTable.update(fileName, data as TaskFrontmatter);
	}

	async deleteTask(fileName: string): Promise<void> {
		return this.tasksTable.delete(fileName);
	}

	// --- Stats / distribution ---

	getStats(): { totalGoals: number; totalTasks: number } {
		return {
			totalGoals: this.goalsTable.count(),
			totalTasks: this.tasksTable.count(),
		};
	}

	getStatusDistribution(type: FileType): Map<string, number> {
		const rows = type === "goal" ? this.goalsTable.toArray() : this.tasksTable.toArray();
		return this.computeFieldDistribution(rows, "status");
	}

	getPriorityDistribution(type: FileType): Map<string, number> {
		const rows = type === "goal" ? this.goalsTable.toArray() : this.tasksTable.toArray();
		return this.computeFieldDistribution(rows, "priority");
	}

	getProgressDistribution(): Map<string, number> {
		const goals = this.goalsTable.toArray();
		const tasks = this.tasksTable.toArray();
		const all = [...goals, ...tasks];

		const buckets = new Map<string, number>([
			["0%", 0],
			["1-25%", 0],
			["26-50%", 0],
			["51-75%", 0],
			["76-99%", 0],
			["100%", 0],
			["Not Set", 0],
		]);

		for (const row of all) {
			const progress = row.data.progress;
			if (progress == null) {
				buckets.set("Not Set", (buckets.get("Not Set") ?? 0) + 1);
			} else if (progress === 0) {
				buckets.set("0%", (buckets.get("0%") ?? 0) + 1);
			} else if (progress <= 25) {
				buckets.set("1-25%", (buckets.get("1-25%") ?? 0) + 1);
			} else if (progress <= 50) {
				buckets.set("26-50%", (buckets.get("26-50%") ?? 0) + 1);
			} else if (progress <= 75) {
				buckets.set("51-75%", (buckets.get("51-75%") ?? 0) + 1);
			} else if (progress < 100) {
				buckets.set("76-99%", (buckets.get("76-99%") ?? 0) + 1);
			} else {
				buckets.set("100%", (buckets.get("100%") ?? 0) + 1);
			}
		}

		return new Map([...buckets.entries()].filter(([, count]) => count > 0));
	}

	getDeadlineDistribution(): Map<string, number> {
		const goals = this.goalsTable.toArray();
		const tasks = this.tasksTable.toArray();
		const all = [...goals, ...tasks];

		const buckets = new Map<string, number>([
			["Overdue", 0],
			["This Week", 0],
			["This Month", 0],
			["Later", 0],
			["No Deadline", 0],
		]);

		const now = Date.now();
		const weekMs = 7 * 24 * 60 * 60 * 1000;
		const monthMs = 30 * 24 * 60 * 60 * 1000;

		for (const row of all) {
			const endDate = row.data.endDate;
			if (!endDate) {
				buckets.set("No Deadline", (buckets.get("No Deadline") ?? 0) + 1);
				continue;
			}

			const deadline = new Date(endDate).getTime();
			if (isNaN(deadline)) {
				buckets.set("No Deadline", (buckets.get("No Deadline") ?? 0) + 1);
				continue;
			}

			const diff = deadline - now;
			if (diff < 0) {
				buckets.set("Overdue", (buckets.get("Overdue") ?? 0) + 1);
			} else if (diff <= weekMs) {
				buckets.set("This Week", (buckets.get("This Week") ?? 0) + 1);
			} else if (diff <= monthMs) {
				buckets.set("This Month", (buckets.get("This Month") ?? 0) + 1);
			} else {
				buckets.set("Later", (buckets.get("Later") ?? 0) + 1);
			}
		}

		return new Map([...buckets.entries()].filter(([, count]) => count > 0));
	}

	private computeFieldDistribution(
		rows: ReadonlyArray<VaultRow<GoalFrontmatter | TaskFrontmatter>>,
		field: keyof GoalFrontmatter & keyof TaskFrontmatter
	): Map<string, number> {
		const counts = new Map<string, number>();

		for (const row of rows) {
			const raw = row.data[field];
			const value = typeof raw === "string" && raw.trim() ? raw.trim() : EMPTY_LABEL;
			counts.set(value, (counts.get(value) ?? 0) + 1);
		}

		return new Map([...counts.entries()].sort((a, b) => b[1] - a[1]));
	}
}

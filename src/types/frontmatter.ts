import { createMappedSchema, type SerializableSchema, type VaultRow } from "@real1ty-obsidian-plugins";
import { z } from "zod";

import { PrioritySchema, StatusSchema } from "./constants";
import type { FusionGoalsSettings } from "./settings";

export const GoalFrontmatterShape = {
	startDate: z.string().optional(),
	endDate: z.string().optional(),
	archived: z.union([z.boolean(), z.string()]).optional(),
	status: StatusSchema.optional(),
	priority: PrioritySchema.optional(),
	progress: z.number().min(0).max(100).optional(),
} satisfies z.ZodRawShape;

export const GoalFrontmatterSchema = z.object(GoalFrontmatterShape);
export type GoalFrontmatter = z.infer<typeof GoalFrontmatterSchema>;
export type GoalRow = VaultRow<GoalFrontmatter>;

export function createGoalSchema(settings: FusionGoalsSettings): SerializableSchema<GoalFrontmatter> {
	return createMappedSchema(GoalFrontmatterShape, {
		startDateProp: settings.startDateProperty,
		endDateProp: settings.endDateProperty,
		archivedProp: settings.archivedProp,
		statusProp: settings.basesStatusProperty,
		priorityProp: settings.priorityProp,
		progressProp: settings.progressProp,
	});
}

export const TaskFrontmatterShape = {
	goal: z.union([z.string(), z.array(z.string())]).optional(),
	title: z.string().optional(),
	startDate: z.string().optional(),
	endDate: z.string().optional(),
	archived: z.union([z.boolean(), z.string()]).optional(),
	status: StatusSchema.optional(),
	priority: PrioritySchema.optional(),
	progress: z.number().min(0).max(100).optional(),
} satisfies z.ZodRawShape;

export const TaskFrontmatterSchema = z.object(TaskFrontmatterShape);
export type TaskFrontmatter = z.infer<typeof TaskFrontmatterSchema>;
export type TaskRow = VaultRow<TaskFrontmatter>;

export function createTaskSchema(settings: FusionGoalsSettings): SerializableSchema<TaskFrontmatter> {
	return createMappedSchema(TaskFrontmatterShape, {
		goalProp: settings.taskGoalProp,
		titleProp: settings.titleProp,
		startDateProp: settings.startDateProperty,
		endDateProp: settings.endDateProperty,
		archivedProp: settings.archivedProp,
		statusProp: settings.basesStatusProperty,
		priorityProp: settings.priorityProp,
		progressProp: settings.progressProp,
	});
}

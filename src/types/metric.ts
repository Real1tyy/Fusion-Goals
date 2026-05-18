import { z } from "zod";

export const MetricEntrySchema = z.object({
	timestamp: z.string(),
	value: z.number(),
	description: z.string().optional(),
});

export type MetricEntry = z.infer<typeof MetricEntrySchema>;

export const METRIC_CODE_FENCE = "fusion-goals";

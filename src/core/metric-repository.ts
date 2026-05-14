import { CodeBlockRepository } from "@real1ty-obsidian-plugins";

import { METRIC_CODE_FENCE, type MetricEntry, MetricEntrySchema } from "../types/metric";

export const metricRepository = new CodeBlockRepository<MetricEntry>({
	codeFence: METRIC_CODE_FENCE,
	itemSchema: MetricEntrySchema,
	idField: "timestamp",
	sort: (a, b) => b.timestamp.localeCompare(a.timestamp),
});

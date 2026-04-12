import type { PieChartHandle } from "@real1ty-obsidian-plugins";
import { renderPieChart } from "@real1ty-obsidian-plugins";
import Chart from "chart.js/auto";

import { CSS_PREFIX } from "../constants";

export function renderFusionPieChart(
	container: HTMLElement,
	title: string,
	distribution: Map<string, number>
): PieChartHandle {
	return renderPieChart(container, {
		cssPrefix: CSS_PREFIX,
		title,
		data: distribution,
		ChartJS: Chart,
	});
}

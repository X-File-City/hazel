import rss from "@astrojs/rss"
import { getCollection } from "astro:content"
import type { APIContext } from "astro"
import { siteConfig } from "@/lib/site"

export async function GET(context: APIContext) {
	const changelog = await getCollection("changelog", ({ data }) => !data.draft)

	return rss({
		title: `${siteConfig.name} Changelog`,
		description: "New features, improvements, and fixes for Hazel",
		site: context.site!,
		items: changelog
			.sort((a, b) => b.data.date.getTime() - a.data.date.getTime())
			.map((entry) => ({
				title: entry.data.title || `Week of ${entry.data.week}`,
				pubDate: entry.data.date,
				description: entry.data.summary,
				link: `/changelog#week-${entry.slug}`,
			})),
	})
}

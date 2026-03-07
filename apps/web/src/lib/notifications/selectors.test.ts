import type { ChannelId, NotificationId } from "@hazel/schema"
import { describe, expect, it } from "vitest"
import { selectUnreadCount, selectUnreadCountsByChannel } from "./selectors"

const notifications = [
	{
		id: "n1",
		readAt: null,
		targetedResourceId: "c1",
		targetedResourceType: "channel",
	},
	{
		id: "n2",
		readAt: null,
		targetedResourceId: "c1",
		targetedResourceType: "channel",
	},
	{
		id: "n3",
		readAt: null,
		targetedResourceId: "c2",
		targetedResourceType: "channel",
	},
	{
		id: "n4",
		readAt: new Date(),
		targetedResourceId: "c2",
		targetedResourceType: "channel",
	},
] as any

describe("notification selectors", () => {
	it("counts unread notifications", () => {
		expect(selectUnreadCount(notifications)).toBe(3)
	})

	it("excludes optimistic read IDs", () => {
		const optimistic = new Set(["n2" as NotificationId])
		expect(selectUnreadCount(notifications, optimistic)).toBe(2)
	})

	it("groups unread counts by channel", () => {
		const grouped = selectUnreadCountsByChannel(notifications)
		expect(grouped.get("c1" as ChannelId)).toBe(2)
		expect(grouped.get("c2" as ChannelId)).toBe(1)
	})
})

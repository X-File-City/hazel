import { renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const { useBotNameMock } = vi.hoisted(() => ({
	useBotNameMock: vi.fn(),
}))

vi.mock("~/db/hooks", () => ({
	useBotName: (...args: Parameters<typeof useBotNameMock>) => useBotNameMock(...args),
}))

import { buildChatAuthorIdentity, useChatAuthorIdentity } from "./author-identity"

const humanUser = {
	id: "user-1",
	firstName: "Jane",
	lastName: "Doe",
	avatarUrl: null,
	userType: "human",
} as any

const machineUser = {
	id: "user-2",
	firstName: "Hazel",
	lastName: "Assistant",
	avatarUrl: null,
	userType: "machine",
} as any

describe("author-identity", () => {
	beforeEach(() => {
		useBotNameMock.mockReset()
		useBotNameMock.mockReturnValue(null)
	})

	it("uses first and last name for human users", () => {
		expect(buildChatAuthorIdentity(humanUser)).toEqual({
			displayName: "Jane Doe",
			initials: "JD",
			seed: "Jane Doe",
			avatarUrl: null,
			isBot: false,
		})
	})

	it("uses bot name as the canonical identity for machine users when available", () => {
		expect(buildChatAuthorIdentity(machineUser, "Deploy Bot")).toEqual({
			displayName: "Deploy Bot",
			initials: "DB",
			seed: "Deploy Bot",
			avatarUrl: null,
			isBot: true,
		})
	})

	it("falls back to the machine user's first and last name when no bot record is available", () => {
		expect(buildChatAuthorIdentity(machineUser, null)).toEqual({
			displayName: "Hazel Assistant",
			initials: "HA",
			seed: "Hazel Assistant",
			avatarUrl: null,
			isBot: true,
		})
	})

	it("returns an empty identity when the user is missing", () => {
		expect(buildChatAuthorIdentity(undefined)).toEqual({
			displayName: "",
			initials: "",
			isBot: false,
		})
	})

	it("returns the same machine-user identity for message rows and inline thread previews", () => {
		useBotNameMock.mockReturnValue("Deploy Bot")

		const { result } = renderHook(() => useChatAuthorIdentity(machineUser.id, machineUser))

		expect(useBotNameMock).toHaveBeenCalledWith(machineUser.id, machineUser.userType)
		expect(result.current).toEqual(buildChatAuthorIdentity(machineUser, "Deploy Bot"))
	})
})

import { act, renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { ACTOR_SERVICE_ERROR_UI_MESSAGE } from "@hazel/domain"

const { mockGetAccessToken, mockGetOrCreate, actorController } = vi.hoisted(() => {
	type Listener<T = unknown> = (payload: T) => void

	const state = {
		onOpen: null as Listener | null,
		onClose: null as Listener | null,
		onError: null as Listener | null,
		events: new Map<string, Listener[]>(),
		getStateResult: undefined as unknown,
	}

	const connection = {
		onOpen: vi.fn((cb: Listener) => {
			state.onOpen = cb
		}),
		onClose: vi.fn((cb: Listener) => {
			state.onClose = cb
		}),
		onError: vi.fn((cb: Listener) => {
			state.onError = cb
		}),
		on: vi.fn((name: string, cb: Listener) => {
			const listeners = state.events.get(name) ?? []
			listeners.push(cb)
			state.events.set(name, listeners)
		}),
		getState: vi.fn(async () => state.getStateResult),
		dispose: vi.fn(),
	}

	const actor = {
		connect: vi.fn(() => connection),
	}

	return {
		mockGetAccessToken: vi.fn(async () => "token"),
		mockGetOrCreate: vi.fn(() => actor),
		actorController: {
			reset() {
				state.onOpen = null
				state.onClose = null
				state.onError = null
				state.events = new Map()
				state.getStateResult = undefined
				connection.onOpen.mockClear()
				connection.onClose.mockClear()
				connection.onError.mockClear()
				connection.on.mockClear()
				connection.getState.mockClear()
				connection.dispose.mockClear()
				actor.connect.mockClear()
			},
			setInitialState(nextState: unknown) {
				state.getStateResult = nextState
			},
			emitOpen(payload?: unknown) {
				state.onOpen?.(payload)
			},
			emitError(error: unknown) {
				state.onError?.(error)
			},
			emitEvent(name: string, payload: unknown) {
				for (const listener of state.events.get(name) ?? []) {
					listener(payload)
				}
			},
		},
	}
})

vi.mock("~/lib/rivet-client", () => ({
	getAccessToken: (...args: Parameters<typeof mockGetAccessToken>) => mockGetAccessToken(...args),
	rivetClient: {
		message: {
			getOrCreate: (...args: Parameters<typeof mockGetOrCreate>) => mockGetOrCreate(...args),
		},
	},
}))

import { useMessageActor } from "./use-message-actor"

describe("useMessageActor", () => {
	beforeEach(() => {
		mockGetAccessToken.mockClear()
		mockGetOrCreate.mockClear()
		actorController.reset()
	})

	it("normalizes cached failed actor errors into a service error", () => {
		const { result } = renderHook(() =>
			useMessageActor("message-1" as any, {
				cached: {
					status: "failed",
					data: {},
					error: "Invalid bot token: Not Found",
				},
			}),
		)

		expect(result.current.status).toBe("failed")
		expect(result.current.error).toBe(ACTOR_SERVICE_ERROR_UI_MESSAGE)
	})

	it("normalizes live failed events into a service error", async () => {
		const { result } = renderHook(() => useMessageActor("message-1" as any, { enabled: true }))

		await waitFor(() => expect(mockGetOrCreate).toHaveBeenCalled())

		await act(async () => {
			actorController.emitOpen()
		})

		await act(async () => {
			actorController.emitEvent("failed", { error: "Invalid bot token: Not Found" })
		})

		expect(result.current.status).toBe("failed")
		expect(result.current.error).toBe(ACTOR_SERVICE_ERROR_UI_MESSAGE)
	})

	it("turns connection errors into a failed service error state before any content arrives", async () => {
		const { result } = renderHook(() => useMessageActor("message-1" as any, { enabled: true }))

		await waitFor(() => expect(mockGetOrCreate).toHaveBeenCalled())

		await act(async () => {
			actorController.emitError(new Error("Authentication service unavailable"))
		})

		expect(result.current.status).toBe("failed")
		expect(result.current.error).toBe(ACTOR_SERVICE_ERROR_UI_MESSAGE)
		expect(result.current.isStreaming).toBe(false)
		expect(result.current.completedAt).not.toBeNull()
	})

	it("preserves non-service actor failures", async () => {
		const { result } = renderHook(() => useMessageActor("message-1" as any, { enabled: true }))

		await waitFor(() => expect(mockGetOrCreate).toHaveBeenCalled())

		await act(async () => {
			actorController.emitOpen()
		})

		await act(async () => {
			actorController.emitEvent("failed", { error: "Tool execution failed" })
		})

		expect(result.current.status).toBe("failed")
		expect(result.current.error).toBe("Tool execution failed")
	})
})

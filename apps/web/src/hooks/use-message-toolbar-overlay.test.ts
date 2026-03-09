// @vitest-environment jsdom

import { renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("react-aria", () => ({
	useOverlayPosition: vi.fn(),
}))

import { useOverlayPosition } from "react-aria"
import { useMessageToolbarOverlay } from "./use-message-toolbar-overlay"

describe("useMessageToolbarOverlay", () => {
	const useOverlayPositionMock = useOverlayPosition as any

	beforeEach(() => {
		useOverlayPositionMock.mockReset()
		useOverlayPositionMock.mockReturnValue({
			overlayProps: {
				style: { top: 12, left: 24 },
			},
		} as any)
	})

	it("uses the provided target element on the first open render", () => {
		const target = document.createElement("div")
		document.body.appendChild(target)

		const { result } = renderHook(() =>
			useMessageToolbarOverlay({
				targetElement: target,
				isOpen: true,
			}),
		)

		expect(result.current.hasAnchorTarget).toBe(true)
		expect(useOverlayPositionMock).toHaveBeenCalledWith(
			expect.objectContaining({
				isOpen: true,
			}),
		)

		const firstCall = useOverlayPositionMock.mock.calls[0]?.[0]
		expect(firstCall?.targetRef.current).toBe(target)

		target.remove()
	})

	it("closes positioning when the target element is missing", () => {
		const { result } = renderHook(() =>
			useMessageToolbarOverlay({
				targetElement: null,
				isOpen: true,
			}),
		)

		expect(result.current.hasAnchorTarget).toBe(false)
		expect(useOverlayPositionMock).toHaveBeenCalledWith(
			expect.objectContaining({
				isOpen: false,
			}),
		)
	})

	it("rejects disconnected targets", () => {
		const target = document.createElement("div")

		const { result } = renderHook(() =>
			useMessageToolbarOverlay({
				targetElement: target,
				isOpen: true,
			}),
		)

		expect(result.current.hasAnchorTarget).toBe(false)
		expect(useOverlayPositionMock).toHaveBeenCalledWith(
			expect.objectContaining({
				isOpen: false,
			}),
		)

		const firstCall = useOverlayPositionMock.mock.calls[0]?.[0]
		expect(firstCall?.targetRef.current).toBeNull()
	})

	it("tracks anchor validity changes without effect-based syncing", () => {
		const firstTarget = document.createElement("div")
		document.body.appendChild(firstTarget)

		const { result, rerender } = renderHook(
			({ targetElement, isOpen }: { targetElement: HTMLDivElement | null; isOpen: boolean }) =>
				useMessageToolbarOverlay({
					targetElement,
					isOpen,
				}),
			{
				initialProps: {
					targetElement: firstTarget,
					isOpen: true,
				},
			},
		)

		const firstOverlayRef = result.current.overlayRef
		let latestCall = useOverlayPositionMock.mock.calls.at(-1)?.[0]
		expect(latestCall?.targetRef.current).toBe(firstTarget)
		expect(latestCall?.isOpen).toBe(true)

		firstTarget.remove()
		rerender({ targetElement: firstTarget, isOpen: true })
		latestCall = useOverlayPositionMock.mock.calls.at(-1)?.[0]
		expect(result.current.hasAnchorTarget).toBe(false)
		expect(latestCall?.targetRef.current).toBeNull()
		expect(latestCall?.isOpen).toBe(false)

		const secondTarget = document.createElement("div")
		document.body.appendChild(secondTarget)
		rerender({ targetElement: secondTarget, isOpen: true })
		latestCall = useOverlayPositionMock.mock.calls.at(-1)?.[0]
		expect(result.current.hasAnchorTarget).toBe(true)
		expect(latestCall?.targetRef.current).toBe(secondTarget)
		expect(latestCall?.isOpen).toBe(true)
		expect(result.current.overlayRef).toBe(firstOverlayRef)

		secondTarget.remove()
	})
})

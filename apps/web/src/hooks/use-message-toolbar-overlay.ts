import { useRef } from "react"
import { useOverlayPosition } from "react-aria"

interface UseMessageToolbarOverlayOptions {
	targetElement: HTMLDivElement | null
	isOpen: boolean
}

export function useMessageToolbarOverlay({ targetElement, isOpen }: UseMessageToolbarOverlayOptions) {
	const overlayRef = useRef<HTMLDivElement>(null)
	const targetRef = useRef<HTMLDivElement | null>(null)

	const hasAnchorTarget = !!targetElement?.isConnected
	targetRef.current = hasAnchorTarget ? targetElement : null

	const { overlayProps } = useOverlayPosition({
		targetRef,
		overlayRef,
		placement: "top end",
		offset: -6,
		shouldFlip: true,
		isOpen: isOpen && hasAnchorTarget,
	})

	return {
		overlayRef,
		overlayProps,
		hasAnchorTarget,
	}
}

import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
	type ReactNode,
} from "react"
import { IconCirclePause } from "../icons/icon-circle-pause"
import { IconDownload } from "../icons/icon-download"
import { IconLoader } from "../icons/icon-loader"
import { IconPlay } from "../icons/icon-play"
import IconVolume from "../icons/icon-volume"
import IconVolumeMute from "../icons/icon-volume-mute"

// ============================================================================
// Context and Types
// ============================================================================

interface VideoPlayerState {
	isPlaying: boolean
	isMuted: boolean
	isLoading: boolean
	isBuffering: boolean
	showControls: boolean
	isDragging: boolean
	isFullscreen: boolean
	currentTime: number
	duration: number
	progress: number
	buffered: number
	hoverTime: number | null
	hoverPosition: number | null
}

interface VideoPlayerActions {
	togglePlay: () => void
	toggleMute: () => void
	toggleFullscreen: () => void
	seek: (time: number) => void
	setIsDragging: (dragging: boolean) => void
	setHoverInfo: (time: number | null, position: number | null) => void
	resetHideControlsTimer: () => void
}

interface VideoPlayerRefs {
	videoRef: React.RefObject<HTMLVideoElement | null>
	progressRef: React.RefObject<HTMLDivElement | null>
	containerRef: React.RefObject<HTMLDivElement | null>
}

interface VideoPlayerContextValue {
	state: VideoPlayerState
	actions: VideoPlayerActions
	refs: VideoPlayerRefs
	src: string
}

const VideoPlayerContext = createContext<VideoPlayerContextValue | null>(null)

function useVideoPlayer() {
	const context = useContext(VideoPlayerContext)
	if (!context) {
		throw new Error("VideoPlayer compound components must be used within VideoPlayer.Provider")
	}
	return context
}

// ============================================================================
// Provider Component
// ============================================================================

interface VideoPlayerProviderProps {
	src: string
	children: ReactNode
	/**
	 * Time in ms before controls auto-hide during playback
	 * @default 3000
	 */
	controlsHideDelay?: number
}

function VideoPlayerProvider({ src, children, controlsHideDelay = 3000 }: VideoPlayerProviderProps) {
	const videoRef = useRef<HTMLVideoElement>(null)
	const progressRef = useRef<HTMLDivElement>(null)
	const containerRef = useRef<HTMLDivElement>(null)
	const hideControlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	const [isPlaying, setIsPlaying] = useState(false)
	const [currentTime, setCurrentTime] = useState(0)
	const [duration, setDuration] = useState(0)
	const [isMuted, setIsMuted] = useState(false)
	const [isLoading, setIsLoading] = useState(true)
	const [isBuffering, setIsBuffering] = useState(false)
	const [showControls, setShowControls] = useState(true)
	const [isDragging, setIsDragging] = useState(false)
	const [isFullscreen, setIsFullscreen] = useState(false)
	const [buffered, setBuffered] = useState(0)
	const [hoverTime, setHoverTime] = useState<number | null>(null)
	const [hoverPosition, setHoverPosition] = useState<number | null>(null)

	const progress = duration > 0 ? (currentTime / duration) * 100 : 0

	// Hide controls after inactivity while playing
	const resetHideControlsTimer = useCallback(() => {
		if (hideControlsTimeoutRef.current) {
			clearTimeout(hideControlsTimeoutRef.current)
		}
		setShowControls(true)

		if (isPlaying && !isDragging) {
			hideControlsTimeoutRef.current = setTimeout(() => {
				setShowControls(false)
			}, controlsHideDelay)
		}
	}, [isPlaying, isDragging, controlsHideDelay])

	// Show controls when play/drag state changes
	const prevIsPlayingRef = useRef(isPlaying)
	const prevIsDraggingRef = useRef(isDragging)
	useEffect(() => {
		if (isPlaying !== prevIsPlayingRef.current || isDragging !== prevIsDraggingRef.current) {
			setShowControls(true)
			prevIsPlayingRef.current = isPlaying
			prevIsDraggingRef.current = isDragging
		}
	}, [isPlaying, isDragging])

	// Auto-hide controls after delay during playback
	useEffect(() => {
		if (isPlaying && !isDragging) {
			const timeout = setTimeout(() => setShowControls(false), controlsHideDelay)
			return () => clearTimeout(timeout)
		}
	}, [isPlaying, isDragging, controlsHideDelay])

	// Video event handlers
	useEffect(() => {
		const video = videoRef.current
		if (!video) return

		const handleLoadedMetadata = () => {
			setDuration(video.duration)
			setIsLoading(false)
		}

		const handleTimeUpdate = () => {
			if (!isDragging) {
				setCurrentTime(video.currentTime)
			}
		}

		const handleEnded = () => {
			setIsPlaying(false)
			setShowControls(true)
		}

		const handleWaiting = () => setIsBuffering(true)
		const handleCanPlay = () => setIsBuffering(false)

		const handleProgress = () => {
			if (video.buffered.length > 0 && video.duration > 0) {
				const bufferedEnd = video.buffered.end(video.buffered.length - 1)
				setBuffered((bufferedEnd / video.duration) * 100)
			}
		}

		video.addEventListener("loadedmetadata", handleLoadedMetadata)
		video.addEventListener("timeupdate", handleTimeUpdate)
		video.addEventListener("ended", handleEnded)
		video.addEventListener("waiting", handleWaiting)
		video.addEventListener("canplay", handleCanPlay)
		video.addEventListener("progress", handleProgress)

		return () => {
			video.removeEventListener("loadedmetadata", handleLoadedMetadata)
			video.removeEventListener("timeupdate", handleTimeUpdate)
			video.removeEventListener("ended", handleEnded)
			video.removeEventListener("waiting", handleWaiting)
			video.removeEventListener("canplay", handleCanPlay)
			video.removeEventListener("progress", handleProgress)
		}
	}, [isDragging])

	// Sync fullscreen state with browser
	useEffect(() => {
		const handler = () => setIsFullscreen(!!document.fullscreenElement)
		document.addEventListener("fullscreenchange", handler)
		return () => document.removeEventListener("fullscreenchange", handler)
	}, [])

	const togglePlay = useCallback(() => {
		const video = videoRef.current
		if (!video) return

		if (isPlaying) {
			video.pause()
			setIsPlaying(false)
		} else {
			video.play()
			setIsPlaying(true)
		}
	}, [isPlaying])

	const toggleMute = useCallback(() => {
		const video = videoRef.current
		if (!video) return

		video.muted = !video.muted
		setIsMuted(video.muted)
	}, [])

	const seek = useCallback((time: number) => {
		const video = videoRef.current
		if (!video) return

		video.currentTime = time
		setCurrentTime(time)
	}, [])

	const toggleFullscreen = useCallback(() => {
		const container = containerRef.current
		if (!container) return

		if (document.fullscreenElement) {
			document.exitFullscreen()
		} else {
			container.requestFullscreen()
		}
	}, [])

	const setHoverInfo = useCallback((time: number | null, position: number | null) => {
		setHoverTime(time)
		setHoverPosition(position)
	}, [])

	const contextValue = useMemo<VideoPlayerContextValue>(
		() => ({
			state: {
				isPlaying,
				isMuted,
				isLoading,
				isBuffering,
				showControls,
				isDragging,
				isFullscreen,
				currentTime,
				duration,
				progress,
				buffered,
				hoverTime,
				hoverPosition,
			},
			actions: {
				togglePlay,
				toggleMute,
				toggleFullscreen,
				seek,
				setIsDragging,
				setHoverInfo,
				resetHideControlsTimer,
			},
			refs: {
				videoRef,
				progressRef,
				containerRef,
			},
			src,
		}),
		[
			isPlaying,
			isMuted,
			isLoading,
			isBuffering,
			showControls,
			isDragging,
			isFullscreen,
			currentTime,
			duration,
			progress,
			buffered,
			hoverTime,
			hoverPosition,
			togglePlay,
			toggleMute,
			toggleFullscreen,
			seek,
			setHoverInfo,
			resetHideControlsTimer,
			src,
		],
	)

	return <VideoPlayerContext.Provider value={contextValue}>{children}</VideoPlayerContext.Provider>
}

// ============================================================================
// Sub-Components
// ============================================================================

function formatTime(seconds: number): string {
	if (!Number.isFinite(seconds) || seconds < 0) return "0:00"
	const mins = Math.floor(seconds / 60)
	const secs = Math.floor(seconds % 60)
	return `${mins}:${secs.toString().padStart(2, "0")}`
}

interface ContainerProps {
	children: ReactNode
}

function Container({ children }: ContainerProps) {
	const { state, actions, refs } = useVideoPlayer()

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			switch (e.key) {
				case " ":
					e.preventDefault()
					actions.togglePlay()
					break
				case "f":
					e.preventDefault()
					actions.toggleFullscreen()
					break
				case "m":
					e.preventDefault()
					actions.toggleMute()
					break
				case "ArrowLeft":
					e.preventDefault()
					actions.seek(Math.max(0, state.currentTime - 5))
					break
				case "ArrowRight":
					e.preventDefault()
					actions.seek(Math.min(state.duration, state.currentTime + 5))
					break
			}
		},
		[actions, state.currentTime, state.duration],
	)

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: container for mouse tracking and keyboard shortcuts
		<div
			ref={refs.containerRef}
			className="relative overflow-hidden rounded-lg border border-border bg-black shadow-sm focus:outline-none"
			onMouseMove={actions.resetHideControlsTimer}
			onMouseLeave={() => state.isPlaying && actions.resetHideControlsTimer()}
			onKeyDown={handleKeyDown}
			tabIndex={0}
		>
			{children}
		</div>
	)
}

function Video() {
	"use no memo"
	const { refs, src, actions } = useVideoPlayer()

	const videoSrc = src.includes("#") ? src : `${src}#t=0.1`

	return (
		// biome-ignore lint/a11y/useMediaCaption: video caption not required for chat attachments
		<video
			ref={refs.videoRef}
			src={videoSrc}
			className="block max-h-80 w-full"
			preload="metadata"
			playsInline
			onClick={actions.togglePlay}
		/>
	)
}

function LoadingOverlay() {
	const { state } = useVideoPlayer()

	if (!state.isLoading) return null

	return (
		<div className="absolute inset-0 flex items-center justify-center bg-black/20">
			<IconLoader className="size-6 animate-spin text-white" />
		</div>
	)
}

function BufferingOverlay() {
	const { state } = useVideoPlayer()

	if (!state.isBuffering || state.isLoading) return null

	return (
		<div className="pointer-events-none absolute inset-0 flex items-center justify-center">
			<IconLoader className="size-6 animate-spin text-white/80" />
		</div>
	)
}

function PlayOverlay() {
	const { state, actions } = useVideoPlayer()

	if (state.isPlaying || state.isLoading) return null

	return (
		<button
			type="button"
			onClick={actions.togglePlay}
			className="absolute inset-0 flex cursor-pointer items-center justify-center"
			aria-label="Play video"
		>
			<div className="flex size-11 items-center justify-center rounded-full border border-white/20 bg-white/15 shadow-lg backdrop-blur-md transition-transform ease-[cubic-bezier(0.165,0.84,0.44,1)] hover:scale-110 active:scale-95">
				<IconPlay className="ml-0.5 size-5 text-white drop-shadow-md" secondaryfill="transparent" />
			</div>
		</button>
	)
}

interface ControlsProps {
	children: ReactNode
}

function Controls({ children }: ControlsProps) {
	const { state } = useVideoPlayer()

	return (
		<div
			className={`absolute right-0 bottom-0 left-0 bg-gradient-to-t from-black/60 via-black/25 to-transparent px-3 pt-6 pb-2 transition-opacity duration-200 ease-[cubic-bezier(0.165,0.84,0.44,1)] ${
				state.showControls || !state.isPlaying ? "opacity-100" : "pointer-events-none opacity-0"
			}`}
		>
			{children}
		</div>
	)
}

function ProgressBar() {
	"use no memo"
	const { state, actions, refs } = useVideoPlayer()

	const handleProgressClick = useCallback(
		(e: React.MouseEvent<HTMLDivElement>) => {
			const progressBar = refs.progressRef.current
			if (!progressBar) return

			const rect = progressBar.getBoundingClientRect()
			const clickX = e.clientX - rect.left
			const percentage = Math.max(0, Math.min(1, clickX / rect.width))
			const newTime = percentage * state.duration

			actions.seek(newTime)
		},
		[state.duration, actions, refs],
	)

	const handleProgressDragStart = useCallback(
		(e: React.MouseEvent<HTMLDivElement>) => {
			e.preventDefault()
			actions.setIsDragging(true)
			handleProgressClick(e)
		},
		[handleProgressClick, actions],
	)

	const handleMouseMove = useCallback(
		(e: React.MouseEvent<HTMLDivElement>) => {
			const progressBar = refs.progressRef.current
			if (!progressBar || state.duration <= 0) return

			const rect = progressBar.getBoundingClientRect()
			const hoverX = e.clientX - rect.left
			const percentage = Math.max(0, Math.min(1, hoverX / rect.width))
			actions.setHoverInfo(percentage * state.duration, percentage * 100)
		},
		[state.duration, actions, refs],
	)

	const handleMouseLeave = useCallback(() => {
		actions.setHoverInfo(null, null)
	}, [actions])

	// Drag handling effect
	useEffect(() => {
		if (!state.isDragging) return

		const handleMouseMove = (e: MouseEvent) => {
			const progressBar = refs.progressRef.current
			if (!progressBar) return

			const rect = progressBar.getBoundingClientRect()
			const clickX = e.clientX - rect.left
			const percentage = Math.max(0, Math.min(1, clickX / rect.width))
			const newTime = percentage * state.duration

			actions.seek(newTime)
		}

		const handleMouseUp = (e: MouseEvent) => {
			const progressBar = refs.progressRef.current
			if (!progressBar) return

			const rect = progressBar.getBoundingClientRect()
			const clickX = e.clientX - rect.left
			const percentage = Math.max(0, Math.min(1, clickX / rect.width))
			actions.seek(percentage * state.duration)

			actions.setIsDragging(false)
		}

		document.addEventListener("mousemove", handleMouseMove)
		document.addEventListener("mouseup", handleMouseUp)

		return () => {
			document.removeEventListener("mousemove", handleMouseMove)
			document.removeEventListener("mouseup", handleMouseUp)
		}
	}, [state.isDragging, state.duration, actions, refs])

	const handleProgressKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLDivElement>) => {
			const step = state.duration * 0.05
			if (e.key === "ArrowRight" || e.key === "ArrowUp") {
				e.preventDefault()
				actions.seek(Math.min(state.duration, state.currentTime + step))
			} else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
				e.preventDefault()
				actions.seek(Math.max(0, state.currentTime - step))
			}
		},
		[state.duration, state.currentTime, actions],
	)

	return (
		<div className="py-2 -my-2 mb-0">
			<div
				ref={refs.progressRef}
				className="group/progress relative h-1 cursor-pointer rounded-full bg-white/20 transition-[height] duration-150 ease-[cubic-bezier(0.165,0.84,0.44,1)] hover:h-1.5"
				onClick={handleProgressClick}
				onMouseDown={handleProgressDragStart}
				onMouseMove={handleMouseMove}
				onMouseLeave={handleMouseLeave}
				onKeyDown={handleProgressKeyDown}
				role="slider"
				aria-label="Video progress"
				aria-valuenow={state.currentTime}
				aria-valuemin={0}
				aria-valuemax={state.duration}
				tabIndex={0}
			>
				{/* Buffered indicator */}
				<div
					className="absolute inset-y-0 left-0 rounded-full bg-white/20"
					style={{ width: `${state.buffered}%` }}
				/>

				{/* Progress fill */}
				<div
					className="relative h-full rounded-full bg-white transition-none"
					style={{ width: `${state.progress}%` }}
				>
					{/* Thumb indicator */}
					<div className="absolute top-1/2 right-0 size-3.5 -translate-y-1/2 translate-x-1/2 scale-0 rounded-full bg-white shadow-sm ring-2 ring-white/30 transition-transform group-hover/progress:scale-100" />
				</div>

				{/* Hover time tooltip */}
				{state.hoverTime !== null && state.hoverPosition !== null && (
					<div
						className="pointer-events-none absolute bottom-full mb-2 -translate-x-1/2 rounded bg-black/80 px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-white"
						style={{ left: `${state.hoverPosition}%` }}
					>
						{formatTime(state.hoverTime)}
					</div>
				)}
			</div>
		</div>
	)
}

function ControlsRow({ children }: { children: ReactNode }) {
	return <div className="flex items-center gap-2">{children}</div>
}

function PlayPauseButton() {
	const { state, actions } = useVideoPlayer()

	return (
		<button
			type="button"
			onClick={actions.togglePlay}
			className="flex size-7 items-center justify-center rounded text-white transition-colors hover:bg-white/20"
			aria-label={state.isPlaying ? "Pause" : "Play"}
		>
			{state.isPlaying ? <IconCirclePause className="size-4" /> : <IconPlay className="size-4" />}
		</button>
	)
}

function TimeDisplay() {
	const { state } = useVideoPlayer()

	return (
		<span className="whitespace-nowrap font-mono tabular-nums text-white/80 text-xs">
			{formatTime(state.currentTime)} / {formatTime(state.duration)}
		</span>
	)
}

function Spacer() {
	return <div className="flex-1" />
}

function MuteButton() {
	const { state, actions } = useVideoPlayer()

	return (
		<button
			type="button"
			onClick={actions.toggleMute}
			className="flex size-7 items-center justify-center rounded text-white transition-colors hover:bg-white/20"
			aria-label={state.isMuted ? "Unmute" : "Mute"}
		>
			{state.isMuted ? <IconVolumeMute className="size-4" /> : <IconVolume className="size-4" />}
		</button>
	)
}

function FullscreenButton() {
	const { state, actions } = useVideoPlayer()

	return (
		<button
			type="button"
			onClick={actions.toggleFullscreen}
			className="flex size-7 items-center justify-center rounded text-white transition-colors hover:bg-white/20"
			aria-label={state.isFullscreen ? "Exit fullscreen" : "Fullscreen"}
		>
			{state.isFullscreen ? <CollapseIcon className="size-4" /> : <ExpandIcon className="size-4" />}
		</button>
	)
}

interface DownloadButtonProps {
	onClick: () => void
}

function DownloadButton({ onClick }: DownloadButtonProps) {
	return (
		<button
			type="button"
			onClick={onClick}
			className="flex size-7 items-center justify-center rounded text-white transition-colors hover:bg-white/20"
			aria-label="Download video"
		>
			<IconDownload className="size-4" />
		</button>
	)
}

interface FileNameProps {
	children: ReactNode
}

function FileName({ children }: FileNameProps) {
	return <div className="mt-1.5 truncate font-medium text-muted-fg text-xs">{children}</div>
}

// Inline fullscreen icons
function ExpandIcon({ className }: { className?: string }) {
	return (
		<svg viewBox="0 0 18 18" fill="currentColor" className={className} aria-hidden="true">
			<title>Fullscreen</title>
			<path d="M3 3h4.5v1.5H4.5V7.5H3V3ZM10.5 3H15v4.5h-1.5V4.5H10.5V3ZM3 10.5h1.5v3H7.5V15H3v-4.5ZM13.5 13.5V10.5H15V15h-4.5v-1.5h3Z" />
		</svg>
	)
}

function CollapseIcon({ className }: { className?: string }) {
	return (
		<svg viewBox="0 0 18 18" fill="currentColor" className={className} aria-hidden="true">
			<title>Exit fullscreen</title>
			<path d="M7.5 3v3H4.5v1.5h4.5V3H7.5ZM10.5 7.5H15V6h-3V3h-1.5v4.5ZM4.5 12h3v3H9v-4.5H4.5V12ZM10.5 10.5V15H12v-3h3v-1.5h-4.5Z" />
		</svg>
	)
}

// ============================================================================
// Compound Component Export
// ============================================================================

export const VideoPlayer = {
	Provider: VideoPlayerProvider,
	Container,
	Video,
	LoadingOverlay,
	BufferingOverlay,
	PlayOverlay,
	Controls,
	ProgressBar,
	ControlsRow,
	PlayPauseButton,
	TimeDisplay,
	Spacer,
	MuteButton,
	FullscreenButton,
	DownloadButton,
	FileName,
}

// ============================================================================
// Convenience Component (backwards-compatible API)
// ============================================================================

interface VideoPlayerSimpleProps {
	src: string
	fileName: string
	onDownload: () => void
}

export function VideoPlayerSimple({ src, fileName, onDownload }: VideoPlayerSimpleProps) {
	return (
		<div className="group relative inline-block max-w-md">
			<VideoPlayer.Provider src={src}>
				<VideoPlayer.Container>
					<VideoPlayer.Video />
					<VideoPlayer.LoadingOverlay />
					<VideoPlayer.BufferingOverlay />
					<VideoPlayer.PlayOverlay />
					<VideoPlayer.Controls>
						<VideoPlayer.ProgressBar />
						<VideoPlayer.ControlsRow>
							<VideoPlayer.PlayPauseButton />
							<VideoPlayer.TimeDisplay />
							<VideoPlayer.Spacer />
							<VideoPlayer.MuteButton />
							<VideoPlayer.FullscreenButton />
							<VideoPlayer.DownloadButton onClick={onDownload} />
						</VideoPlayer.ControlsRow>
					</VideoPlayer.Controls>
				</VideoPlayer.Container>
				<VideoPlayer.FileName>{fileName}</VideoPlayer.FileName>
			</VideoPlayer.Provider>
		</div>
	)
}

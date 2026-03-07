import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { ACTOR_SERVICE_ERROR_UI_MESSAGE, ACTOR_SERVICE_ERROR_UI_TITLE } from "@hazel/domain"
import { MessageLive } from "./message-live-state"
import { MessageLiveContext } from "./message-live-context"

function renderError(error: string) {
	return render(
		<MessageLiveContext
			value={{
				state: {
					status: "failed",
					data: {},
					text: "",
					isStreaming: false,
					progress: null,
					error,
					steps: [],
					currentStepIndex: null,
					isConnected: false,
				},
				actions: {},
				meta: {},
			}}
		>
			<MessageLive.Error />
		</MessageLiveContext>,
	)
}

describe("MessageLive.Error", () => {
	it("renders sanitized service error copy for classified actor failures", () => {
		renderError(ACTOR_SERVICE_ERROR_UI_MESSAGE)

		expect(screen.getByRole("alert")).toBeTruthy()
		expect(screen.getByText(ACTOR_SERVICE_ERROR_UI_TITLE)).toBeTruthy()
		expect(screen.getByText(ACTOR_SERVICE_ERROR_UI_MESSAGE)).toBeTruthy()
	})

	it("renders generic copy for non-service errors", () => {
		renderError("Tool execution failed")

		expect(screen.getByText("Something went wrong")).toBeTruthy()
		expect(screen.getByText("Tool execution failed")).toBeTruthy()
	})
})

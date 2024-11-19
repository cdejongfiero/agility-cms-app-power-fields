import { setFocus } from "@agility/app-sdk"

export enum FOCUS_EVENTS {
	FOCUS = "focus",
	BLUR = "blur"
}
interface IFocusHandlerProps {
	eventName: FOCUS_EVENTS
}

export const handleFieldFocusEvent: ({ eventName }: IFocusHandlerProps) => void = ({ eventName }) => {
	const isFocused = eventName === FOCUS_EVENTS.FOCUS
	setFocus({ isFocused })
}

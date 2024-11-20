import { setFocus } from "@agility/app-sdk"

export enum FOCUS_EVENTS {
	FOCUS = "focus",
	BLUR = "blur"
}
interface IFocusHandlerProps {
	eventName: FOCUS_EVENTS
}
type TFocusHandler = ({ eventName }: IFocusHandlerProps) => void

export const handleFieldFocusEvent: TFocusHandler = ({ eventName }) => {
	const isFocused = eventName === FOCUS_EVENTS.FOCUS
	setFocus({ isFocused })
}

import { FOCUS_EVENTS, handleFieldFocusEvent } from "@/methods/handleFieldFocusEvent"
import { useAgilityAppSDK, contentItemMethods, useResizeHeight } from "@agility/app-sdk"
import React, { useState, useEffect } from "react"

import SimpleMDE from "react-simplemde-editor"

const MarkdownEditor = () => {
	const { fieldValue } = useAgilityAppSDK()
	const containerRef = useResizeHeight(2)

	const markdownValues = fieldValue

	const [, setMarkdownHeight] = useState(500)

	const onChange = (value: string) => {
		contentItemMethods.setFieldValue({ value })
	}

	// listen for simple-mde resizing events
	useEffect(() => {
		const mdeSizeElm = document.querySelector<HTMLElement>(".CodeMirror-sizer")
		if (!mdeSizeElm) return
		const observer = new ResizeObserver((entries) => {
			const entry = entries[0]
			if (!entry) return
			setMarkdownHeight(entry.contentRect.height)
		})
		observer.observe(mdeSizeElm)

		return () => observer.disconnect()
	}, [])

	return (
		<div ref={containerRef} className="min-h-[400px] bg-white">
			<SimpleMDE
				id="simple-mde"
				value={markdownValues}
				onChange={onChange}
				onFocus={() => {
					handleFieldFocusEvent({ eventName: FOCUS_EVENTS.FOCUS })
				}}
				onBlur={() => {
					handleFieldFocusEvent({ eventName: FOCUS_EVENTS.BLUR })
				}}
			/>
		</div>
	)
}

export default MarkdownEditor

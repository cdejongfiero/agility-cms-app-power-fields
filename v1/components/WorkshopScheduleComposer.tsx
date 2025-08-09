import React, { useState, useEffect, useRef } from "react"
import { contentItemMethods, useAgilityAppSDK, getManagementAPIToken, useResizeHeight } from "@agility/app-sdk"

import EditorJS, { OutputData } from "@editorjs/editorjs"
import Paragraph from "@editorjs/paragraph"
import Header from "@editorjs/header"
import DragDrop from "editorjs-drag-drop"
import { useCallback } from "react"
import { FOCUS_EVENTS, handleFieldFocusEvent } from "@/methods/handleFieldFocusEvent"
import ScheduleBlock from "./blocks/ScheduleBlock"

const WorkshopScheduleComposer = ({ configuration }: { configuration: any }) => {
	const { initializing, instance, fieldValue } = useAgilityAppSDK()

	const containerRef = useResizeHeight(2)
	const blockRef = useRef<HTMLIFrameElement>(null)
	const savedValue = useRef<string | null>(null)

	const [token, setToken] = useState()

	const editor = useRef<EditorJS | null>(null)

	// Get the ManagementAPIToken
	useEffect(() => {
		console.warn("Getting Management API Token")
		;(async () => {
			const token = await getManagementAPIToken()
			setToken(token)
		})()
	}, [])

	useEffect(() => {
		//handle changes to the field value from outside the editor
		if (!editor.current) return
		if (savedValue.current === null) return

		try {
			const blocks = JSON.parse(fieldValue) as OutputData
			if (fieldValue !== savedValue.current) {
				if (!fieldValue || blocks.blocks.length == 0) {
					editor.current.clear()
				} else {
					if (blocks) {
						editor.current.render(blocks)
					}
				}
			}
		} catch (e) {
			console.warn("Error parsing JSON for Workshop Schedule Composer", e)
		}
	}, [fieldValue, editor])

	const initEditor = useCallback(() => {
		if (fieldValue && editor.current) {
			try {
				const blocks = JSON.parse(fieldValue) as OutputData

				if (blocks.blocks.length == 0) {
					editor.current.clear()
				} else {
					editor.current.render(blocks)
				}
			} catch (e) {
				console.warn("Error parsing JSON for Workshop Schedule Composer", e)
			}
		}
	}, [editor.current, fieldValue])

	useEffect(() => {
		//initialize the editor
		if (!blockRef.current || !token || initializing) return

		if (editor.current) return

		const editorJS = new EditorJS({
			autofocus: false, //setting this to true will not do anything because this is in an iframe
			holder: blockRef.current,
			placeholder: "📅 Create your workshop schedule here...",
			inlineToolbar: true,

			tools: {
				// Only schedule block + basic text tools
				schedule: ScheduleBlock,
				paragraph: {
					class: Paragraph,
					inlineToolbar: true
				},
				header: Header
			},
			onChange: (e: any) => {
				editorJS.save().then((v) => {
					//remove the time and version properties - we ONLY care about the blocks
					delete v.time
					delete v.version
					const valueJSON = JSON.stringify(v)
					if (valueJSON !== fieldValue) {
						savedValue.current = valueJSON
						contentItemMethods.setFieldValue({ value: valueJSON })
					}
				})
			},
			onReady: () => {
				new DragDrop(editorJS)
				initEditor()
			}
		})

		editor.current = editorJS
	}, [blockRef, initializing, token])

	return (
		<div className="bg-white" ref={containerRef} id="container-element">
			<div
				onFocus={() => {
					handleFieldFocusEvent({ eventName: FOCUS_EVENTS.FOCUS })
				}}
				onBlur={() => {
					handleFieldFocusEvent({ eventName: FOCUS_EVENTS.BLUR })
				}}
				className="prose mx-20 min-h-[400px] pb-14 pt-2"
				id="editor-elem"
				ref={blockRef}
			></div>
		</div>
	)
}

export default WorkshopScheduleComposer

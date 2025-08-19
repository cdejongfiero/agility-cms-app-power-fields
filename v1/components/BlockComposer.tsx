import React, { useState, useEffect, useRef } from "react"
import { contentItemMethods, useAgilityAppSDK, getManagementAPIToken, useResizeHeight } from "@agility/app-sdk"

import EditorJS, { OutputData } from "@editorjs/editorjs"
import Embed from "@editorjs/embed"
import Table from "@editorjs/table"
import Paragraph from "@editorjs/paragraph"
import Warning from "@editorjs/warning"
import Code from "@editorjs/code"
import Image from "@editorjs/image"
import Raw from "@editorjs/raw"
import Header from "@editorjs/header"
import Quote from "@editorjs/quote"
import Marker from "@editorjs/marker"
import Delimiter from "@editorjs/delimiter"
import InlineCode from "@editorjs/inline-code"
import NestedList from "@editorjs/nested-list"
import DragDrop from "editorjs-drag-drop"
import { useCallback } from "react"
import { FOCUS_EVENTS, handleFieldFocusEvent } from "@/methods/handleFieldFocusEvent"
import ScheduleBlock from "./blocks/ScheduleBlock"
import RecipeInstructionBlock from "./blocks/RecipeInstructionBlock"
import RecipeIngredientBlock from "./blocks/RecipeIngredientBlock"
import SingleImageBlock from "./blocks/SingleImageBlock"
import ImageGalleryBlock from "./blocks/ImageGalleryBlock"
import { initializeEditorSDK, cleanupEditorSDK } from "../utils/editorSDK"

const BlockComposer = ({ configuration }: { configuration: any }) => {
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
			console.warn("Error parsing JSON for Block Composer", e)
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
				console.warn("Error parsing JSON for Block Composer", e)
			}
		}
	}, [editor.current, fieldValue])

	useEffect(() => {
		//initialize the editor
		if (!blockRef.current || !token || initializing) return

		if (editor.current) return

		const uploadImagePayload = {
			guid: instance?.guid,
			token,
			assetFolder: configuration.assetFolder ?? "/images/block-composer"
		}

		const editorJS = new EditorJS({
			autofocus: false, //setting this to true will not do anything because this is in an iframe
			holder: blockRef.current,
			placeholder: "📝 Enter text, paste images/embed urls, or select a block to add here...",
			inlineToolbar: true,

			tools: {
				table: Table,
				paragraph: {
					class: Paragraph,
					inlineToolbar: true
				},
				list: {
					class: NestedList,
					inlineToolbar: true
				},
				warning: Warning,
				code: Code,
				image: {
					class: Image,
					config: {
						endpoints: {
							byFile: "/api/image/uploadByFile",
							byUrl: "/api/image/fetchByUrl"
						},
						additionalRequestData: { ...uploadImagePayload }
					}
				},
				raw: Raw,
				header: Header,
				quote: Quote,
				marker: Marker,
				delimiter: Delimiter,
				inlineCode: InlineCode,
				embed: Embed,
				schedule: ScheduleBlock,
				recipeInstruction: RecipeInstructionBlock,
				recipeIngredient: RecipeIngredientBlock,
				singleImage: SingleImageBlock,
				imageGallery: ImageGalleryBlock
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
			// Initialize SDK utilities for blocks to use
			initializeEditorSDK()

			new DragDrop(editorJS)

			initEditor()
			}
		})

		editor.current = editorJS

		// Cleanup on unmount
		return () => {
			cleanupEditorSDK()
		}
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

export default BlockComposer

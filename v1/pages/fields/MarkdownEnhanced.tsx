import dynamic from "next/dynamic"

import { useAgilityAppSDK } from "@agility/app-sdk"

const MarkdownEnhanced = dynamic(() => import("../../components/MarkdownEnhanced"), { ssr: false })

export default function MarkdownEnhancedPage() {
	const { initializing } = useAgilityAppSDK()
	if (initializing) return null
	return <MarkdownEnhanced />
}

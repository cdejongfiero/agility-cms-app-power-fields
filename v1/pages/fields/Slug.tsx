import dynamic from "next/dynamic"

import { useAgilityAppSDK } from "@agility/app-sdk"
const SlugField = dynamic(() => import("../../components/SlugField"), { ssr: false })
export default function SlugPage() {
	const { initializing } = useAgilityAppSDK()
	if (initializing) return null
	return <SlugField />
}

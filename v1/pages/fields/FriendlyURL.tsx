import dynamic from "next/dynamic"

import { useAgilityAppSDK } from "@agility/app-sdk"
const FriendlyURLField = dynamic(() => import("../../components/FriendlySlugField"), { ssr: false })
export default function FriendlyURLPage() {
	const { initializing } = useAgilityAppSDK()
	if (initializing) return null
	return <FriendlyURLField />
}

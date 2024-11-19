import { useAgilityAppSDK } from "@agility/app-sdk"
import dynamic from "next/dynamic"

const BlockEditor = dynamic(() => import("../../components/BlockEditor"), { ssr: false })
export default function BlockEditorPage() {
	const { initializing, appInstallContext } = useAgilityAppSDK()
	if (initializing) return null
	return <BlockEditor configuration={appInstallContext?.configuration} />
}

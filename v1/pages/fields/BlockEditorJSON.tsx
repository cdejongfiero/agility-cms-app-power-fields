import { useAgilityAppSDK } from "@agility/app-sdk"
import dynamic from "next/dynamic"

const BlockEditorTest = dynamic(() => import("../../components/BlockEditorTest"), { ssr: false })
export default function BlockEditorPage() {
	const { initializing, appInstallContext } = useAgilityAppSDK()
	if (initializing) return null
	return <BlockEditorTest configuration={appInstallContext?.configuration} />
}

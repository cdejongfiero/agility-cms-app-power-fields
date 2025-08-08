import { useAgilityAppSDK } from "@agility/app-sdk"
import dynamic from "next/dynamic"

const BlockComposer = dynamic(() => import("../../components/BlockComposer"), { ssr: false })
export default function BlockComposerPage() {
	const { initializing, appInstallContext } = useAgilityAppSDK()
	if (initializing) return null
	return <BlockComposer configuration={appInstallContext?.configuration} />
}

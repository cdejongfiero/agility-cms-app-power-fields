import { useAgilityAppSDK } from "@agility/app-sdk"
import dynamic from "next/dynamic"

const RecipeInstructionsComposer = dynamic(() => import("../../components/RecipeInstructionsComposer"), { ssr: false })
export default function RecipeInstructionsComposerPage() {
	const { initializing, appInstallContext } = useAgilityAppSDK()
	if (initializing) return null
	return <RecipeInstructionsComposer configuration={appInstallContext?.configuration} />
}

import { useAgilityAppSDK } from "@agility/app-sdk"
import dynamic from "next/dynamic"

const RecipeIngredientsComposer = dynamic(() => import("../../components/RecipeIngredientsComposer"), { ssr: false })
export default function RecipeIngredientsComposerPage() {
	const { initializing, appInstallContext } = useAgilityAppSDK()
	if (initializing) return null
	return <RecipeIngredientsComposer configuration={appInstallContext?.configuration} />
}

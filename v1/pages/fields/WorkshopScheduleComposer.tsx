import { useAgilityAppSDK } from "@agility/app-sdk"
import dynamic from "next/dynamic"

const WorkshopScheduleComposer = dynamic(() => import("../../components/WorkshopScheduleComposer"), { ssr: false })
export default function WorkshopScheduleComposerPage() {
	const { initializing, appInstallContext } = useAgilityAppSDK()
	if (initializing) return null
	return <WorkshopScheduleComposer configuration={appInstallContext?.configuration} />
}

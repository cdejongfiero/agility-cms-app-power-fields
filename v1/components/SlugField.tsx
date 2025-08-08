import { useAgilityAppSDK, contentItemMethods, setHeight, openAlertModal, setFocus } from "@agility/app-sdk";
import { useEffect, useState } from "react";
import { FormInputWithAddons, INestedInputButtonProps, UnifiedIconName } from "@agility/plenum-ui";
import { FOCUS_EVENTS, handleFieldFocusEvent } from "@/methods/handleFieldFocusEvent";

const makeFriendlyStr = (s: string): string => {
	if (!s) return "";
	let friendly = s.toLowerCase();
	friendly = friendly
		.replace(new RegExp("\\s", "g"), "-")
		.replace(new RegExp("[àáâãäå]", "g"), "a")
		.replace(new RegExp("æ", "g"), "ae")
		.replace(new RegExp("ç", "g"), "c")
		.replace(new RegExp("[èéêë]", "g"), "e")
		.replace(new RegExp("[ìíîï]", "g"), "i")
		.replace(new RegExp("ñ", "g"), "n")
		.replace(new RegExp("[òóôõö]", "g"), "o")
		.replace(new RegExp("œ", "g"), "oe")
		.replace(new RegExp("[ùúûü]", "g"), "u")
		.replace(new RegExp("[ýÿ]", "g"), "y")
		.replace(new RegExp("[^\\w\\-@-]", "g"), "-")
		.replace(new RegExp("--+", "g"), "-");

	if (friendly.lastIndexOf("-") > 0 && friendly.lastIndexOf("-") == friendly.length - 1) {
		friendly = friendly.substring(0, friendly.length - 1);
	}
	return friendly;
};

const SlugField = () => {
	const { contentItem, field, fieldValue } = useAgilityAppSDK();

	const [currentTitle, setCurrentTitle] = useState<string>("");
	const [CTAIcon, setCTAIcon] = useState<UnifiedIconName | undefined>(undefined);
	const [CTALabel, setCTALabel] = useState<string | undefined>("Re-Generate Slug");
	const [width, setWidth] = useState<number>(document.body.clientWidth);

	const regenerateSlug = async (title: string) => {
		const newVal = makeFriendlyStr(title);
		contentItemMethods.setFieldValue({ name: field?.name, value: newVal });
	};
	const hasBeenSaved = !!!(contentItem && contentItem?.contentID < 0);

	const intializeTitleFieldListener = () => {
		contentItemMethods.addFieldListener({
			fieldName: "Title",
			onChange: (t) => {
				setCurrentTitle(t);
				contentItemMethods?.getContentItem()?.then((ci) => {
					//only regenerate the slug if the content item is new
					const isNewContentItem = Boolean((ci?.contentID ?? -1) < 0);
					if (isNewContentItem) {
						regenerateSlug(t);
					}
				});
			}
		});
	};

	const handleResizeListener: (isCleanup?: boolean) => void = (isCleanup) => {
		const handleResize = () => setWidth(document.body.clientWidth);
		if (isCleanup) {
			window.removeEventListener("resize", handleResize);
			return;
		} else {
			window.addEventListener("resize", handleResize);
			return;
		}
	};

	useEffect(() => {
		setHeight({ height: 50 });
		intializeTitleFieldListener();
		handleResizeListener();
		return () => {
			handleResizeListener(true);
		};
	}, []);

	useEffect(() => {
		if (hasBeenSaved) {
			setCTAIcon("RefreshIcon");
			setCTALabel("Re-Generate Slug");
			if (width < 400) {
				setCTALabel(undefined);
			}
		} else {
			setCTAIcon(undefined);
		}
	}, [hasBeenSaved, width]);

	const handleCTAClick = () => {
		if (!hasBeenSaved) {
			return;
		} else {
			openAlertModal({
				title: "Re-Generate Slug",
				message:
					"By changing the URL you could create broken links. We recommend you add in a URL redirection from the old URL to the new URL. Are you sure you wish to continue?",
				okButtonText: "Re-Generate",
				cancelButtonText: "Cancel",
				iconName: "QuestionMarkCircleIcon",
				callback: (ok: boolean) => {
					if (!ok) return;
					regenerateSlug(currentTitle);
				}
			});
		}
	};

	const formInputBTNProps: INestedInputButtonProps = {
		onClick: handleCTAClick,
		ctaLabel: CTALabel,
		icon: {
			icon: CTAIcon,
			className: "h-5 w-5 text-gray-400"
		},
		align: "right",
		onFocus: () => {
			handleFieldFocusEvent({ eventName: FOCUS_EVENTS.FOCUS });
		},
		onBlur: () => {
			handleFieldFocusEvent({ eventName: FOCUS_EVENTS.BLUR });
		},
		disabled: !hasBeenSaved
	};
	return (
		<div className="flex flex-row items-center justify-between gap-1">
			<div className="w-full p-1 ">
				<FormInputWithAddons
					type={"text"}
					value={fieldValue}
					name={field?.name || ""}
					handleChange={(value: string) => {
						regenerateSlug(value);
					}}
					onFocus={() => {
						handleFieldFocusEvent({ eventName: FOCUS_EVENTS.FOCUS });
					}}
					onBlur={() => {
						handleFieldFocusEvent({ eventName: FOCUS_EVENTS.BLUR });
					}}
					addonBTN={formInputBTNProps}
				/>
			</div>
		</div>
	);
};

export default SlugField;

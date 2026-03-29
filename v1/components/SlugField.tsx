import { useAgilityAppSDK, contentItemMethods, setHeight, openAlertModal } from "@agility/app-sdk";
import { useEffect, useState, useRef, useCallback } from "react";
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

/**
 * Resolve which field to use as the slug source by inspecting the content model.
 * Strategy:
 *   1. Sort fields by ItemOrder (the order they appear in the CMS editor)
 *   2. Find the first Text/LongText field that is NOT the slug field itself
 *
 * This means it works automatically with "Title", "Recipe Name", "Workshop Title",
 * "Pizza Style Name", or any other first-text-field convention.
 */
const resolveSourceFieldName = (
	fieldSettings: { FieldName: string; FieldType: string; ItemOrder: number; Label: string }[],
	slugFieldName: string | undefined
): string | null => {
	if (!fieldSettings || fieldSettings.length === 0) return null;

	const textFieldTypes = ["Text", "LongText"];

	const sorted = [...fieldSettings].sort((a, b) => a.ItemOrder - b.ItemOrder);

	const sourceField = sorted.find(
		(f) =>
			textFieldTypes.includes(f.FieldType) &&
			f.FieldName.toLowerCase() !== (slugFieldName || "").toLowerCase()
	);

	return sourceField?.FieldName || null;
};

const SlugField = () => {
	const { contentItem, field, fieldValue, contentModel } = useAgilityAppSDK();

	const [currentTitle, setCurrentTitle] = useState<string>("");
	const [CTAIcon, setCTAIcon] = useState<UnifiedIconName | undefined>(undefined);
	const [CTALabel, setCTALabel] = useState<string | undefined>("Re-Generate Slug");
	const [width, setWidth] = useState<number>(document.body.clientWidth);

	// Track the resolved source field so we can clean up the listener
	const sourceFieldRef = useRef<string | null>(null);

	const isNewContentItem = Boolean(contentItem && contentItem.contentID < 0);
	const hasBeenSaved = !isNewContentItem;

	const regenerateSlug = useCallback(
		(title: string) => {
			const newVal = makeFriendlyStr(title);
			contentItemMethods.setFieldValue({ name: field?.name, value: newVal });
		},
		[field?.name]
	);

	// Resolve the source field from the content model and attach a listener
	useEffect(() => {
		if (!contentModel?.FieldSettings) return;

		const sourceFieldName = resolveSourceFieldName(contentModel.FieldSettings, field?.name);

		if (!sourceFieldName) {
			console.warn(
				`[SlugField] Could not find a text field to use as slug source in model "${contentModel.ReferenceName}". ` +
					`Fields: ${contentModel.FieldSettings.map((f) => `${f.FieldName} (${f.FieldType})`).join(", ")}`
			);
			return;
		}

		sourceFieldRef.current = sourceFieldName;

		contentItemMethods.addFieldListener({
			fieldName: sourceFieldName,
			onChange: (titleValue: string) => {
				setCurrentTitle(titleValue || "");

				contentItemMethods?.getContentItem()?.then((ci) => {
					const isNew = Boolean((ci?.contentID ?? -1) < 0);
					if (isNew) {
						const newVal = makeFriendlyStr(titleValue || "");
						contentItemMethods.setFieldValue({ name: field?.name, value: newVal });
					}
				});
			},
		});

		// Cleanup: remove the field listener on unmount
		return () => {
			if (sourceFieldRef.current) {
				contentItemMethods.removeFieldListener({ fieldName: sourceFieldRef.current });
			}
		};
	}, [contentModel, field?.name]);

	// Set height and handle resize
	useEffect(() => {
		setHeight({ height: 50 });

		const handleResize = () => setWidth(document.body.clientWidth);
		window.addEventListener("resize", handleResize);
		return () => {
			window.removeEventListener("resize", handleResize);
		};
	}, []);

	// Update CTA button display based on save state and width
	useEffect(() => {
		if (hasBeenSaved) {
			setCTAIcon("RefreshIcon");
			setCTALabel(width < 400 ? undefined : "Re-Generate Slug");
		} else {
			setCTAIcon(undefined);
			setCTALabel(undefined);
		}
	}, [hasBeenSaved, width]);

	const handleCTAClick = () => {
		if (!hasBeenSaved) return;

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
			},
		});
	};

	const formInputBTNProps: INestedInputButtonProps = {
		onClick: handleCTAClick,
		ctaLabel: CTALabel,
		icon: {
			icon: CTAIcon,
			className: "h-5 w-5 text-gray-400",
		},
		align: "right",
		onFocus: () => {
			handleFieldFocusEvent({ eventName: FOCUS_EVENTS.FOCUS });
		},
		onBlur: () => {
			handleFieldFocusEvent({ eventName: FOCUS_EVENTS.BLUR });
		},
		disabled: !hasBeenSaved,
	};

	return (
		<div className="flex flex-row items-center justify-between gap-1">
			<div className="w-full p-1">
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

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
 * Resolve the source field name for slug generation.
 *
 * Strategy (in order):
 *   1. Use contentModel.FieldSettings if available — sort by ItemOrder,
 *      pick the first Text/LongText field that isn't the slug field itself.
 *   2. Fall back to inspecting contentItem.values keys — find the first key
 *      whose value is a non-empty string and isn't the slug field.
 *
 * This works for "Title", "Recipe Name", "Workshop Title", "Pizza Style Name", etc.
 */
const resolveSourceFieldName = (
	contentModel: any | null,
	contentItem: any | null,
	slugFieldName: string | undefined
): string | null => {
	const slugName = (slugFieldName || "").toLowerCase();

	// Strategy 1: Use content model field settings (most reliable — respects field order)
	if (contentModel?.FieldSettings?.length) {
		const textFieldTypes = ["Text", "LongText"];
		const sorted = [...contentModel.FieldSettings].sort(
			(a: any, b: any) => a.ItemOrder - b.ItemOrder
		);
		const sourceField = sorted.find(
			(f: any) =>
				textFieldTypes.includes(f.FieldType) &&
				f.FieldName.toLowerCase() !== slugName
		);
		if (sourceField) return sourceField.FieldName;
	}

	// Strategy 2: Fall back to content item values (works even without contentModel)
	if (contentItem?.values) {
		const keys = Object.keys(contentItem.values);
		for (const key of keys) {
			if (key.toLowerCase() === slugName) continue;
			// Skip Agility system fields
			if (key.startsWith("_") || key === "contentID" || key === "referenceName") continue;
			const val = contentItem.values[key];
			// Pick the first field that looks like a title (non-empty string, not JSON/HTML)
			if (typeof val === "string" && val.trim().length > 0 && !val.startsWith("{") && !val.startsWith("<")) {
				return key;
			}
		}
	}

	return null;
};

/**
 * Get the current source field value directly from the content item.
 * Used by Re-Generate to avoid depending on stale listener state.
 */
const getSourceFieldValue = async (slugFieldName: string | undefined, contentModel: any | null): Promise<string> => {
	try {
		const ci = await contentItemMethods?.getContentItem?.();
		if (!ci?.values) return "";

		const fieldName = resolveSourceFieldName(contentModel, ci, slugFieldName);
		if (!fieldName) return "";

		return ci.values[fieldName] || "";
	} catch {
		return "";
	}
};

const SlugField = () => {
	const { contentItem, field, fieldValue, contentModel } = useAgilityAppSDK();

	const [CTAIcon, setCTAIcon] = useState<UnifiedIconName | undefined>(undefined);
	const [CTALabel, setCTALabel] = useState<string | undefined>("Re-Generate Slug");
	const [width, setWidth] = useState<number>(document.body.clientWidth);

	// Track the resolved source field for listener cleanup
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

	// Resolve the source field and attach a listener for auto-generation on new items
	useEffect(() => {
		// Wait until initialization data is available
		if (!contentItem && !contentModel) return;

		const sourceFieldName = resolveSourceFieldName(contentModel, contentItem, field?.name);

		if (!sourceFieldName) {
			console.warn(
				`[SlugField] Could not resolve a source field for slug generation.`,
				{ contentModel: !!contentModel, contentItem: !!contentItem, slugField: field?.name }
			);
			return;
		}

		console.log(`[SlugField] Listening to "${sourceFieldName}" for slug auto-generation`);
		sourceFieldRef.current = sourceFieldName;

		contentItemMethods.addFieldListener({
			fieldName: sourceFieldName,
			onChange: (titleValue: string) => {
				contentItemMethods?.getContentItem?.()?.then((ci) => {
					const isNew = Boolean((ci?.contentID ?? -1) < 0);
					if (isNew) {
						const newVal = makeFriendlyStr(titleValue || "");
						contentItemMethods.setFieldValue({ name: field?.name, value: newVal });
					}
				});
			},
		});

		return () => {
			if (sourceFieldRef.current) {
				contentItemMethods.removeFieldListener({ fieldName: sourceFieldRef.current });
			}
		};
	}, [contentModel, contentItem, field?.name]);

	// Set height and handle resize
	useEffect(() => {
		setHeight({ height: 50 });

		const handleResize = () => setWidth(document.body.clientWidth);
		window.addEventListener("resize", handleResize);
		return () => {
			window.removeEventListener("resize", handleResize);
		};
	}, []);

	// Update CTA button display
	useEffect(() => {
		if (hasBeenSaved) {
			setCTAIcon("RefreshIcon");
			setCTALabel(width < 400 ? undefined : "Re-Generate Slug");
		} else {
			setCTAIcon(undefined);
			setCTALabel(undefined);
		}
	}, [hasBeenSaved, width]);

	const handleCTAClick = async () => {
		if (!hasBeenSaved) return;

		openAlertModal({
			title: "Re-Generate Slug",
			message:
				"By changing the URL you could create broken links. We recommend you add in a URL redirection from the old URL to the new URL. Are you sure you wish to continue?",
			okButtonText: "Re-Generate",
			cancelButtonText: "Cancel",
			iconName: "QuestionMarkCircleIcon",
			callback: async (ok: boolean) => {
				if (!ok) return;

				// Fetch the source field value fresh at click time — don't rely on listener state
				const sourceValue = await getSourceFieldValue(field?.name, contentModel);

				if (!sourceValue) {
					console.warn("[SlugField] Re-Generate: could not find source field value from content item");
					return;
				}

				regenerateSlug(sourceValue);
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

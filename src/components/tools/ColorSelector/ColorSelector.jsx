import { useEffect, useMemo, useState, useCallback } from "react";
import { hexToRGB, rgbToHex, normalizeHex, clamp } from "/src/utils/colors.js";

import "./ColorSelector.css";

import Modal from "/src/components/tools/Modal/Modal.jsx";

function ColorMenu({ value, onSelect, disabled = false }) {
	const [draftHex, setDraftHex] = useState(value);

	useEffect(() => {
		setDraftHex(value);
	}, [value]);

	const applyHex = useCallback((nextHex) => {
		const normalized = normalizeHex(nextHex);
		if (!normalized || disabled) return;
		onSelect?.(normalized);
		setDraftHex(normalized);
	}, [disabled, onSelect]);

	const handleDraftSubmit = () => {
		applyHex(draftHex);
	};

	return (
		<div className="colorSelectorMenu">
			<div className="colorSelectorMenuHero" style={{ background: `linear-gradient(135deg, ${value}, rgba(255, 255, 255, 0.16))` }}>
				<div className="colorSelectorMenuHeroCopy">
					<span className="colorSelectorMenuEyebrow">current color</span>
					<strong>{value.toUpperCase()}</strong>
				</div>
				<div className="colorSelectorMenuHeroSwatch" style={{ backgroundColor: value }} />
			</div>

			<div className="colorSelectorMenuSection colorSelectorMenuSectionCompact">
				<label className="colorSelectorHexField">
					<span>Hex</span>
					<div className="colorSelectorHexFieldRow">
						<input
							type="text"
							value={draftHex}
							onChange={(event) => setDraftHex(event.target.value)}
							onKeyDown={(event) => {
								if (event.key === "Enter") handleDraftSubmit();
							}}
							placeholder="#3b82f6"
							disabled={disabled}
							aria-label="Enter a hex color"
						/>
						<button className="colorSelectorHexApplyButton" onClick={handleDraftSubmit} disabled={disabled}>
							Apply
						</button>
					</div>
				</label>
			</div>
		</div>
	);
}

export default function ColorSelector({
	value,
	defaultValue = "#3b82f6",
	onChange,
	disabled = false,
	label = "Color",
}) {

	const initial_color = useMemo(() => {
		const parsed = hexToRGB(value ?? defaultValue);
		return parsed ?? hexToRGB("#3b82f6");
	}, [value, defaultValue]);

	const [rgb, setRGB] = useState(initial_color);

	useEffect(() => {
		if (value === undefined) return;

		const parsed = hexToRGB(value);
		if (parsed) setRGB(parsed);
	}, [value]); // outside update

	const hex_color = useMemo(() => rgbToHex(rgb), [rgb]); 

	const emit = (next_rgb) => {
		const next_hex = rgbToHex(next_rgb);
		onChange?.({
			hex: next_hex,
			rgb: next_rgb,
		});
	};

	const updateRGB = (next_rgb) => {
		setRGB(next_rgb);
		emit(next_rgb);
	};

	const handlePickerChange = (event) => {
		const parsed = hexToRGB(event.target.value);
		if (!parsed) return;
		updateRGB(parsed);
	};

	const handleMenuSelect = useCallback((nextHex) => {
		const parsed = hexToRGB(nextHex);
		if (!parsed) return;
		updateRGB(parsed);
	}, []);

	return (
		<div className={`colorSelector${disabled ? " disabled" : ""}`}>
			<div className="colorSelectorHeader">
				<span className="colorSelectorLabel">{label}</span>
				<span className="colorSelectorHex">{hex_color.toUpperCase()}</span>
			</div>

			<div className="colorSelectorPickerRow">
				<Modal
					title="Color Menu"
					description={<ColorMenu value={hex_color} onSelect={handleMenuSelect} disabled={disabled} />}
					buttonText="Menu"
					buttonClassName="colorSelectorPaletteButton"
				/>
				<div className="colorSelectorPreview" style={{ backgroundColor: hex_color }} />
			</div>
		</div>
	);
}

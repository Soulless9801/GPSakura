import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { hexToRGB, rgbToHex, normalizeHex } from "/src/utils/colors.js";

import "./ColorSelector.css";

import Modal from "/src/components/tools/Modal/Modal.jsx";

function clamp01(value) {
	return Math.min(1, Math.max(0, value));
}

function hsvToRgb(h, s, v) {
	const hue = ((h % 360) + 360) % 360;
	const c = v * s;
	const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
	const m = v - c;

	let rPrime = 0;
	let gPrime = 0;
	let bPrime = 0;

	if (hue < 60) {
		rPrime = c;
		gPrime = x;
	} else if (hue < 120) {
		rPrime = x;
		gPrime = c;
	} else if (hue < 180) {
		gPrime = c;
		bPrime = x;
	} else if (hue < 240) {
		gPrime = x;
		bPrime = c;
	} else if (hue < 300) {
		rPrime = x;
		bPrime = c;
	} else {
		rPrime = c;
		bPrime = x;
	}

	return [
		Math.round((rPrime + m) * 255),
		Math.round((gPrime + m) * 255),
		Math.round((bPrime + m) * 255),
	];
}

function rgbToHsv([r, g, b]) {
	const rn = r / 255;
	const gn = g / 255;
	const bn = b / 255;
	const max = Math.max(rn, gn, bn);
	const min = Math.min(rn, gn, bn);
	const delta = max - min;

	let h = 0;
	if (delta !== 0) {
		if (max === rn) h = 60 * (((gn - bn) / delta) % 6);
		else if (max === gn) h = 60 * ((bn - rn) / delta + 2);
		else h = 60 * ((rn - gn) / delta + 4);
	}

	const normalizedHue = (h + 360) % 360;
	const s = max === 0 ? 0 : delta / max;
	const v = max;

	return [normalizedHue, s, v];
}

function hexToHsv(hex) {
	const rgb = hexToRGB(hex);
	if (!rgb) return [210, 0.76, 0.96];
	return rgbToHsv(rgb);
}

function ColorMenu({ value, onSelect, disabled = false }) {
	const [draftHex, setDraftHex] = useState(value);
	const [hsv, setHSV] = useState(() => hexToHsv(value));
	const pickerRef = useRef(null);
	const hueRef = useRef(null);
	const pickerDragRef = useRef(false);
	const hueDragRef = useRef(false);
	const skipNextValueSyncRef = useRef(false);

	useEffect(() => {
		if (skipNextValueSyncRef.current) {
			skipNextValueSyncRef.current = false;
			return;
		}
		setDraftHex(value);
		setHSV(hexToHsv(value));
	}, [value]);

	const applyHSV = useCallback((nextHSV) => {
		if (disabled) return;
		const [nextH, nextS, nextV] = nextHSV;
		const normalized = [
			Math.min(359.999, Math.max(0, nextH)),
			clamp01(nextS),
			clamp01(nextV),
		];
		setHSV(normalized);
		const nextHex = rgbToHex(hsvToRgb(normalized[0], normalized[1], normalized[2]));
		skipNextValueSyncRef.current = true;
		onSelect?.(nextHex);
		setDraftHex(nextHex);
	}, [disabled, onSelect]);

	const applyHex = useCallback((nextHex) => {
		const normalized = normalizeHex(nextHex);
		if (!normalized || disabled) return;
		skipNextValueSyncRef.current = true;
		onSelect?.(normalized);
		setDraftHex(normalized);
		setHSV(hexToHsv(normalized));
	}, [disabled, onSelect]);

	const handleDraftSubmit = () => {
		applyHex(draftHex);
	};

	const updateFromPickerEvent = useCallback((event) => {
		if (!pickerRef.current) return;
		const rect = pickerRef.current.getBoundingClientRect();
		const x = clamp01((event.clientX - rect.left) / rect.width);
		const y = clamp01((event.clientY - rect.top) / rect.height);
		applyHSV([hsv[0], x, 1 - y]);
	}, [applyHSV, hsv]);

	const updateFromHueEvent = useCallback((event) => {
		if (!hueRef.current) return;
		const rect = hueRef.current.getBoundingClientRect();
		const x = clamp01((event.clientX - rect.left) / rect.width);
		applyHSV([x * 359.999, hsv[1], hsv[2]]);
	}, [applyHSV, hsv]);

	const hueColor = rgbToHex(hsvToRgb(hsv[0], 1, 1));
	const pickerHandleStyle = {
		left: `${hsv[1] * 100}%`,
		top: `${(1 - hsv[2]) * 100}%`,
	};

	const hueHandleStyle = {
		left: `${(hsv[0] / 360) * 100}%`,
	};

	return (
		<div className="colorSelectorMenu">
			<div className="colorSelectorMenuSection">
				<div className="colorSelectorMenuHero" style={{ background: `linear-gradient(135deg, ${value}, rgba(255, 255, 255, 0.16))` }}>
					<div className="colorSelectorMenuHeroCopy">
						<span className="colorSelectorMenuEyebrow">current color</span>
						<strong>{value.toUpperCase()}</strong>
					</div>
					<div className="colorSelectorMenuHeroSwatch" style={{ backgroundColor: value }} />
				</div>
				<div className="colorSelectorMenuControls">
					<span className="colorSelectorMenuEyebrow">Picker</span>
					<div
						className="colorSelectorPickerSurface"
						ref={pickerRef}
						style={{ backgroundColor: hueColor }}
						onPointerDown={(event) => {
							if (disabled) return;
							pickerDragRef.current = true;
							event.currentTarget.setPointerCapture(event.pointerId);
							updateFromPickerEvent(event);
						}}
						onPointerMove={(event) => {
							if (!pickerDragRef.current || disabled) return;
							updateFromPickerEvent(event);
						}}
						onPointerUp={(event) => {
							pickerDragRef.current = false;
							event.currentTarget.releasePointerCapture(event.pointerId);
						}}
						onPointerCancel={() => {
							pickerDragRef.current = false;
						}}
					>
						<div className="colorSelectorPickerWhite" />
						<div className="colorSelectorPickerBlack" />
						<div className="colorSelectorPickerHandle" style={pickerHandleStyle} />
					</div>

					<div
						className="colorSelectorHueSlider"
						ref={hueRef}
						onPointerDown={(event) => {
							if (disabled) return;
							hueDragRef.current = true;
							event.currentTarget.setPointerCapture(event.pointerId);
							updateFromHueEvent(event);
						}}
						onPointerMove={(event) => {
							if (!hueDragRef.current || disabled) return;
							updateFromHueEvent(event);
						}}
						onPointerUp={(event) => {
							hueDragRef.current = false;
							event.currentTarget.releasePointerCapture(event.pointerId);
						}}
						onPointerCancel={() => {
							hueDragRef.current = false;
						}}
					>
						<div className="colorSelectorHueHandle" style={hueHandleStyle} />
					</div>
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
							<button type="button" className="colorSelectorHexApplyButton" onClick={handleDraftSubmit} disabled={disabled}>
								Apply
							</button>
						</div>
					</label>
				</div>
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

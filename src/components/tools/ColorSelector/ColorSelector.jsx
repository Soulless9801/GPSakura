import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { hexToRGB, rgbToHex, normalizeHex, hsvToRGB, hexToHsv } from "/src/utils/colors.js";

import "./ColorSelector.css";

import Modal from "/src/components/tools/Modal/Modal.jsx";
import Form from "/src/components/tools/Form/Form.jsx";

function clamp(value) {
	return Math.min(1, Math.max(0, value));
}

function HSVInput({ value, onChange, disabled = false }) {

	const [hsv, setHSV] = useState(() => hexToHsv(value));

	const pickerRef = useRef(null);
	const hueRef = useRef(null);
	const pickerDragRef = useRef(false);
	const hueDragRef = useRef(false);

	const applyHSV = useCallback((nextHSV) => {
		if (disabled) return;
		const [nextH, nextS, nextV] = nextHSV;
		const normalized = [
			Math.min(359.999, Math.max(0, nextH)),
			clamp(nextS),
			clamp(nextV),
		];
		setHSV(normalized);
		const nextHex = rgbToHex(hsvToRGB(normalized[0], normalized[1], normalized[2]));
		onChange?.(nextHex);
	}, [disabled, onChange]);

	const updateFromPickerEvent = useCallback((event) => {
		if (!pickerRef.current) return;
		const rect = pickerRef.current.getBoundingClientRect();
		const x = clamp((event.clientX - rect.left) / rect.width);
		const y = clamp((event.clientY - rect.top) / rect.height);
		applyHSV([hsv[0], x, 1 - y]);
	}, [applyHSV, hsv]);

	const updateFromHueEvent = useCallback((event) => {
		if (!hueRef.current) return;
		const rect = hueRef.current.getBoundingClientRect();
		const x = clamp((event.clientX - rect.left) / rect.width);
		applyHSV([x * 359.999, hsv[1], hsv[2]]);
	}, [applyHSV, hsv]);

	const hueColor = rgbToHex(hsvToRGB(hsv[0], 1, 1));
	const pickerHandleStyle = {
		left: `${hsv[1] * 100}%`,
		top: `${(1 - hsv[2]) * 100}%`,
	};

	const hueHandleStyle = {
		left: `${(hsv[0] / 360) * 100}%`,
	};

	useEffect(() => {
		const next = hexToHsv(value);
		if (!next) return;
		if (pickerDragRef.current || hueDragRef.current) return;
		setHSV(next);
	}, [value]);

	return (
		<div className="colorSelectorMenuControls">
			{/*<span className="colorSelectorMenuEyebrow">Picker</span>*/}
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
					// compute final hsv from the pointer position and commit
					if (!pickerRef.current) return;
					const rect = pickerRef.current.getBoundingClientRect();
					const x = clamp((event.clientX - rect.left) / rect.width);
					const y = clamp((event.clientY - rect.top) / rect.height);
					const final = [hsv[0], x, 1 - y];
					const finalHex = rgbToHex(hsvToRGB(final[0], final[1], final[2]));
					setHSV(final);
					onChange?.(finalHex, true);
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
					if (!hueRef.current) return;
					const rect = hueRef.current.getBoundingClientRect();
					const x = clamp((event.clientX - rect.left) / rect.width);
					const final = [x * 359.999, hsv[1], hsv[2]];
					const finalHex = rgbToHex(hsvToRGB(final[0], final[1], final[2]));
					setHSV(final);
					onChange?.(finalHex, true);
				}}
				onPointerCancel={() => {
					hueDragRef.current = false;
				}}
			>
				<div className="colorSelectorHueHandle" style={hueHandleStyle} />
			</div>
		</div>
	);
}

function HexInput({ value, onSubmit, disabled = false }) {

	const [draftHex, setDraftHex] = useState(value);

	useEffect(() => {
		setDraftHex(value);
	}, [value]);

	const handleSubmit = () => {
		const normalized = normalizeHex(draftHex);
		if (!normalized || disabled) return;
		onSubmit?.(normalized);
	};

	return (
		<div className="colorSelectorMenuSection colorSelectorMenuSectionCompact">
			<label className="colorSelectorHexField">
				<div className="colorSelectorHexFieldRow">
					<input
						type="text"
						value={draftHex}
						onChange={(event) => setDraftHex(event.target.value)}
						onKeyDown={(event) => {
							if (event.key === "Enter") handleSubmit();
						}}
						onBlur={handleSubmit}
						placeholder="#3b82f6"
						disabled={disabled}
					/>
				</div>
			</label>
		</div>
	);
}

export function RGBInput({ value, onSubmit, onChange, disabled = false }) {
	const [rgb, setRGB] = useState(() => hexToRGB(value) ?? [0, 0, 0]);

	useEffect(() => {
		const next = Array.isArray(value) ? value : hexToRGB(value);
		if (next) setRGB(next);
	}, [value]);

	const channels = [
		{ label: "R", index: 0 },
		{ label: "G", index: 1 },
		{ label: "B", index: 2 },
	];

	const updateChannel = (index, rawValue) => {
		const nextRGB = [...rgb];
		nextRGB[index] = Math.min(255, Math.max(0, parseInt(rawValue, 10) || 0));
		setRGB(nextRGB);
		if (onSubmit) onSubmit?.(rgbToHex(nextRGB));
		if (onChange) onChange?.(index, nextRGB[index]);
	};

	return (
		<div className="colorSelectorMenuSection colorSelectorMenuSectionCompact">
			<label className="colorSelectorRGBField">
				<div className="colorSelectorRGBFieldRow">
					{channels.map(({ label, index }) => (
						<>
							<label>{label}</label>
							<Form
								key={label}
								init={rgb[index]}
								min={0}
								max={255}
								step={1}
								onChange={(val) => updateChannel(index, val)}
								disabled={disabled}
								notifyOnInitChange={false}
							/>
						</>
					))}
				</div>
			</label>
		</div>
	);
}

function ColorMenu({ value, onSelect, disabled = false }) {
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
				
				<HSVInput value={value} onChange={onSelect} disabled={disabled} />
				
				<HexInput value={value} onSubmit={onSelect} disabled={disabled} />

				<RGBInput value={value} onSubmit={onSelect} disabled={disabled} />

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

	const initialHex = useMemo(() => {
		const incoming = value ?? defaultValue;
		const normalized = normalizeHex(incoming);
		return normalized ?? "#3b82f6";
	}, [value, defaultValue]);

	const [hexState, setHexState] = useState(initialHex);

	useEffect(() => {
		if (value === undefined) return;
		const parsed = hexToRGB(value);
		if (parsed) {
			const normalized = normalizeHex(value);
			if (normalized) setHexState(normalized);
		}
	}, [value]);

	const hex_color = useMemo(() => hexState, [hexState]); 

	const emitImmediate = (next_hex) => {
		onChange?.(next_hex);
	};

	const commitUpdateHex = (next_hex) => {
		setHexState(next_hex);
		emitImmediate(next_hex);
	};

	const handleMenuSelect = (nextHex) => {
		commitUpdateHex(nextHex);
	};

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

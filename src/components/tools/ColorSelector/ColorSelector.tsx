import { Fragment, useEffect, useMemo, useState, useCallback, useRef } from "react";
import { hexToRGB, rgbToHex, normalizeHex, hsvToRGB, hexToHsv, type HSV, type RGB } from "/src/utils/colors";
import type { CSSProperties } from "react";

import "./ColorSelector.css";

import Modal from "/src/components/tools/Modal/Modal";
import Form from "/src/components/tools/Form/Form";

function clamp(value: number): number {
	return Math.min(1, Math.max(0, value));
}

type ColorChange = (value: string, committed?: boolean) => void;

interface HSVInputProps {
    value: string;
    onChange?: ColorChange;
    disabled?: boolean;
}

function HSVInput({ value, onChange, disabled = false }: HSVInputProps) {

	const [hsv, setHSV] = useState<HSV>(() => hexToHsv(value));

	const pickerRef = useRef<HTMLDivElement>(null);
	const hueRef = useRef<HTMLDivElement>(null);
	const pickerDragRef = useRef(false);
	const hueDragRef = useRef(false);

	const applyHSV = useCallback((nextHSV: HSV): void => {
		if (disabled) {return;}
		const [nextH, nextS, nextV] = nextHSV;
		const normalized: HSV = [
			Math.min(359.999, Math.max(0, nextH)),
			clamp(nextS),
			clamp(nextV),
		];
		setHSV(normalized);
		const nextHex = rgbToHex(hsvToRGB(normalized[0], normalized[1], normalized[2]));
		onChange?.(nextHex);
	}, [disabled, onChange]);

	const updateFromPickerEvent = useCallback((event: React.PointerEvent<HTMLDivElement>): void => {
		if (!pickerRef.current) {return;}
		const rect = pickerRef.current.getBoundingClientRect();
		const x = clamp((event.clientX - rect.left) / rect.width);
		const y = clamp((event.clientY - rect.top) / rect.height);
		applyHSV([hsv[0], x, 1 - y]);
	}, [applyHSV, hsv]);

	const updateFromHueEvent = useCallback((event: React.PointerEvent<HTMLDivElement>): void => {
		if (!hueRef.current) {return;}
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
		if (!next) {return;}
		if (pickerDragRef.current || hueDragRef.current) {return;}
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
					if (disabled) {return;}
					pickerDragRef.current = true;
					event.currentTarget.setPointerCapture(event.pointerId);
					updateFromPickerEvent(event);
				}}
				onPointerMove={(event) => {
					if (!pickerDragRef.current || disabled) {return;}
					updateFromPickerEvent(event);
				}}
				onPointerUp={(event) => {
					pickerDragRef.current = false;
					event.currentTarget.releasePointerCapture(event.pointerId);
					// compute final hsv from the pointer position and commit
					if (!pickerRef.current) {return;}
					const rect = pickerRef.current.getBoundingClientRect();
					const x = clamp((event.clientX - rect.left) / rect.width);
					const y = clamp((event.clientY - rect.top) / rect.height);
					const final: HSV = [hsv[0], x, 1 - y];
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
					if (disabled) {return;}
					hueDragRef.current = true;
					event.currentTarget.setPointerCapture(event.pointerId);
					updateFromHueEvent(event);
				}}
				onPointerMove={(event) => {
					if (!hueDragRef.current || disabled) {return;}
					updateFromHueEvent(event);
				}}
				onPointerUp={(event) => {
					hueDragRef.current = false;
					event.currentTarget.releasePointerCapture(event.pointerId);
					if (!hueRef.current) {return;}
					const rect = hueRef.current.getBoundingClientRect();
					const x = clamp((event.clientX - rect.left) / rect.width);
					const final: HSV = [x * 359.999, hsv[1], hsv[2]];
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

interface HexInputProps {
	value: string;
	onSubmit?: (value: string) => void;
	disabled?: boolean;
}

function HexInput({ value, onSubmit, disabled = false }: HexInputProps) {

	const [draftHex, setDraftHex] = useState(value);

	useEffect(() => {
		setDraftHex(value);
	}, [value]);

	const handleSubmit = () => {
		const normalized = normalizeHex(draftHex);
		if (!normalized || disabled) {return;}
		onSubmit?.(normalized);
	};

	return (
		<div className="colorSelectorMenuSection colorSelectorMenuSectionCompact">
			<label className="colorSelectorHexField">
				<div className="colorSelectorHexFieldRow">
					<input
						type="text"
						value={draftHex}
						onChange={(event) => { setDraftHex(event.target.value); }}
						onKeyDown={(event) => {
							if (event.key === "Enter") {handleSubmit();}
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

interface RGBInputProps {
	value: string | RGB;
	onSubmit?: (value: string) => void;
	onChange?: (index: number, value: number) => void;
	getFieldStyle?: (index: number) => CSSProperties;
	disabled?: boolean;
}

export function RGBInput({ value, onSubmit, onChange, getFieldStyle, disabled = false }: RGBInputProps) {
	const [rgb, setRGB] = useState<RGB>(() => Array.isArray(value) ? [value[0], value[1], value[2]] : hexToRGB(value) ?? [0, 0, 0]);

	useEffect(() => {
		const next = Array.isArray(value) ? [value[0], value[1], value[2]] as RGB : hexToRGB(value);
		if (next) {setRGB(next);}
	}, [value]);

	const channels = [
		{ label: "R", index: 0 },
		{ label: "G", index: 1 },
		{ label: "B", index: 2 },
	];

	const updateChannel = (index: number, rawValue: number): void => {
		const nextRGB: RGB = [rgb[0], rgb[1], rgb[2]];
		nextRGB[index] = Math.min(255, Math.max(0, rawValue));
		setRGB(nextRGB);
		if (onSubmit) {onSubmit?.(rgbToHex(nextRGB));}
		if (onChange) {onChange?.(index, nextRGB[index]);}
	};

	return (
		<div className="colorSelectorMenuSection colorSelectorMenuSectionCompact">
			<label className="colorSelectorRGBField">
				<div className="colorSelectorRGBFieldRow">
					{channels.map(({ label, index }) => (
						<Fragment key={index}>
							<label>{label}</label>
								<Form
								init={rgb[index]}
								min={0}
								max={255}
								step={1}
										onChange={(val) => { updateChannel(index, val); }}
										style={getFieldStyle?.(index)}
								disabled={disabled}
								notifyOnInitChange={false}
							/>
						</Fragment>
					))}
				</div>
			</label>
		</div>
	);
}

interface ColorMenuProps {
	value: string;
	onSelect: ColorChange;
	disabled?: boolean;
}

function ColorMenu({ value, onSelect, disabled = false }: ColorMenuProps) {
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

interface ColorSelectorProps {
	value?: string;
	defaultValue?: string;
	onChange?: (value: string) => void;
	disabled?: boolean;
	label?: string;
}

export default function ColorSelector({
	value,
	defaultValue = "#3b82f6",
	onChange,
	disabled = false,
	label = "Color",
}: ColorSelectorProps) {

	const initialHex = useMemo(() => {
		const incoming = value ?? defaultValue;
		const normalized = normalizeHex(incoming);
		return normalized ?? "#3b82f6";
	}, [value, defaultValue]);

	const [hexState, setHexState] = useState(initialHex);

	useEffect(() => {
		if (value === undefined) {return;}
		const parsed = hexToRGB(value);
		if (parsed) {
			const normalized = normalizeHex(value);
			if (normalized) {setHexState(normalized);}
		}
	}, [value]);

	const hex_color = useMemo(() => hexState, [hexState]); 

	const emitImmediate = (nextHex: string): void => {
		onChange?.(nextHex);
	};

	const commitUpdateHex = (nextHex: string): void => {
		setHexState(nextHex);
		emitImmediate(nextHex);
	};

	const handleMenuSelect = (nextHex: string): void => {
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

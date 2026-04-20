import { useEffect, useMemo, useState, useCallback } from "react";
import { hexToRGB, rgbToHex, clamp } from "/src/utils/colors.js";
import Form from "/src/components/tools/Form/Form.jsx";

import "./ColorSelector.css";

export default function ColorSelector({
	value,
	defaultValue = "#3b82f6",
	onChange,
	disabled = false,
	label = "Color",
}) {
	const initialColor = useMemo(() => {
		const parsed = hexToRGB(value ?? defaultValue);
		return parsed ?? hexToRGB("#3b82f6");
	}, [value, defaultValue]);

	const [rgb, setRGB] = useState(initialColor);

	useEffect(() => {
		if (value === undefined) return;

		const parsed = hexToRGB(value);
		if (parsed) setRGB(parsed);
	}, [value]); // outside update

	const hexColor = useMemo(() => rgbToHex(rgb), [rgb]); 

	const emit = (nextRGB) => {
		const nextHex = rgbToHex(nextRGB);
		onChange?.({
			hex: nextHex,
			rgb: nextRGB,
		});
	};

	const updateRGB = (nextRGB) => {
		setRGB(nextRGB);
		emit(nextRGB);
	};

	const handlePickerChange = (event) => {
		const parsed = hexToRGB(event.target.value);
		if (!parsed) return;
		updateRGB(parsed);
	};

	const handleChannelChange = useCallback((channel, value) => {
		const next = rgb;
        next[channel] = clamp(value);
		updateRGB(next);
	}, [rgb]);

	return (
		<div className={`colorSelector${disabled ? " disabled" : ""}`}>
			<div className="colorSelectorHeader">
				<span className="colorSelectorLabel">{label}</span>
				<span className="colorSelectorHex">{hexColor.toUpperCase()}</span>
			</div>

			<div className="colorSelectorPickerRow">
				<input
					className="colorSelectorPicker"
					type="color"
					value={hexColor}
					onChange={handlePickerChange}
					disabled={disabled}
					aria-label="Select color"
				/>
				<div className="colorSelectorPreview" style={{ backgroundColor: hexColor }} />
			</div>

			<div className="colorSelectorChannels">
				{[
					{ key: 0, label: "R" },
					{ key: 1, label: "G" },
					{ key: 2, label: "B" },
				].map((channel) => (
					<label className="colorSelectorChannel" key={channel.key}>
						<span>{channel.label}</span>
                        <Form init={rgb[channel.key]} min={0} max={255} step={1} places={0} disabled={disabled} onChange={(e) => handleChannelChange(channel.key, e)} />
					</label>
				))}
			</div>
		</div>
	);
}

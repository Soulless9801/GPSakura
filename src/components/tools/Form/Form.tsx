import { useState, useEffect, useRef, useCallback } from "react";
import "./Form.css";

interface FormProps {
	init: number;
	min: number;
	max: number;
	onChange?: (value: number) => void;
	step?: number;
	places?: number;
	disabled?: boolean;
	style?: React.CSSProperties;
	className?: string;
	notifyOnInitChange?: boolean;
}

export default function Form({ init, min, max, onChange, step = 1, places = 0, disabled = false, style = {}, className = "", notifyOnInitChange = true }: FormProps) {
	const [value, setValue] = useState(init);
	const [draft, setDraft] = useState<string>(String(init));
	const [focus, setFocus] = useState(false);
	const skipNextOnChange = useRef(true);

	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		skipNextOnChange.current = !notifyOnInitChange;
		setValue(updateValue(init));
	}, [init, notifyOnInitChange]);

	useEffect(() => {
		setDraft(String(value));
		if (skipNextOnChange.current) {
			skipNextOnChange.current = false;
			return;
		}
		onChange?.(value);
	}, [value]);

	useEffect(() => {
		if (!focus) {inputRef.current?.blur();}
	}, [focus]);

	const updateValue = (newValue: number): number => {
		newValue = Math.min(max, Math.max(min, newValue));
		newValue = Math.round(newValue / step) * step;
		return parseFloat(newValue.toFixed(places));
	};

	useEffect(() => {
		setValue(prev => updateValue(prev));
	}, [min, max, step, places]);

	const commit = useCallback((off: number = 0) => {
		let num = parseFloat(draft);
		if (!isNaN(num)) {
			num = num + off;
			setValue(updateValue(num));
		} else {
			setDraft(String(value));
		}
	}, [draft, value]);

	const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
		if (disabled || !focus) {return;}
		if (e.key === "Enter") {
			setFocus(false);
		}
		if (e.key === "ArrowUp") {
			setValue(prev => updateValue(prev + step));
		}
		if (e.key === "ArrowDown") {
			setValue(prev => updateValue(prev - step));
		}
	}, [disabled, focus]);

	const handleClick = useCallback(() => {
		if (disabled) {return;}
		setFocus(true);
	}, [disabled]);

	const handleBlur = () => {
		commit();
	};

	const holdInterval = useRef<number | null>(null);
	const holdTimeout = useRef<number | null>(null);

	const startHold = (inc: number): void => {
		if (disabled || holdTimeout.current || holdInterval.current) {return;}
		setValue(prev => updateValue(prev + inc));
		holdTimeout.current = window.setTimeout(() => {
			holdInterval.current = window.setInterval(() => {
				setValue(prev => updateValue(prev + inc));
			}, 30);
		}, 500);
	};

	const stopHold = (): void => {
		if (holdTimeout.current !== null) {window.clearTimeout(holdTimeout.current);}
		if (holdInterval.current !== null) {window.clearInterval(holdInterval.current);}
		holdTimeout.current = null;
		holdInterval.current = null;
	};

	return (
		<div className={`customNumberInput ${disabled ? "disabled" : ""} ${className}`} style={style} onClick={handleClick} onBlur={handleBlur} >
			<input className="customNumberCaret" type="text" ref={inputRef} value={draft} onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setDraft(e.target.value); }} onFocus={() => { setFocus(true); }} onKeyDown={handleKeyDown} />
			<div className="customNumberButtons">
				<div
					className="btn-up"
					onPointerDown={(e: React.PointerEvent<HTMLDivElement>) => { e.preventDefault(); startHold(step); }}
					onPointerUp={stopHold}
					onPointerLeave={stopHold}
				>
					▲
				</div>
				<div
					className="btn-down"
					onPointerDown={(e: React.PointerEvent<HTMLDivElement>) => { e.preventDefault(); startHold(-step); }}
					onPointerUp={stopHold}
					onPointerLeave={stopHold}
				>
					▼
				</div>
			</div>
		</div>
	);
}

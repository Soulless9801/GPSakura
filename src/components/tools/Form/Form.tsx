import { useState, useEffect, useRef, useCallback } from "react";
import { clampToStep } from "/src/utils/number";
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
	const updateValue = useCallback((next: number): number => clampToStep(next, min, max, step, places), [min, max, step, places]);
	const [draft, setDraft] = useState(() => String(updateValue(init)));
	const [focus, setFocus] = useState(false);
	const valueRef = useRef(updateValue(init));
	const callbackRef = useRef(onChange);
	const previousInit = useRef<{ value: number } | null>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => { callbackRef.current = onChange; }, [onChange]);

	// Notify from explicit commits; a parent echo cannot suppress the next user edit.
	const applyValue = useCallback((next: number, notify = true, force = false): void => {
		const normalized = updateValue(next);
		const changed = normalized !== valueRef.current;
		valueRef.current = normalized;
		setDraft(String(normalized));
		if (notify && (changed || force)) {callbackRef.current?.(normalized);}
	}, [updateValue]);

	useEffect(() => {
		const first = previousInit.current === null;
		const changedInit = first || previousInit.current?.value !== init;
		previousInit.current = { value: init };
		applyValue(changedInit ? init : valueRef.current, changedInit ? notifyOnInitChange : true, first);
	}, [init, notifyOnInitChange, applyValue]);

	useEffect(() => {
		if (!focus) {inputRef.current?.blur();}
	}, [focus]);

	const commit = useCallback(() => {
		const num = parseFloat(draft);
		if (Number.isFinite(num)) {applyValue(num);}
		else {setDraft(String(valueRef.current));}
	}, [draft, applyValue]);

	const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
		if (disabled || !focus) {return;}
		if (e.key === "Enter") {setFocus(false);}
		if (e.key === "ArrowUp" || e.key === "ArrowDown") {
			e.preventDefault();
			applyValue(valueRef.current + (e.key === "ArrowUp" ? step : -step));
		}
	}, [disabled, focus, step, applyValue]);

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
		applyValue(valueRef.current + inc);
		holdTimeout.current = window.setTimeout(() => {
			holdInterval.current = window.setInterval(() => {
				applyValue(valueRef.current + inc);
			}, 30);
		}, 500);
	};

	const stopHold = (): void => {
		if (holdTimeout.current !== null) {window.clearTimeout(holdTimeout.current);}
		if (holdInterval.current !== null) {window.clearInterval(holdInterval.current);}
		holdTimeout.current = null;
		holdInterval.current = null;
	};

	useEffect(() => stopHold, [min, max, step, places, disabled]);

	return (
		<div className={`customNumberInput ${disabled ? "disabled" : ""} ${className}`} style={style} onClick={handleClick} onBlur={handleBlur} >
			<input className="customNumberCaret" type="text" ref={inputRef} value={draft} onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setDraft(e.target.value); }} onFocus={() => { setFocus(true); }} onKeyDown={handleKeyDown} />
			<div className="customNumberButtons">
				<div
					className="btn-up"
					onPointerDown={(e: React.PointerEvent<HTMLDivElement>) => { e.preventDefault(); startHold(step); }}
					onPointerUp={stopHold}
					onPointerLeave={stopHold}
					onPointerCancel={stopHold}
				>
					▲
				</div>
				<div
					className="btn-down"
					onPointerDown={(e: React.PointerEvent<HTMLDivElement>) => { e.preventDefault(); startHold(-step); }}
					onPointerUp={stopHold}
					onPointerLeave={stopHold}
					onPointerCancel={stopHold}
				>
					▼
				</div>
			</div>
		</div>
	);
}

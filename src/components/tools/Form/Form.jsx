import { useState, useEffect, useRef, useCallback } from "react";
import "./Form.css";

export default function Form({ init, min, max,  onChange, step = 1, places = 0, disabled = false, style={}, className="" }) {
	const [value, setValue] = useState(init);
	const [draft, setDraft] = useState(String(init));
	const [focus, setFocus] = useState(false);

	const inputRef = useRef(null);

	useEffect(() => {
		if (init !== undefined) {
			setValue(updateValue(init));
		}
	}, [init]);

	useEffect(() => {
		setDraft(String(value));
		onChange?.(value);
	}, [value]);

	useEffect(() => {
		if (!focus) inputRef.current.blur();
	}, [focus]);

	const updateValue = (newValue) => {
		newValue = Math.min(max, Math.max(min, newValue));
		newValue = Math.round(newValue / step) * step;
		newValue = newValue.toFixed(places);
		return newValue;
	};

	const commit = useCallback((off = 0) => {
		let num = parseFloat(draft);
		if (!isNaN(num)) {
			num = num + off;
			setValue(updateValue(num));
		} else {
			setDraft(String(value));
		}
	}, [draft, value]);

	const handleKeyDown = useCallback((e) => {
		if (disabled || !focus) return;
		if (e.key === "Enter") {
			setFocus(false);
		}
		if (e.key === "ArrowUp") {
			setValue(prev => updateValue(Number(prev) + step));
		}
		if (e.key === "ArrowDown") {
			setValue(prev => updateValue(Number(prev) - step));
		}
	}, [disabled, focus]);

	const handleClick = useCallback(() => {
		if (disabled) return;
		setFocus(true);
	}, [disabled]);

	const handleBlur = () => {
		commit();
	};

	const holdInterval = useRef(null);
	const holdTimeout = useRef(null);

	const startHold = (inc) => {
		if (disabled) return;
		setValue(prev => updateValue(Number(prev) + inc));
		holdTimeout.current = setTimeout(() => {
			holdInterval.current = setInterval(() => {
				setValue(prev => updateValue(Number(prev) + inc));
			}, 30);
		}, 500);
	};

	const stopHold = () => {
		clearTimeout(holdTimeout.current);
		clearInterval(holdInterval.current);
	};

	return (
		<div className={`customNumberInput ${disabled ? "disabled" : ""} ${className}`} style={style} onClick={handleClick} onBlur={handleBlur} >
			<input className="customNumberCaret" type="text" ref={inputRef} value={draft} onChange={e => setDraft(e.target.value)} onFocus={() => setFocus(true)} onKeyDown={handleKeyDown} />
			<div className="customNumberButtons">
				<div
					className="btn-up"
					onMouseDown={e => { e.preventDefault(); startHold(step);  }}
					onMouseUp={stopHold}
					onMouseLeave={stopHold}
					onTouchStart={e => { e.preventDefault(); startHold(step); }}
					onTouchEnd={stopHold}
				>
					▲
				</div>
				<div
					className="btn-down"
					onMouseDown={e => { e.preventDefault(); startHold(-step); }}
					onMouseUp={stopHold}
					onMouseLeave={stopHold}
					onTouchStart={e => { e.preventDefault(); startHold(-step); }}
					onTouchEnd={stopHold}
				>
					▼
				</div>
			</div>
		</div>
	);
}

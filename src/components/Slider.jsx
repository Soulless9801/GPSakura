import { useState, useRef, useEffect } from "react";
import "./Slider.css";

export default function Slider({ min, max, value, onChange, label, step = 1, disabled = false}) {
    const [internalValue, setInternalValue] = useState(value);
    const [inputValue, setInputValue] = useState(value);
    const trackRef = useRef(null);

    useEffect(() => {
        if (value !== undefined) {
            setInternalValue(value);
            setInputValue(value);
        }
    }, [value]);

    const percent = ((internalValue - min) / (max - min)) * 100;

    const updateValue = (newValue) => {
        newValue = Math.min(max, Math.max(min, newValue));
        newValue = Math.round(newValue / step) * step;
        newValue = newValue.toFixed(2); //subject to change
        setInputValue(newValue);
        if (onChange) onChange(newValue);
    };

    const handleMove = (e) => {
        if (disabled) return;
        const rect = trackRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        let newPercent = Math.min(Math.max(x / rect.width, 0), 1);
        let newValue = min + newPercent * (max - min);
        updateValue(newValue);
    };

    const startDrag = (e) => {
        e.preventDefault();
        handleMove(e);

        const move = (ev) => handleMove(ev);
        const stop = () => {
            window.removeEventListener("mousemove", move);
            window.removeEventListener("mouseup", stop);
        };

        window.addEventListener("mousemove", move);
        window.addEventListener("mouseup", stop);
    };


    const commitInput = () => {
        const parsed = parseFloat(inputValue);
        if (!isNaN(parsed)) {
            updateValue(parsed);
        } else {
            setInputValue(internalValue);
        }
    };

    const handleInputChange = (e) => {
        const raw = e.target.value;
        setInputValue(raw);
        const parsed = parseFloat(raw);
        if (!isNaN(parsed)){
            updateValue(parsed);
            setInputValue(String(Number(parsed)));
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter") {
            commitInput();
            e.target.blur();
        }
    };

    return (
        <div className="customSliderWrapper">
            <div className={`customSlider ${disabled ? " disabled" : ""}`}>
                <div className="customSliderRow">
                    <div className="customSliderLabel">
                        <span>{label}:</span>
                        <input
                            type="number"
                            className="customSliderForm"
                            value={inputValue}
                            min={min}
                            max={max}
                            step={step}
                            disabled={disabled}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            onBlur={commitInput}
                        />
                    </div>
                    <div className="customSliderTrackWrapper" onMouseDown={startDrag}>
                        <div className="customSliderTrack"  ref={trackRef}>
                            <div className="customSliderTrackActive" style={{ width: `${percent}%` }} />
                            <div className="customSliderTrackInactive" style={{ width: `${100 - percent}%` }} />
                        </div>
                        <div className="customSliderThumb" style={{ left: `${percent}%` }} />
                    </div>
                </div>
            </div>
        </div>
    );
}

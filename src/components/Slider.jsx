import { useState, useRef, useEffect } from "react";

import Form from './Form.jsx';

import "./Slider.css";

export default function Slider({ min, max, value, onChange, label, step = 1, places = 0, disabled = false}) {
    const [internalValue, setInternalValue] = useState(value);
    const trackRef = useRef(null);


    useEffect(() => {
        if (value !== undefined) {
            updateValue(value);
        }
    }, [value]);

    useEffect(() => {
        onChange?.(internalValue);
    }, [internalValue]);

    const percent = ((internalValue - min) / (max - min)) * 100;

    const updateValue = (newValue) => {
        newValue = Math.min(max, Math.max(min, newValue));
        newValue = Math.round(newValue / step) * step;
        newValue = newValue.toFixed(places);
        setInternalValue(newValue);
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

    return (
        <div className="customSliderWrapper">
            <div className={`customSlider ${disabled ? " disabled" : ""}`}>
                <div className="customSliderRow">
                    <div className="customSliderLabel">
                        <span>{label}:</span>
                        <Form init={internalValue} min={min} max={max} step={step}places={places} disabled={disabled} onChange={e => setInternalValue(e)} />
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

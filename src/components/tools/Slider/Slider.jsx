import { useState, useRef, useEffect, useCallback } from "react";

import Form from '/src/components/tools/Form/Form.jsx';

import "./Slider.css";

export default function Slider({ min, max, value, onChange, label, unit, step = 1, places = 0, disabled = false}) {
    
    const [internalValue, setInternalValue] = useState(value);
    const [percent, setPercent] = useState(((internalValue - min) / (max - min)) * 100);

    const trackRef = useRef(null);

    const updateValue = useCallback((newValue) => {
        newValue = Math.min(max, Math.max(min, newValue));
        newValue = Math.round(newValue / step) * step;
        newValue = newValue.toFixed(places);
        setInternalValue(newValue);
        setPercent(((newValue - min) / (max - min)) * 100);
    }, [min, max, step, places]);

    useEffect(() => {
        if (value !== undefined) {
            updateValue(value);
        }
    }, [value, updateValue]);

    useEffect(() => {
        onChange?.(internalValue);
    }, [internalValue]);

    const handleMove = useCallback((e) => {
        if (disabled) return;
        const rect = trackRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        let newPercent = Math.min(Math.max(x / rect.width, 0), 1);
        let newValue = min + newPercent * (max - min);
        updateValue(newValue);
        setPercent(newPercent * 100);
    }, [disabled, min, max, updateValue]);

    const startDrag = (e) => {
        e.preventDefault();
        handleMove(e);

        const move = (ev) => handleMove(ev);
        const stop = () => {
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", stop);
        };

        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", stop);
    };

    return (
        <div className="customSliderWrapper">
            <div className={`customSlider ${disabled ? " disabled" : ""}`}>
                <div className="customSliderRow">
                    <div className="customSliderLabel">
                        <span>{label}</span>
                        <Form init={internalValue} min={min} max={max} step={step}places={places} disabled={disabled} onChange={e => setInternalValue(e)} />
                        <span>{unit ? unit : ""}</span>
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

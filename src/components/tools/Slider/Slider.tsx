import { useState, useRef, useEffect, useCallback } from "react";

import { clampToStep } from "/src/utils/number";

import Form from '/src/components/tools/Form/Form';

import "./Slider.css";

interface SliderProps {
    min: number;
    max: number;
    value: number;
    onChange?: (value: number) => void;
    label?: string;
    unit?: string;
    step?: number;
    places?: number;
    disabled?: boolean;
    form?: boolean;
}

export default function Slider({ min, max, value, onChange, label, unit, step = 1, places = 0, disabled = false, form = true }: SliderProps) {
    
    const [internalValue, setInternalValue] = useState(() => clampToStep(value, min, max, step, places));
    const percent = max === min ? 0 : ((internalValue - min) / (max - min)) * 100;
    const stopDrag = useRef<(() => void) | null>(null);

    const trackRef = useRef<HTMLDivElement>(null);

    const updateValue = useCallback((newValue: number): void => {
        setInternalValue(clampToStep(newValue, min, max, step, places));
    }, [min, max, step, places]);

    useEffect(() => {
        updateValue(value);
    }, [value, updateValue]);

    useEffect(() => {
        onChange?.(internalValue);
    }, [internalValue]);

    const handleMove = useCallback((clientX: number): void => {
        if (disabled) {return;}
        const track = trackRef.current;
        if (!track) {return;}
        const rect = track.getBoundingClientRect();
        if (rect.width === 0) {return;}
        const x = clientX - rect.left;
        const newPercent = Math.min(Math.max(x / rect.width, 0), 1);
        const newValue = min + newPercent * (max - min);
        updateValue(newValue);
    }, [disabled, min, max, updateValue]);

    const startDrag = (e: React.PointerEvent<HTMLDivElement>): void => {
        if (disabled) {return;}
        stopDrag.current?.();
        e.preventDefault();
        handleMove(e.clientX);

        const move = (ev: PointerEvent): void => {
            handleMove(ev.clientX);
        };
        const stop = () => {
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", stop);
            window.removeEventListener("pointercancel", stop);
            stopDrag.current = null;
        };

        stopDrag.current = stop;
        window.addEventListener("pointercancel", stop);
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", stop);
    };

    useEffect(() => () => { stopDrag.current?.(); }, [handleMove]);

    return (
        <div className="customSliderWrapper">
            <div className={`customSlider ${disabled ? " disabled" : ""}`}>
                <div className="customSliderRow">
                    {form && (
                        <div className="customSliderLabel">
                            <span>{label}</span>
                            <Form init={internalValue} min={min} max={max} step={step} places={places} disabled={disabled} onChange={updateValue} />
                            <span>{unit ? unit : ""}</span>
                        </div>
                    )}
                    <div className="customSliderTrackWrapper" onPointerDown={startDrag}>
                        <div className="customSliderTrack"  ref={trackRef}>
                            <div className="customSliderTrackActive" style={{ width: `${String(percent)}%` }} />
                            <div className="customSliderTrackInactive" style={{ width: `${String(100 - percent)}%` }} />
                        </div>
                        <div className="customSliderThumb" style={{ left: `${String(percent)}%` }} />
                    </div>
                </div>
            </div>
        </div>
    );
}

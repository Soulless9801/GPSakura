import { useState, useRef, useEffect, useId } from "react";
import { findIndex } from "/src/utils/list";

import "./Select.css";

export interface SelectOption {
    value: string | number;
    label: string;
    to?: string;
}

interface SelectProps {
    options?: SelectOption[];
    defaultValue?: string | number;
    onChange: (option: SelectOption) => void;
    defaultIndex?: number;
    fixedSelect?: boolean;
    align?: "left" | "right";
    labelR?: string | null;
    labelL?: string | null;
    placeholder?: string;
    id?: string;
    className?: string;
}

export default function Select({ options = [], defaultValue, onChange, defaultIndex = 0, fixedSelect = false, align = "left", labelR = null, labelL = null, placeholder = "", id, className = "" }: SelectProps) {
    const [open, setOpen] = useState(false);
    const [value, setValue] = useState<SelectOption | null>(null);

    const ref = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const menuId = useId();

    const [hover, setHover] = useState(false);
    const [closed, setClosed] = useState(false);

    const handleSelect = (option: SelectOption): void => {
        onChange(option);
        setValue(option);
        setOpen(false);
        setHover(false);
        setClosed(false);
    };

    useEffect(() => {
        // console.log(defaultValue);
        const initialIndex = findIndex(defaultValue, options, defaultIndex);
        if (!fixedSelect && initialIndex >= 0 && initialIndex < options.length) { handleSelect(options[initialIndex]); }
        const handleClickOutside = (event: PointerEvent) => {
            if (ref.current && event.target instanceof Node && !ref.current.contains(event.target)) {
                setOpen(false);
                setHover(false);
                setClosed(false);
            }
        };
        document.addEventListener("pointerdown", handleClickOutside);
        return () => { document.removeEventListener("pointerdown", handleClickOutside); };
    }, []);

    const showMenu = open || (hover && !closed);

    return (
        <div className={`customSelectWrapper ${className}`} id={id}>
            {labelL && <label className="customSelectLabelR">{labelL}</label>}
            <div className="customSelect">
                <div ref={ref} onKeyDown={event => { if (event.key === "Escape") { setOpen(false); setHover(false); setClosed(true); triggerRef.current?.focus(); } }} onPointerEnter={event => { if (event.pointerType === "mouse") { setHover(true); } }} onPointerLeave={() => { setHover(false); setClosed(false); }}>
                    <button type="button" ref={triggerRef} aria-expanded={showMenu} aria-controls={menuId} className="customSelectSelected" onClick={() => { setClosed(open); setOpen((prev) => !prev); }}>
                        {fixedSelect ? placeholder : value?.label ?? placeholder}
                        <span className="customSelectArrow" aria-hidden="true">{showMenu ? "−" : "+"}</span>
                    </button>
                    <div className={`customSelectOptions${showMenu ? " show" : ""}${align === "right" ? " right" : ""}`} id={menuId}>
                        <div className="customSelectOptionsInner">
                            {options.map((option) => (
                                <button type="button" key={option.value} className={`customSelectOption${value?.value === option.value ? " selected" : ""}`} onClick={() => { handleSelect(option); }}>
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            {labelR && <label className="customSelectLabelL">{labelR}</label>}
        </div>
    );
};

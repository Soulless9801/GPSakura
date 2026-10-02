import { useState, useRef, useEffect } from "react";
import { findIndex } from "/src/utils/list";

import "./Select.css";

export interface SelectOption {
    value: string;
    label: string;
    to?: string;
}

interface SelectProps {
    options?: SelectOption[];
    defaultValue?: string;
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

export default function Select({ options = [], defaultValue, onChange, defaultIndex = 0, fixedSelect = false, align = "left", labelR = null, labelL = null, placeholder = "" }: SelectProps) {
    const [open, setOpen] = useState(false);
    const [value, setValue] = useState({ value: '1', label: '1' });

    const ref = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    const [hover, setHover] = useState(false);
    const [closed, setClosed] = useState(false);

    const handleSelect = (option) => {
        onChange(option);
        setValue(option);
        setOpen(false);
        setHover(false);
        setClosed(false);
    };

    useEffect(() => {
        // console.log(defaultValue);
        if (!fixedSelect) {handleSelect(options[findIndex(defaultValue, options, defaultIndex)]);}
        const handleClickOutside = (event: PointerEvent) => {
            if (ref.current && !ref.current.contains(event.target)) {
                setOpen(false);
                setClosed(false);
            }
        };
        document.addEventListener("pointerdown", handleClickOutside);
        return () => { document.removeEventListener("pointerdown", handleClickOutside); };
    }, []);

    const [showMenu, setShowMenu] = useState(false);

    useEffect(() => {
        setShowMenu(open || hover && !closed);
    }, [open, hover]);

    return (
        <div className="customSelectWrapper">
            {labelL && <label className="customSelectLabelR">{labelL}</label>}
            <div className="customSelect">
                <div ref={ref} onMouseEnter={() => { setHover(true); }} onMouseLeave={() => {setHover(false); setClosed(false);}}>
                    <div className="customSelectSelected" onClick={() => {setClosed(open); setOpen((prev) => !prev);}}>
                        {fixedSelect ? placeholder : value.label}
                        <span className="customSelectArrow">{open ? "↑" : "↓"}</span>
                    </div>
                    <div className={`customSelectOptions${showMenu ? " show" : ""}${align === "right" ? " right" : ""}`} ref={menuRef}>
                        {options.map((option) => (
                            <div key={option.value} className={`customSelectOption${value && value.value === option.value ? " selected" : ""}`} onClick={() => { handleSelect(option); }}>
                                {option.label}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            {labelR && <label className="customSelectLabelL">{labelR}</label>}
        </div>
    );
};
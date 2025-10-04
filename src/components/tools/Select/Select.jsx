import { useState, useRef, useEffect } from "react";
import "./Select.css";

function findIndex(val, list, defaultIndex) {
    const idx = list.findIndex(item => item.value === String(val));
    return idx !== -1 ? idx : defaultIndex;
}

export default function Select({ options = [], defaultValue, onChange, defaultIndex=0, fixedSelect=false, align="left", placeholder="Select an option" }) {
    const [open, setOpen] = useState(false);
    const [value, setValue] = useState({ value: '1', label: '1' });

    const ref = useRef();
    const menuRef = useRef();

    const [hover, setHover] = useState(false);

    const handleSelect = (option) => {
        onChange(option);
        setValue(option);
        setOpen(false);
        setHover(false);
    };

    useEffect(() => {
        console.log(defaultValue);
        if (!fixedSelect) handleSelect(options[findIndex(defaultValue, options, defaultIndex)]);
        const handleClickOutside = (event) => {
            if (ref.current && !ref.current.contains(event.target)) {
                setOpen(false);
            }
        };
        document.addEventListener("pointerdown", handleClickOutside);
        return () => document.removeEventListener("pointerdown", handleClickOutside);
    }, []);

    const [showMenu, setShowMenu] = useState(false);

    useEffect(() => {
        setShowMenu(open || hover);
    }, [open, hover]);

    return (
        <div className="customSelect">
            <div ref={ref} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
                <div className="customSelectSelected" onClick={() => setOpen((prev) => !prev)}>
                    {fixedSelect ? placeholder : value.label}
                    <span className="customSelectArrow">{open ? "↑" : "↓"}</span>
                </div>
                <div className={`customSelectOptions${showMenu ? " show" : ""}${align === "right" ? " right" : ""}`} ref={menuRef}>
                    {options.map((option) => (
                        <div key={option.value} className={`customSelectOption${value && value.value === option.value ? " selected" : ""}`} onClick={() => handleSelect(option)}>
                            {option.label}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
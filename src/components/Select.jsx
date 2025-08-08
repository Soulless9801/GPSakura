import { useState, useRef, useEffect } from "react";
import "./Select.css";

export default function Select({ options = [], defaultIndex, onChange, fixedSelect=false, align="left", placeholder="Select an option" }) {
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
        if (!fixedSelect) handleSelect(options[Number(defaultIndex)]);
        const handleClickOutside = (event) => {
            if (ref.current && !ref.current.contains(event.target)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const [showMenu, setShowMenu] = useState(false);

    useEffect(() => {
        setShowMenu(open || hover);
    }, [open, hover]);

    return (
        <div className="custom-select">
            <div className="custom-select__container" ref={ref} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
                <div className="custom-select__selected" onClick={() => setOpen((prev) => !prev)}>
                    {fixedSelect ? placeholder : value.label}
                    <span className="custom-select__arrow">{open ? "↑" : "↓"}</span>
                </div>
                <div className={`custom-select__options${showMenu ? " show" : ""}${align === "right" ? " right" : ""}`} ref={menuRef}>
                    {options.map((option) => (
                        <div key={option.value} className={`custom-select__option${value && value.value === option.value ? " selected" : ""}`} onClick={() => handleSelect(option)}>
                            {option.label}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
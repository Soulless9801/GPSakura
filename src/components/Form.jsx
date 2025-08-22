import { useState, useEffect, useRef } from "react";
import "./Form.css";

export default function Form({ init, min, max,  onChange, step = 1, places = 0 ,disabled = false }) {
  const [value, setValue] = useState(init);
  const [draft, setDraft] = useState(String(init));
  const [focus, setFocus] = useState(false);

  const inputRef = useRef(null);

  useEffect(() => {
    if (init !== undefined) {
      updateValue(init);
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
    setValue(newValue);
  };

  const commit = (raw, off = 0) => {
    let num = parseFloat(raw);
    if (!isNaN(num)) {
      num = num + off;
      updateValue(num);
    }
    setDraft(String(value));
  };

  const handleKeyDown = (e) => {
    if (disabled || !focus) return;
    if (e.key === "Enter") {
      setFocus(false);
    }
    if (e.key === "ArrowUp") {
      commit(draft, step);
    }
    if (e.key === "ArrowDown") {
      commit(draft, -step);
    }
  };

  const handleClick = () => {
    if (disabled) return;
    setFocus(true);
  };

  const handleBlur = () => {
    setFocus(false);
    commit(draft);
  };

  return (
    <div className={`customNumberInput ${disabled ? "disabled" : ""}`} tabIndex={0} onClick={handleClick} onKeyDown={handleKeyDown} onBlur={handleBlur}>
      <input className="customNumberCaret" type="text" ref={inputRef} value={draft} onChange={e => setDraft(e.target.value)} onFocus={() => setFocus(true)} onBlur={handleBlur}/>
      <div className="customNumberButtons">
        <div className="btn-up" onMouseDown={(e) => { e.preventDefault(); commit(draft, step); setFocus(false); }}>
          ▲
        </div>
        <div className="btn-down" onMouseDown={(e) => { e.preventDefault(); commit(draft, -step); setFocus(false); }}>
          ▼
        </div>
      </div>
    </div>
  );
}

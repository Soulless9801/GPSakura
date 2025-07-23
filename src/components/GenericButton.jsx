import { useState, useEffect } from 'react';

import './GenericButton.css'

export default function GenericButton({ postId, type, icon, onToggle }) {

    const storageKey = `${type}_${postId}`;

    const [state, setState] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem(storageKey);
        setState(stored === 'true');
    }, [storageKey]);

    const handleClick = async () => {
        const newState = !state;
        onToggle(newState.toString());
        setState(newState);
        localStorage.setItem(storageKey, newState.toString());
    };

    return (
        <button onClick={handleClick} className="genericButton">
            <i className={`${icon} ${state ? 'fa-solid' : 'fa-regular'}`} />
        </button>
    );
}



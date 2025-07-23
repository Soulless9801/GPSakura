import { useState, useEffect } from 'react';

import './GenericButton.css'

export default function GenericButton({ postId, type, icon, onToggle=null }) {

    const storageKey = `${type}_${postId}`;

    const [state, setState] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem(storageKey);
        setState(stored === 'true');
    }, []);

    const handleClick = async () => {
        const newState = !state;
        setState(newState);
        localStorage.setItem(storageKey, newState.toString());
        if (newState !== state) {
            onToggle();
        }
    };

    return (
        <button onClick={handleClick} className="genericButton">
            <i className={`${icon} ${state ? 'fa-solid' : 'fa-regular'}`} />
        </button>
    );
}



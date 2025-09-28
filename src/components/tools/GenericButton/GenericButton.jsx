import { useState, useEffect } from 'react';

import './GenericButton.css'

export default function GenericButton({ postId, type, icon, fill }) {

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
    };

    return (
        <button onClick={handleClick} className="genericButton">
            <i className={`genericIcon ${icon} ${state ? 'fa-solid' : 'fa-regular'}`} style={{ '--icon-hover-color': fill, '--icon-active-color': fill }}/>
        </button>
    );
}



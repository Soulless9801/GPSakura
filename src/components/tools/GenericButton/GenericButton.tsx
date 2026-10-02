import { useState, useEffect } from 'react';
import type { CSSProperties } from 'react';

import './GenericButton.css'

interface GenericButtonProps {
    postId: string | number;
    type: string;
    icon: string;
    fill: string;
}

export default function GenericButton({ postId, type, icon, fill }: GenericButtonProps) {

    const storageKey = `${type}_${postId}`;
    const iconStyle = {
        '--icon-hover-color': fill,
        '--icon-active-color': fill,
    } as CSSProperties;

    const [state, setState] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem(storageKey);
        setState(stored === 'true');
    }, []);

    const handleClick = () => {
        const newState = !state;
        setState(newState);
        localStorage.setItem(storageKey, newState.toString());
    };

    return (
        <button onClick={handleClick} className="genericButton">
            <i className={`genericIcon ${icon} ${state ? 'fa-solid' : 'fa-regular'}`} style={iconStyle}/>
        </button>
    );
}



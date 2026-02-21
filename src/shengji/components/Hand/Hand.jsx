import { useState, useEffect } from "react";
import { motion } from 'framer-motion';

import Card from '/src/shengji/components/Card/Card';

import './Hand.css';

import * as ShengJiCore from "/src/shengji/core/entities";

function computeLayout(cards){

    if (!cards || cards.length === 0) return null;

    const overlap = 24;

    return cards.map((card, i) => ({
        x: i * overlap,
        y: 0,
        rotation: 0,
        scale: 1,
        z: i
    }));
}

export default function Hand({ cards, className = "" }) {

    const [layout, setLayout] = useState(null);

    const [active, setActive] = useState([]);

    useEffect(() => {
        setLayout(computeLayout(cards));
        setActive([]);
    }, [cards]);

    const handleClick = (card, isActive) => {
        setActive(prev => {
            if (isActive) return [...prev, card];
            else {
                const idx = prev.findIndex(c => ShengJiCore.isCardEqual(c, card));
                if (idx === -1) return prev;
                prev.splice(idx, 1);
                return [...prev];
            };
        });
    };

	return (
        <>
            <div><p>Selected Cards: {active.length}</p></div>
            <div className={`sj-hand ${className}`.trim()}>
                {cards.map((card, index) => {
                    if (!layout || !layout[index]) return null;
                    return (
                        <motion.div
                            key={index}
                            animate={{
                                x: layout[index].x,
                                y: layout[index].y,
                                rotate: layout[index].rotation,
                                scale: layout[index].scale
                            }}
                            transition={{
                                duration: 0 // no animation, modify later 
                            }}
                            style={{ zIndex: layout[index].z }}
                            
                        >

                            <Card card={card} onClick={(c, a) => handleClick(c, a)}/>

                        </motion.div>
                    )
                })}
            </div>
        </>
	);
}

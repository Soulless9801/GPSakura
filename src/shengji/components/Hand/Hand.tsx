import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { motion } from 'framer-motion';

import Card from '/src/shengji/components/Card/Card';

import './Hand.css';

import * as ShengJiCore from "/src/shengji/core/entities";

interface CardLayout {
    x: number;
    y: number;
    rotation: number;
    scale: number;
    z: number;
}

function computeLayout(cards: ShengJiCore.Card[]): CardLayout[] | null {

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

interface HandProps {
    cards: ShengJiCore.Card[];
    className?: string;
}

export interface HandRef {
    getActiveCards: () => ShengJiCore.Card[];
}

const Hand = forwardRef<HandRef, HandProps>(function Hand({ cards, className = "" }, ref) {

    const [layout, setLayout] = useState<CardLayout[] | null>(null);

    const [active, setActive] = useState<ShengJiCore.Card[]>([]);

    useImperativeHandle(ref, () => ({
        getActiveCards: () => active
    }));

    useEffect(() => {
        setLayout(computeLayout(cards));
        setActive([]);
    }, [cards]);

    const handleClick = (card: ShengJiCore.Card, isActive: boolean) => {
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
        <div className={`${className}`.trim()}>
            <div className="sj-hand">
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
                            {/* @ts-ignore - Card is JSX without proper types */}
                            <Card card={card} onClick={handleClick}/>

                        </motion.div>
                    )
                })}
            </div>
        </div>
	);
});

export default Hand;

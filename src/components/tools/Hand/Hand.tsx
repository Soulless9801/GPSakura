import { useState, useEffect, forwardRef, useImperativeHandle, useCallback } from "react";
import { motion } from 'framer-motion';

import Card from '/src/components/tools/Card/Card';

import './Hand.css';

import * as CardCore from "/src/entities/card";

interface CardLayout {
    x: number;
    y: number;
    rotation: number;
    scale: number;
    z: number;
}

function computeLayout(cards: CardCore.Card[]): CardLayout[] | null {

    if (!cards || cards.length === 0) return null;

    const overlap = 24;

    return cards.map((_, i) => ({
        x: i * overlap,
        y: 0,
        rotation: 0,
        scale: 1,
        z: i
    }));

}

interface HandProps {
    cards: CardCore.Card[];
    className?: string;
}

export interface HandRef {
    getActiveCards: () => CardCore.Card[];
}

const Hand = forwardRef<HandRef, HandProps>(function Hand({ cards, className = "" }, ref) {

    const [layout, setLayout] = useState<CardLayout[] | null>(null);

    const [bactive, setBactive] = useState<boolean[]>([]);

    const computeActiveCards = () => {
        if (bactive.length !== cards.length) return [];
        // console.log("Active: ", cards.filter((_, index) => bactive[index]));
        return cards.filter((_, index) => bactive[index]);
    }

    useImperativeHandle(ref, () => ({
        getActiveCards: () => computeActiveCards()
    }));

    useEffect(() => {
        setLayout(computeLayout(cards));
        setBactive(new Array(cards?.length || 0).fill(false));
        // console.log("Cards received by Hand: ", cards);
    }, [cards]);

    const handleClick = useCallback((index: number, active: boolean) => {
        setBactive(prev => {
            if (index < 0 || index >= prev.length) return prev;
            prev[index] = active;
            return [...prev];
        });
    }, []);

    return (
        <div className={`card-hand__wrapper${className}`.trim()}>
            <div className="card-hand">
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
                            <Card card={card} pos={index} onClick={handleClick}/>

                        </motion.div>
                    )
                })}
            </div>
        </div>
    );
});

export default Hand;

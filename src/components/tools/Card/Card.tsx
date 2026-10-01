import { useState, useCallback, useEffect } from "react";

import * as CardModule from '/src/entities/card';

import "./Card.css";


interface CardProps {
	card: CardModule.Card | null;
	pos?: number;
	className?: string;
	onClick?: ((index: number, active: boolean) => void) | null;
}

export default function Card({ card, pos = -1, className = "", onClick = null }: CardProps) {

	const [active, setActive] = useState(false);

	useEffect(() => {
		setActive(false);
	}, [card]);

	const handleClick = useCallback(() => {
		const nactive = !active;
		setActive(nactive);
		if (onClick && card) {onClick(pos, nactive);}
	}, [active, onClick, card]);

	if (!card) {return null;}

	const red = CardModule.isRed(card);

	const rank = CardModule.rankLabel(card);
	const suit = CardModule.SUIT_GLYPH[card.suit] || "?";

	return (
		<button
			className={`sj-card ${red ? "sj-card__red" : "sj-card__black"} ${className} ${active ? "selected" : ""}`.trim()}
			aria-label={`${rank}${card.suit}`}
			onClick={handleClick}
		>
			<section className="sj-card__corner">
				<section className="sj-card__rank">{rank}</section>
				<section className="sj-card__suit">{suit}</section>
			</section>
			<section className="sj-card__center">
				<section className="sj-card__suit">{suit}</section>
			</section>
			<section className="sj-card__corner sj-card__corner--rot">
				<section className="sj-card__rank">{rank}</section>
				<section className="sj-card__suit">{suit}</section>
			</section>
		</button>
	);
}

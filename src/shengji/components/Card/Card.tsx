import { useState, useCallback, useEffect } from "react";

import { Card as CardType } from "/src/shengji/core/entities";

import "./Card.css";

const suitToEntity: Record<string, string> = {
	spades: "\u2660",
	hearts: "\u2665",
	diamonds: "\u2666",
	clubs: "\u2663",
	jokers: "王"
};

const rankToLabel: Record<number, string> = {
	11: "J",
	12: "Q",
	13: "K",
	14: "A",
};

interface CardProps {
	card: CardType | null;
	className?: string;
	onClick?: ((card: CardType, active: boolean) => void) | null;
}

export default function Card({ card, className = "", onClick = null }: CardProps) {

	const [active, setActive] = useState(false);

	useEffect(() => {
		setActive(false);
	}, [card]);

	const handleClick = useCallback(() => {
		const nactive = !active;
		setActive(nactive);
		if (onClick && card) onClick(card, nactive);
	}, [active, onClick, card]);

	if (!card) return null;

	const isJoker = card.suit === "jokers";
	const isRed = card.suit === "hearts" || card.suit === "diamonds" || (isJoker && card.rank === 2);

	const rank = isJoker ? (card.rank === 2 ? "大" : "小") : rankToLabel[card.rank] || String(card.rank);
	const suit = suitToEntity[card.suit] || "?";

	return (
		<button
			className={`sj-card ${isRed ? "sj-card__red" : "sj-card__black"} ${className} ${active ? "selected" : ""}`.trim()}
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

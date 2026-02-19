import { useState, useCallback, useEffect } from "react";
import * as ShengJiCore from "/src/shengji/core/entities";

import "./Card.css";

const suitToEntity = {
	spades: "\u2660",
	hearts: "\u2665",
	diamonds: "\u2666",
	clubs: "\u2663",
	jokers: "王"
};

const rankToLabel = {
	11: "J",
	12: "Q",
	13: "K",
	14: "A",
};

export default function Card({ card, className = "", onClick = null }) {

	if (!card) return null;

	const isJoker = card.suit === "jokers";
	const isRed = card.suit === "hearts" || card.suit === "diamonds" || (isJoker && card.rank === 2);

	const rank = isJoker ? (card.rank === 2 ? "大" : "小") : rankToLabel[card.rank] || String(card.rank);
	const suit = suitToEntity[card.suit] || "?";

	const [active, setActive] = useState(false);

	useEffect(() => {
		setActive(false);
	}, [card]);

	const handleClick = useCallback(() => {
		const isActive = !active;
		if (onClick) onClick(card, isActive);
		setActive(isActive);
	}, [onClick]);

	return (
		<button
			className={`sj-card ${isRed ? "sj-card--red" : "sj-card--black"} ${className} ${active ? "selected" : ""}`.trim()}
			aria-label={`${rank}${card.suit}`}
			onClick={handleClick}
		>
			<div className="sj-card__corner">
				<div className="sj-card__rank">{rank}</div>
				<div className="sj-card__suit">{suit}</div>
			</div>
			<div className="sj-card__center">
				<div className="sj-card__suit">{suit}</div>
			</div>
			<div className="sj-card__corner sj-card__corner--rot">
				<div className="sj-card__rank">{rank}</div>
				<div className="sj-card__suit">{suit}</div>
			</div>
		</button>
	);
}

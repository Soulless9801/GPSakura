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
		setActive(active => !active);
	}, [onClick]);

	useEffect(() => {
		if (onClick) onClick(card, active);
	}, [active, card, onClick]);

	return (
		<button
			className={`sj-card ${isRed ? "sj-card--red" : "sj-card--black"} ${className} ${active ? "selected" : ""}`.trim()}
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

import * as ShengJiCore from "/src/shengji/core/entities";

const suitToEntity = {
	spades: "\u2660",
	hearts: "\u2665",
	diamonds: "\u2666",
	clubs: "\u2663",
	jokers: "J",
};

const rankToLabel = {
	11: "J",
	12: "Q",
	13: "K",
	14: "A",
};

export default function Card({ card, className = "" }) {
	if (!card) return null;

	const rank = rankToLabel[card.rank] || String(card.rank);
	const suit = suitToEntity[card.suit] || "?";

	const isRed = card.suit === "hearts" || card.suit === "diamonds";
	const isJoker = card.suit === "jokers";

	return (
		<div
			className={`sj-card ${isRed ? "sj-card--red" : "sj-card--black"} ${isJoker ? "sj-card--joker" : ""} ${className}`.trim()}
			aria-label={`${rank}${card.suit}`}
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
		</div>
	);
}

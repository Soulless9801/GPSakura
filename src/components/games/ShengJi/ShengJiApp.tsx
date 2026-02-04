import * as ShenJiCore from '/src/shengji/core/entities.ts';


export default function ShengJiApp() {

    const nine_of_hearts : ShenJiCore.Card = { suit: "hearts", rank: 9 };
    const ten_of_hearts : ShenJiCore.Card = { suit: "hearts", rank: 10 };
    const jack_of_hearts : ShenJiCore.Card = { suit: "hearts", rank: 11 };
    const nine_of_spades : ShenJiCore.Card = { suit: "spades", rank: 9};
    const ten_of_spades : ShenJiCore.Card = { suit: "spades", rank: 10};
    const jack_of_spades : ShenJiCore.Card = { suit: "spades", rank: 11 };
    const big_joker : ShenJiCore.Card = { suit: "jokers", rank: 2};
    const small_joker : ShenJiCore.Card = { suit: "jokers", rank: 1}
    const ace_of_spades : ShenJiCore.Card = { suit: "spades", rank: 14 };

    const lead : ShenJiCore.Play = { kind: "tractor", cards: [ace_of_spades, ace_of_spades, ace_of_spades, jack_of_hearts, jack_of_hearts, jack_of_hearts, jack_of_spades, jack_of_spades, jack_of_spades, small_joker, small_joker, small_joker], suit: "spades" };
    const play : ShenJiCore.Play = { kind: "tractor", cards: [jack_of_spades, jack_of_spades, jack_of_spades, ten_of_spades, ten_of_spades, ten_of_hearts, small_joker, small_joker, small_joker, big_joker, big_joker, big_joker], suit: "spades" };

    const trump : ShenJiCore.Trump = { suit: "spades", rank: 11 };

    let hand : ShenJiCore.Hand = ShenJiCore.initializeHand();

    ShenJiCore.addCardToHand(ten_of_spades, hand);
    ShenJiCore.addCardToHand(ten_of_spades, hand);
    ShenJiCore.addCardToHand(ten_of_spades, hand);
    ShenJiCore.addCardToHand(ten_of_hearts, hand);
    ShenJiCore.addCardToHand(jack_of_hearts, hand);
    ShenJiCore.addCardToHand(jack_of_hearts, hand);
    ShenJiCore.addCardToHand(jack_of_spades, hand);
    ShenJiCore.addCardToHand(jack_of_spades, hand);
    ShenJiCore.addCardToHand(jack_of_spades, hand);
    ShenJiCore.addCardToHand(small_joker, hand);
    ShenJiCore.addCardToHand(small_joker, hand);
    ShenJiCore.addCardToHand(small_joker, hand);
    ShenJiCore.addCardToHand(big_joker, hand);
    ShenJiCore.addCardToHand(big_joker, hand);
    ShenJiCore.addCardToHand(big_joker, hand);

    // console.log(hand);

    return (
        <>
            <p>
                Lead: {ShenJiCore.playToString(lead)}
            </p>
            <p>
                Play: {ShenJiCore.playToString(play)}
            </p>
            <p>
                Hand: {ShenJiCore.handToString(hand)}
            </p>
            <p>
                Trump: {ShenJiCore.cardToString({ suit: trump.suit, rank: trump.rank })}
            </p>
            <p>
                Is play valid? {ShenJiCore.isPlayValid(play, lead, hand, trump) ? "Yes" : "No"}
            </p>
            {ShenJiCore.isPlayValid(play, lead, hand, trump) &&
                <p>
                    Is play bigger? {ShenJiCore.isPlayBigger(play, lead, trump) ? "Yes" : "No"}
                </p>
            }
        </>
    );
}
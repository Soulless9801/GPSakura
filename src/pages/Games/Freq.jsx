import PageTitle from '/src/components/tools/PageTitle/PageTitle.jsx';
import FreqGuesserDemo from '/src/components/games/FreqGuesser/FreqGuesserDemo.jsx';

export default function Freq() {
    return (
        <>
            <PageTitle title="Frequency" description="Guess the signal"/>
            <FreqGuesserDemo />
        </>
    );
}

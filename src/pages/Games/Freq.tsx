import PageTitle from '/src/components/tools/PageTitle/PageTitle';
import FreqGuesserDemo from '/src/components/games/FreqGuesser/FreqGuesserDemo';

export default function Freq() {
    return (
        <>
            <PageTitle title="Frequency" description="Guess the signal"/>
            <FreqGuesserDemo />
        </>
    );
}

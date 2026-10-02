import PageTitle from '/src/components/tools/PageTitle/PageTitle';
import GameOfLifeDemo from '/src/components/experiments/GameOfLife/GameOfLifeDemo';

export default function CellAutomata() {
    return (
        <>
            <PageTitle title="Cellular Automata" description="Conway's Game of Life"/>
            <GameOfLifeDemo />
        </>
    );
}

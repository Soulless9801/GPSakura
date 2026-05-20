import PageTitle from '/src/components/tools/PageTitle/PageTitle.jsx';
import GameOfLifeDemo from '/src/components/experiments/GameOfLife/GameOfLifeDemo.jsx';

export default function CellAutomata() {
    return (
        <>
            <PageTitle title="Cellular Automata" description="Conway's Game of Life"/>
            <GameOfLifeDemo />
        </>
    );
}

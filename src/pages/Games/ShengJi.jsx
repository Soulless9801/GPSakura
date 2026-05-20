import PageTitle from '/src/components/tools/PageTitle/PageTitle.jsx';
import ShengJiApp from '/src/components/games/ShengJi/ShengJiApp.tsx';

export default function ShengJi() {
    return (
        <>
            <PageTitle title="ShengJi" description="Multiplayer card game"/>
            <ShengJiApp />
        </>
    );
}

import PageTitle from '/src/components/tools/PageTitle/PageTitle.jsx';
import BJApp from '/src/components/games/BJ/BJApp.jsx';

export default function BlackJack() {
    return (
        <>
            <PageTitle title="Black Jack" description="hit on 20"/>
            <BJApp />
        </>
    );
}

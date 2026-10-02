import PageTitle from '/src/components/tools/PageTitle/PageTitle';

import BJApp from '/src/components/games/BJ/BJApp';

export default function BlackJack() {
    return (
        <>
            <PageTitle title="Black Jack" description="hit on 20"/>
            <BJApp />
        </>
    );
}

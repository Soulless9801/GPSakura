import PageTitle from '/src/components/tools/PageTitle/PageTitle.jsx';
import Advisor from '/src/components/games/ShengJi/Advisor/Advisor.tsx';

export default function ShengJiAdvisor() {
    return (
        <>
            <PageTitle title="升级" description="Put down what everyone else played. It tells you what to play."/>
            <Advisor />
        </>
    );
}

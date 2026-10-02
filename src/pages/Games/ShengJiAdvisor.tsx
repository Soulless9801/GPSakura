import PageTitle from '/src/components/tools/PageTitle/PageTitle';
import Advisor from '/src/components/games/ShengJi/Advisor/Advisor.tsx';

export default function ShengJiAdvisor() {
    return (
        <>
            <PageTitle title="升级" description="Anyone could be the quads user"/>
            <Advisor />
            <div style={{ textAlign: 'center', fontSize: '0.8rem', padding: '0.8rem' }}>
                Credits: <a href="https://github.com/EthereumEthan" target="_blank" rel="noopener noreferrer">EthereumEthan</a>
            </div>
        </>
    );
}

import './PageTitle.css'

interface PageTitleProps {
	title: string;
	description: string;
}

export default function PageTitle({title, description}: PageTitleProps) {
	return (
		<section className="container-fluid pageIntroContainer">
			<div className="pageTitle">{title}</div>
			<div className="pageDescript">{description}</div>
			<hr className="pageIntroDiv"/>
		</section>
	);
}
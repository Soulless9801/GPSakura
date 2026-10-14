import './PageTitle.css'

interface PageTitleProps {
	title: string;
	description: string;
}

export default function PageTitle({title, description}: PageTitleProps) {
	return (
		<section className="pageIntroContainer">
			<h1 className="pageTitle">{title}</h1>
			<p className="pageDescript">{description}</p>
			<hr className="pageIntroDiv"/>
		</section>
	);
}
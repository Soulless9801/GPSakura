import './PageTitle.css'

export default function PageTitle({title, description}) {
	return (
		<section className="container-fluid pageIntroContainer">
			<div className="pageTitle">{title}</div>
			<div className="pageDescript">{description}</div>
			<hr className="pageIntroDiv"/>
		</section>
	);
}
import PageTitle from '/src/components/tools/PageTitle/PageTitle.jsx';
import ColorPickerDemo from '/src/components/games/ColorPicker/ColorPickerDemo.jsx';

export default function Color() {
    return (
        <>
            <PageTitle title="Color" description="Color picker game"/>
            <ColorPickerDemo />
        </>
    );
}

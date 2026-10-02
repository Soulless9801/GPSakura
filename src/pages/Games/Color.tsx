import PageTitle from '/src/components/tools/PageTitle/PageTitle';
import ColorPickerDemo from '/src/components/games/ColorPicker/ColorPickerDemo';

export default function Color() {
    return (
        <>
            <PageTitle title="Color" description="Color picker game"/>
            <ColorPickerDemo />
        </>
    );
}

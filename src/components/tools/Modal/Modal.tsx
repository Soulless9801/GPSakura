import { useState, useEffect, type CSSProperties, type ReactNode } from "react";

import TextParser from '/src/components/tools/TextParser/TextParser';

import "./Modal.css";

interface ModalContentProps {
    open: boolean;
    onClose: () => void;
    onExited: () => void;
    children: ReactNode;
    scrollable?: boolean;
}

function ModalContent({ open, onClose, onExited, children, scrollable = true }: ModalContentProps) {

    useEffect(() => {
        document.body.style.overflow = open ? "hidden" : "";
    }, [open]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent): void => {
            if (e.key === "Escape") {onClose();}
        };
        window.addEventListener("keydown", onKey);
        return () => { window.removeEventListener("keydown", onKey); };
    }, [onClose]);


    useEffect(() => {
        if (!open) {
            const timer = setTimeout(onExited, 300); // should match CSS transition duration
            return () => { clearTimeout(timer); };
        }
    }, [open, onExited]);

    return (
        <section className={`modalRoot ${open ? "open" : ""}`} aria-hidden={!open}>
            <div className="modalBackdrop" onClick={onClose} />

            <div
                className={`modalPanel ${scrollable ? "scrollable" : "nonScrollable"}`}
                onClick={(e: React.MouseEvent<HTMLDivElement>) => { e.stopPropagation(); }}
            >
                <button className="modalClose" onClick={onClose}>✕</button>
                {children}
            </div>
        </section>
    );
}

interface ModalProps {
    id?: string;
    title: ReactNode;
    description: ReactNode;
    buttonText: ReactNode;
    buttonStyle?: CSSProperties;
    buttonClassName?: string;
    scrollable?: boolean;
}

export default function Modal({ title, description, buttonText, buttonStyle = {}, buttonClassName = "", scrollable = true }: ModalProps) {
    const [open, setOpen] = useState(false);

    const openModal = () => {
        requestAnimationFrame(() => { setOpen(true); });
    };

    const closeModal = () => {
        setOpen(false);
    };

    return (
        <>
            <button style={buttonStyle} className={buttonClassName} onClick={openModal}>{buttonText}</button>

            <ModalContent
                open={open}
                onClose={closeModal}
                onExited={closeModal}
                scrollable={scrollable}
            >
                <h2 style={{textAlign: "start"}}>{title}</h2>
                <br/>
                <div>{typeof description === "string" ? <TextParser text={description} /> : description}</div>
            </ModalContent>
        </>
    );
}


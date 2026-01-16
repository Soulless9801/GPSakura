import { useState, useEffect } from "react";

import TextParser from '/src/components/tools/TextParser/TextParser.jsx';

import "./Modal.css";

function ModalContent({ open, onClose, onExited, children }) {

    useEffect(() => {
        document.body.style.overflow = open ? "hidden" : "";
    }, [open]);

    useEffect(() => {
        const onKey = e => e.key === "Escape" && onClose();
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);


    useEffect(() => {
        if (!open) {
            const timer = setTimeout(onExited, 250); // should match CSS transition duration
            return () => clearTimeout(timer);
        }
    }, [open, onExited]);

    return (
        <section className={`modalRoot ${open ? "open" : ""}`} aria-hidden={!open}>
            <div className="modalBackdrop" onClick={onClose} />

            <div className="modalPanel">
                <button className="modalClose" onClick={onClose}>✕</button>
                {children}
            </div>
        </section>
    );
}

export default function Modal({title, description, buttonText, buttonStyle={}, buttonClassName=""}) {
    const [open, setOpen] = useState(false);

    const openModal = () => {
        requestAnimationFrame(() => setOpen(true));
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
            >
                <h2 style={{textAlign: "start"}}>{title}</h2>
                <br/>
                <div>{typeof description === "string" ? <TextParser text={description} /> : description}</div>
            </ModalContent>
        </>
    );
}


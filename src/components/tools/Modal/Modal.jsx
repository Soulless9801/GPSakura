import { useState, useEffect } from "react";

import TextParser from '/src/components/tools/TextParser/TextParser.jsx';

import "./Modal.css";

function ModalContent({ open, onClose, onExited, children }) {

    useEffect(() => {
        document.body.style.overflow = "hidden";
        return () => document.body.style.overflow = "";
    }, []);

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
        <div className={`modalRoot ${open ? "open" : ""}`}>
            <div className="modalBackdrop" onClick={onClose} />

            <div className="modalPanel">
                <button className="modalClose" onClick={onClose}>✕</button>
                {children}
            </div>
        </div>
    );
}

export default function Modal({title, description, buttonText}) {
    const [open, setOpen] = useState(false);
    const [mounted, setMounted] = useState(false);

    const openModal = () => {
        setMounted(true);
        requestAnimationFrame(() => setOpen(true));
    };

    const closeModal = () => {
        setOpen(false);
    };

    return (
        <>
            <button onClick={openModal}>{buttonText}</button>

            {mounted && (
                <ModalContent
                    open={open}
                    onClose={closeModal}
                    onExited={() => setMounted(false)}
                >
                    <h2>{title}</h2>
                    <div><TextParser text={description} /></div>
                </ModalContent>
            )}
        </>
    );
}


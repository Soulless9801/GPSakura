// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import GenericButton from "./GenericButton";

describe("GenericButton", () => {
    beforeEach(() => {
        localStorage.clear();
    });

    const icon = (container: HTMLElement): HTMLElement => container.querySelector("i") as HTMLElement;

    it("starts off (regular icon) when nothing is stored", () => {
        const { container } = render(<GenericButton label="Like post" postId="p1" type="like" icon="fa-heart" fill="red" />);
        expect(icon(container).className).toContain("fa-regular");
        expect(icon(container).className).toContain("fa-heart");
    });

    it("starts on when 'true' is stored under type_postId", () => {
        localStorage.setItem("like_p1", "true");
        const { container } = render(<GenericButton label="Like post" postId="p1" type="like" icon="fa-heart" fill="red" />);
        expect(icon(container).className).toContain("fa-solid");
    });

    it("ignores any stored value other than 'true'", () => {
        localStorage.setItem("like_p1", "yes");
        const { container } = render(<GenericButton label="Like post" postId="p1" type="like" icon="fa-heart" fill="red" />);
        expect(icon(container).className).toContain("fa-regular");
    });

    it("toggles and persists", () => {
        const { container } = render(<GenericButton label="Like post" postId={7} type="bookmark" icon="fa-bookmark" fill="blue" />);
        fireEvent.click(screen.getByRole("button"));
        expect(icon(container).className).toContain("fa-solid");
        expect(localStorage.getItem("bookmark_7")).toBe("true");

        fireEvent.click(screen.getByRole("button"));
        expect(icon(container).className).toContain("fa-regular");
        expect(localStorage.getItem("bookmark_7")).toBe("false");
    });

    it("keeps separate state per post and per type", () => {
        render(
            <>
                <GenericButton label="Like post" postId="a" type="like" icon="x" fill="red" />
                <GenericButton label="Like post" postId="b" type="like" icon="x" fill="red" />
            </>,
        );
        fireEvent.click(screen.getAllByRole("button")[0]);
        expect(localStorage.getItem("like_a")).toBe("true");
        expect(localStorage.getItem("like_b")).toBeNull();
    });

    it("exposes the fill colour to CSS", () => {
        const { container } = render(<GenericButton label="Like post" postId="p" type="like" icon="x" fill="#ff0000" />);
        expect(icon(container).style.getPropertyValue("--icon-hover-color")).toBe("#ff0000");
        expect(icon(container).style.getPropertyValue("--icon-active-color")).toBe("#ff0000");
    });

    // The button has an icon but no text or aria-label, so assistive technology announces
    // an unnamed button.
    it("has an accessible name", () => {
        render(<GenericButton label="Like post" postId="p" type="like" icon="fa-heart" fill="red" />);
        const button = screen.getByRole("button", { name: "Like post" });
        expect(button.getAttribute("aria-pressed")).toBe("false");
        fireEvent.click(button);
        expect(button.getAttribute("aria-pressed")).toBe("true");
    });
});

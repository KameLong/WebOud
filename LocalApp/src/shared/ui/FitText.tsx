import React, { useLayoutEffect, useRef, useState } from "react";
import { hasCjk } from "../lib/text.ts";
import { gridMetrics } from "../../features/timetable/gridMetrics.ts";
import { useFontSize } from "../hooks/useFontSize.ts";

type FitTextXProps = {
    text: string;
    minScale?: number;
    paddingX?: number;
    color?: string;
    align?: "left" | "center" | "right";
    style?: React.CSSProperties;
    className?: string;
};

/**
 * 指定幅の中にテキストを収めて表示するコンポーネント。
 *
 * @param text 表示する文字列
 * @param style 追加のスタイル
 * @param className 追加のクラス名
 */
export function FitTextX({ text, style, className }: FitTextXProps) {
    const { FONT_SIZE, LINE_HEIGHT } = gridMetrics(useFontSize());
    const outerRef = useRef<HTMLDivElement | null>(null);
    const innerRef = useRef<HTMLSpanElement | null>(null);
    const [scale, setScale] = useState(1);
    // 日本語・中国語は、文字の間隔を広げて枠にそろえる（均等割付）。英語などは、間隔はそのままで、はみ出すときだけ横に縮める
    const justify = hasCjk(text);

    useLayoutEffect(() => {
        if (justify) return;
        const outer = outerRef.current;
        const inner = innerRef.current;
        if (!outer || !inner) return;
        const available = outer.clientWidth - FONT_SIZE * 0.4;
        setScale(inner.scrollWidth > available && available > 0 ? available / inner.scrollWidth : 1);
    }, [justify, text, FONT_SIZE]);

    return (
        <div
            ref={outerRef}
            className={className}
            style={{
                width: "100%",
                alignItems: "center",
                overflow: "hidden",
                textAlign: justify ? "justify" : "left",
                paddingLeft: FONT_SIZE * 0.2,
                paddingRight: FONT_SIZE * 0.2,
                verticalAlign: "middle",
                lineHeight: LINE_HEIGHT + "px",
                textJustify: "inter-character",
                textAlignLast: justify ? "justify" : "left",
                overflowX: "hidden",
                whiteSpace: "nowrap",
                ...style,
            }}
        >
            {justify ? text : (
                <span ref={innerRef} style={{ display: "inline-block", transformOrigin: "left center", transform: scale < 1 ? `scaleX(${scale})` : undefined }}>
                    {text}
                </span>
            )}
        </div>
    );
}

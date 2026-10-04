import React from "react";
import { FONT_SIZE, LINE_HEIGHT } from "../domain/utils.ts";

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
    return (
        <div
            className={className}
            style={{
                width: "100%",
                alignItems: "center",
                overflow: "hidden",
                textAlign: "justify",
                paddingLeft: FONT_SIZE * 0.2,
                paddingRight: FONT_SIZE * 0.2,
                verticalAlign: "middle",
                lineHeight: LINE_HEIGHT + "px",
                textJustify: "inter-character",
                textAlignLast: "justify",
                overflowX: "hidden",
                whiteSpace: "nowrap",
                ...style,
            }}
        >
            {text}
        </div>
    );
}

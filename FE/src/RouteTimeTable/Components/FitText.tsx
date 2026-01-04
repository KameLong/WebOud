import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import {FONT_SIZE, LINE_HEIGHT} from "../domain/utils.ts";

type FitTextXProps = {
    text: string;
    /** 省略せずに縮める最小倍率（0.6なら 60% まで潰す） */
    minScale?: number;
    /** 左右padding（px） */
    paddingX?: number;
    /** 文字色 */
    color?: string;
    /** 中央寄せなど */
    align?: "left" | "center" | "right";
    /** クラスや追加style */
    style?: React.CSSProperties;
    className?: string;
    /** title 付与（ホバーで全文） */
    title?: boolean;
};

/**
 * 指定幅に収まるように「横方向だけ」文字を縮小するコンポーネント。
 * - 幅は親要素の実幅を使う（ResizeObserver）
 * - SVG textLength で横圧縮（縦はそのまま）
 */
export function FitTextX({
                             text,
                             minScale = 0.65,
                             paddingX = 0,
                             color = "#111",
                             align = "left",
                             style,
                             className,
                             title = true,
                         }: FitTextXProps) {
    const wrapRef = useRef<HTMLDivElement | null>(null);
    const textRef = useRef<SVGTextElement | null>(null);

    const [wrapW, setWrapW] = useState<number>(0);
    const [naturalW, setNaturalW] = useState<number>(0);

    // 親幅監視
    useLayoutEffect(() => {
        const el = wrapRef.current;
        if (!el) return;

        const ro = new ResizeObserver(() => {
            const r = el.getBoundingClientRect();
            setWrapW(r.width);
        });
        ro.observe(el);

        // 初回
        const r = el.getBoundingClientRect();
        setWrapW(r.width);

        return () => ro.disconnect();
    }, []);

    // SVGの文字の自然幅を計測
    useLayoutEffect(() => {
        const t = textRef.current;
        if (!t) return;
        try {
            const len = t.getComputedTextLength();
            setNaturalW(len);
        } catch {
            // noop
        }
    }, [text]);

    const availableW = Math.max(0, wrapW - paddingX * 2);

    // 収まるなら圧縮しない。超えるなら minScale まで許容して縮める
    const needCompress = naturalW > 0 && availableW > 0 && naturalW > availableW;
    const scale = useMemo(() => {
        if (!needCompress) return 1;
        const s = availableW / naturalW;
        return Math.max(minScale, Math.min(1, s));
    }, [needCompress, availableW, naturalW, minScale]);

    // SVG textLength は「指定長に伸縮」なので、
    // scale を使って「指定長 = naturalW * scale」にする
    const textLength = needCompress ? naturalW * scale : undefined;

    const anchor = align === "left" ? "start" : align === "center" ? "middle" : "end";
    const x = align === "left" ? paddingX : align === "center" ? wrapW / 2 : wrapW - paddingX;
    // console.log(text,textLength,needCompress,naturalW,availableW);
    // 高さはフォントサイズ基準（見た目調整）
    if(false){
        return (
            <div
                ref={wrapRef}
                className={className}
                style={{
                    display: "block",
                    alignItems: "center",
                    overflow: "hidden",
                    textAlign:'justify',

                    textJustify:'inter-character',
                    textAlignLast:'justify',
                    overflowX: 'hidden',
                    whiteSpace: 'nowrap',
                    ...style,
                }}
                // title={title ? text : undefined}
            >
                        <svg width="100%"  style={{ display: "block" }}>
                            <text
                                ref={textRef}
                                x={x}
                                y="50%"
                                dominantBaseline="middle"
                                textAnchor={anchor}
                                fill={color}
                                // これが横圧縮の肝
                                lengthAdjust={needCompress ? "spacingAndGlyphs" : undefined}
                                textLength={needCompress ? textLength : undefined}
                            >
                                {text}
                            </text>
                        </svg>
            </div>
        )
    }

    return (
        <div
            ref={wrapRef}
            className={className}
            style={{
                width: "100%",
                alignItems: "center",
                overflow: "hidden",
                textAlign:'justify',
                paddingLeft:FONT_SIZE*0.2,
                paddingRight:FONT_SIZE*0.2,
                verticalAlign: "middle",
                lineHeight:LINE_HEIGHT+'px',


                textJustify:'inter-character',
                textAlignLast:'justify',
                overflowX: 'hidden',
                whiteSpace: 'nowrap',
                ...style,
            }}
            // title={title ? text : undefined}
        >
            {text}

        </div>
    );
}
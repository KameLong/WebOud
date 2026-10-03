import React, { useEffect } from "react";

/**
 * 各ページ共通のヘルプダイアログ。そのページでできる操作とショートカットキーを表示する。
 * 背景クリックまたはEscapeキーで閉じる。
 */
export function HelpDialog(props: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
    const { open, onClose, title, children } = props;

    // ヘルプを開くボタン自体にフォーカスが残っている場合でもEscapeで閉じられるよう、
    // キー監視はダイアログ内のdivではなくdocumentレベルで行う。
    useEffect(() => {
        if (!open) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                e.preventDefault();
                onClose();
            }
        };
        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
            style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 9999,
            }}
        >
            <div
                onMouseDown={(e) => e.stopPropagation()}
                style={{
                    width: 480,
                    maxWidth: "calc(100vw - 32px)",
                    maxHeight: "calc(100vh - 64px)",
                    background: "#fff",
                    borderRadius: 10,
                    boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
                    padding: 16,
                    display: "flex",
                    flexDirection: "column",
                }}
            >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{title}</div>
                    <button onClick={onClose} style={{ padding: "4px 10px" }}>
                        閉じる
                    </button>
                </div>
                <div style={{ overflow: "auto" }}>{children}</div>
            </div>
        </div>
    );
}

/** ヘルプダイアログ内の見出し付きセクション */
export function HelpSection(props: { title: string; children: React.ReactNode }) {
    return (
        <div style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: "#444", marginBottom: 6 }}>{props.title}</div>
            {props.children}
        </div>
    );
}

/** できることの箇条書きリスト */
export function HelpList(props: { items: React.ReactNode[] }) {
    return (
        <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, lineHeight: 1.7 }}>
            {props.items.map((item, i) => (
                <li key={i}>{item}</li>
            ))}
        </ul>
    );
}

/** キー操作一覧の表 */
export function HelpShortcutTable(props: { rows: [string, string][] }) {
    return (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <tbody>
                {props.rows.map(([key, desc]) => (
                    <tr key={key}>
                        <td
                            style={{
                                padding: "4px 10px 4px 0",
                                fontFamily: "ui-monospace, Consolas, monospace",
                                whiteSpace: "nowrap",
                                verticalAlign: "top",
                                color: "#0f5b8a",
                                fontWeight: 600,
                                borderBottom: "1px solid #f0f0f0",
                            }}
                        >
                            {key}
                        </td>
                        <td style={{ padding: "4px 0", borderBottom: "1px solid #f0f0f0" }}>{desc}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

export const helpButtonStyle: React.CSSProperties = {
    width: 28,
    height: 28,
    borderRadius: "50%",
    padding: 0,
    fontWeight: 700,
};

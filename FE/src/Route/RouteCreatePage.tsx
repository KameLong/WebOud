import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {SERVER_URL} from "../server/ServerSetting.ts";

type RouteDto = { id: number; route_name: string };

export default function RouteCreatePage() {
    const nav = useNavigate();

    const [routeName, setRouteName] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [created, setCreated] = useState<RouteDto | null>(null);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setCreated(null);

        const name = routeName.trim();
        if (!name) {
            setError("路線名を入力してください");
            return;
        }

        setIsSaving(true);
        try {
            const res = await fetch(`${SERVER_URL}/routes`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ route_name: name }),
            });

            if (!res.ok) {
                // できればサーバ側で ProblemDetails を返すとより良い
                const text = await res.text().catch(() => "");
                throw new Error(text || `HTTP ${res.status}`);
            }

            const dto = (await res.json()) as RouteDto;
            setCreated(dto);

            // 例：作成後に一覧へ（必要なら dto.id へ遷移でもOK）
            nav("/routes");
        } catch (err: any) {
            setError(err?.message ?? "作成に失敗しました");
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <div style={{ maxWidth: 560, margin: "24px auto", padding: 16 }}>
            <h1>路線を新規作成</h1>

            <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
                <label style={{ display: "grid", gap: 6 }}>
                    <span>路線名</span>
                    <input
                        value={routeName}
                        onChange={(e) => setRouteName(e.target.value)}
                        placeholder="例：山手線"
                        disabled={isSaving}
                        style={{ padding: 10, fontSize: 16 }}
                    />
                </label>

                {error && (
                    <div style={{ color: "crimson", whiteSpace: "pre-wrap" }}>{error}</div>
                )}

                <div style={{ display: "flex", gap: 8 }}>
                    <button type="submit" disabled={isSaving}>
                        {isSaving ? "作成中..." : "作成"}
                    </button>
                    <button type="button" onClick={() => nav(-1)} disabled={isSaving}>
                        キャンセル
                    </button>
                </div>

                {created && (
                    <div style={{ color: "green" }}>
                        作成しました: {created.id} / {created.route_name}
                    </div>
                )}
            </form>
        </div>
    );
}
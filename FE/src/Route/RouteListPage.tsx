
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {SERVER_URL} from "../server/ServerSetting.ts";
import {getErrorMessage} from "../Util.ts";

type RouteDto = {
    id: number;
    route_name: string;
};

export default function RouteListPage() {
    const nav = useNavigate();
    const [routes, setRoutes] = useState<RouteDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        load();
    }, []);

    async function load() {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${SERVER_URL}/routes`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = (await res.json()) as RouteDto[];
            setRoutes(data);
        } catch (e:unknown) {
            setError(getErrorMessage(e));
        } finally {
            setLoading(false);
        }
    }

    return (
        <div style={{ maxWidth: 720, margin: "24px auto", padding: 16 }}>
            <h1>路線一覧</h1>

            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <button onClick={() => nav("/routes/new")}>＋ 新規作成</button>
                <button onClick={load} disabled={loading}>
                    再読み込み
                </button>
            </div>

            {loading && <div>読み込み中…</div>}
            {error && <div style={{ color: "crimson" }}>{error}</div>}

            {!loading && !error && (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                    <tr>
                        <th style={th}>ID</th>
                        <th style={th}>路線名</th>
                    </tr>
                    </thead>
                    <tbody>
                    {routes.filter(r=>r.id>0).map((r) => (
                        <tr
                            key={r.id}
                            onClick={() => nav(`/route/${r.id}`)} // 詳細/編集ページ想定
                            style={{ cursor: "pointer" }}
                        >
                            <td style={td}>{r.id}</td>
                            <td style={td}>{r.route_name}</td>
                        </tr>
                    ))}
                    {routes.length === 0 && (
                        <tr>
                            <td colSpan={2} style={{ padding: 12, color: "#666" }}>
                                路線がありません
                            </td>
                        </tr>
                    )}
                    </tbody>
                </table>
            )}
        </div>
    );
}

const th: React.CSSProperties = {
    textAlign: "left",
    borderBottom: "1px solid #ccc",
    padding: "8px 6px",
};

const td: React.CSSProperties = {
    borderBottom: "1px solid #eee",
    padding: "8px 6px",
};
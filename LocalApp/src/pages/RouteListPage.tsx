import React, { useRef, useState, useSyncExternalStore } from "react";
import { useNavigate } from "react-router-dom";
import {
    createRoute,
    deleteRoute,
    duplicateRoute,
    exportAllAsJson,
    exportRouteAsJson,
    importAllFromJson,
    importRouteFromJson,
    listRoutes,
    subscribe,
} from "../store/localStore.ts";
import { createSampleRoute } from "../sampleData.ts";

function downloadText(filename: string, text: string) {
    const blob = new Blob([text], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

function formatDate(ms: number) {
    return new Date(ms).toLocaleString("ja-JP");
}

export default function RouteListPage() {
    const nav = useNavigate();
    const routes = useSyncExternalStore(subscribe, listRoutes);
    const [newName, setNewName] = useState("");
    const [error, setError] = useState<string | null>(null);

    const routeFileRef = useRef<HTMLInputElement | null>(null);
    const allFileRef = useRef<HTMLInputElement | null>(null);

    function onCreate(e: React.FormEvent) {
        e.preventDefault();
        const name = newName.trim();
        if (!name) return;
        const created = createRoute(name);
        setNewName("");
        nav(`/route/${created.id}`);
    }

    function onDelete(id: number, name: string) {
        if (!confirm(`「${name}」を削除しますか？この操作は取り消せません。`)) return;
        deleteRoute(id);
    }

    function onDuplicate(id: number) {
        duplicateRoute(id);
    }

    function onLoadSample() {
        const created = createSampleRoute();
        nav(`/route/${created.id}`);
    }

    function onExportRoute(id: number, name: string) {
        const json = exportRouteAsJson(id);
        if (!json) return;
        downloadText(`${name || "route"}.weboud.json`, json);
    }

    function onExportAll() {
        downloadText(`weboud-backup-${new Date().toISOString().slice(0, 10)}.json`, exportAllAsJson());
    }

    async function onImportRoute(file: File) {
        setError(null);
        try {
            const text = await file.text();
            importRouteFromJson(text);
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            if (routeFileRef.current) routeFileRef.current.value = "";
        }
    }

    async function onImportAll(file: File) {
        if (!confirm("既存の全データを置き換えます。よろしいですか？")) {
            if (allFileRef.current) allFileRef.current.value = "";
            return;
        }
        setError(null);
        try {
            const text = await file.text();
            importAllFromJson(text);
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            if (allFileRef.current) allFileRef.current.value = "";
        }
    }

    return (
        <div style={{ maxWidth: 860, margin: "24px auto", padding: 16 }}>
            <h1>路線一覧</h1>
            <p style={{ color: "#666", fontSize: 13 }}>
                データはこの端末のブラウザ内（ローカルストレージ）にのみ保存されます。他の端末に移す場合は「エクスポート」でファイルを書き出し、その端末で「インポート」してください。
            </p>

            <form onSubmit={onCreate} style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                <input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="新しい路線名（例：山手線）"
                    style={{ padding: 10, fontSize: 16, flex: 1 }}
                />
                <button type="submit">＋ 新規作成</button>
                <button type="button" onClick={onLoadSample}>
                    サンプルダイヤを読み込む（神戸電鉄粟生線）
                </button>
            </form>

            <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
                <button onClick={onExportAll}>全データをエクスポート</button>
                <button onClick={() => allFileRef.current?.click()}>全データを復元（置換）</button>
                <input
                    ref={allFileRef}
                    type="file"
                    accept="application/json"
                    style={{ display: "none" }}
                    onChange={(e) => e.target.files?.[0] && onImportAll(e.target.files[0])}
                />
                <button onClick={() => routeFileRef.current?.click()}>路線をインポート</button>
                <input
                    ref={routeFileRef}
                    type="file"
                    accept="application/json"
                    style={{ display: "none" }}
                    onChange={(e) => e.target.files?.[0] && onImportRoute(e.target.files[0])}
                />
            </div>

            {error && <div style={{ color: "crimson", marginBottom: 12, whiteSpace: "pre-wrap" }}>{error}</div>}

            {routes.length === 0 ? (
                <div style={{ padding: 24, color: "#666", textAlign: "center", border: "1px dashed #ddd", borderRadius: 8 }}>
                    路線がありません。上のフォームから新規作成してください。
                </div>
            ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                        <tr>
                            <th style={th}>路線名</th>
                            <th style={th}>駅数</th>
                            <th style={th}>種別数</th>
                            <th style={th}>列車数</th>
                            <th style={th}>最終更新</th>
                            <th style={th}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {routes.map((r) => (
                            <tr key={r.id}>
                                <td style={{ ...td, cursor: "pointer", fontWeight: 600 }} onClick={() => nav(`/route/${r.id}`)}>
                                    {r.name}
                                </td>
                                <td style={td}>{r.stationCount}</td>
                                <td style={td}>{r.trainTypeCount}</td>
                                <td style={td}>{r.tripCount}</td>
                                <td style={td}>{formatDate(r.updatedAt)}</td>
                                <td style={{ ...td, whiteSpace: "nowrap" }}>
                                    <button onClick={() => onExportRoute(r.id, r.name)} style={btnSmall}>
                                        書き出し
                                    </button>
                                    <button onClick={() => onDuplicate(r.id)} style={btnSmall}>
                                        複製
                                    </button>
                                    <button onClick={() => onDelete(r.id, r.name)} style={{ ...btnSmall, color: "crimson" }}>
                                        削除
                                    </button>
                                </td>
                            </tr>
                        ))}
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

const btnSmall: React.CSSProperties = {
    padding: "4px 8px",
    fontSize: 12,
    marginLeft: 6,
};

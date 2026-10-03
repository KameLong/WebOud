import StationListPage from "./StationListPage.tsx";
import { useNavigate, useParams } from "react-router-dom";
import TrainTypeListPage from "./TrainTypeListPage.tsx";
import { useState, useSyncExternalStore } from "react";
import { getRoute, renameRoute, subscribe } from "../store/localStore.ts";
import { HelpDialog, HelpList, HelpSection, HelpShortcutTable, helpButtonStyle } from "../components/HelpDialog.tsx";

export function RoutePage() {
    const urlParams = useParams<{ routeId: string }>();
    const routeId: number = Number(urlParams.routeId);
    const nav = useNavigate();
    const [helpOpen, setHelpOpen] = useState(false);

    const route = useSyncExternalStore(subscribe, () => getRoute(routeId));

    if (!route) {
        return (
            <div style={{ maxWidth: 1000, margin: "24px auto", padding: 16 }}>
                路線が見つかりません。
                <button onClick={() => nav("/")} style={{ marginLeft: 8 }}>
                    路線一覧へ戻る
                </button>
            </div>
        );
    }

    return (
        <div style={{ overflow: "auto", height: "100%" }}>
            <div style={{ maxWidth: 1000, margin: "24px auto", padding: "16px 16px 0" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <button onClick={() => nav("/")}>← 路線一覧へ</button>
                    <button onClick={() => setHelpOpen(true)} style={helpButtonStyle} title="ヘルプ">
                        ？
                    </button>
                </div>
                <h1 style={{ marginBottom: 4 }}>
                    <input
                        value={route.name}
                        onChange={(e) => renameRoute(routeId, e.target.value)}
                        style={{ fontSize: "1.5rem", fontWeight: 700, border: "1px solid transparent", padding: 4, width: "100%", boxSizing: "border-box" }}
                    />
                </h1>
            </div>

            <div style={{ maxWidth: 1000, margin: "24px auto", padding: 16 }}>
                <h2>駅編集</h2>
                <StationListPage routeId={routeId} />
            </div>
            <div style={{ maxWidth: 1000, margin: "24px auto", padding: 16 }}>
                <h2>種別編集</h2>
                <TrainTypeListPage routeId={routeId} />
            </div>
            <div style={{ maxWidth: 1000, margin: "24px auto", padding: 16, display: "flex", gap: 12 }}>
                <button onClick={() => nav(`/route/${routeId}/timetable/0`)}>下り時刻表</button>
                <button onClick={() => nav(`/route/${routeId}/timetable/1`)}>上り時刻表</button>
                <button onClick={() => nav(`/route/${routeId}/diagram`)}>ダイヤグラム</button>
            </div>

            <HelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} title="路線編集 - ヘルプ">
                <HelpSection title="このページでできること">
                    <HelpList
                        items={[
                            "路線名を変更する（タイトル欄を編集）",
                            "駅の追加・削除・並び替え、着/番線/発の表示設定（下り・上り別）の変更",
                            "列車種別の追加・削除・並び替え、略称・色・太字・線種の設定",
                            "下り時刻表／上り時刻表／ダイヤグラムの編集画面へ移動する",
                        ]}
                    />
                </HelpSection>
                <HelpSection title="駅一覧・列車種別一覧の操作">
                    <p style={{ fontSize: 13, color: "#666", margin: "0 0 8px" }}>
                        一番下の緑色の行に名前を入力してEnterを押すと新しい行が追加されます。行をクリックすると選択され、入力欄や色・チェックボックスはクリックでそのまま編集できます。
                    </p>
                    <HelpShortcutTable
                        rows={[
                            ["クリック", "その行を選択（選択中の行を再クリックで選択解除）"],
                            ["Shift+クリック / Shift+↑ / Shift+↓", "選択範囲を拡張"],
                            ["↑ / ↓", "選択行を1つ上/下に移動"],
                            ["Ctrl+C", "選択行をコピー"],
                            ["Ctrl+V", "コピーした行をカーソル位置に貼り付け"],
                            ["Ctrl+Insert", "カーソル位置に空の行を1件挿入"],
                            ["Delete / Backspace", "選択行を削除（確認あり）"],
                        ]}
                    />
                </HelpSection>
                <HelpSection title="保存について">
                    <p style={{ fontSize: 13, color: "#666", margin: 0 }}>
                        駅名・入力欄などへの変更は「変更を保存」ボタンを押すまで確定しません。「再読み込み」で未保存の変更を取り消せます。追加・削除・並び替えは即時に反映されます。
                    </p>
                </HelpSection>
            </HelpDialog>
        </div>
    );
}

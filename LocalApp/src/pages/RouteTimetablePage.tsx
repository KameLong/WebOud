import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Switch } from "@mantine/core";
import { decodeShowStyle, getDirectStyle, FONT_SIZE, getOrCreateStopTime, isDigitKey, LINE_HEIGHT, STATION_NAME_WIDTH, COLUMN_WIDTH } from "../domain/utils.ts";
import { useSelectionNavigation } from "../hooks/useSelectionNavigation.ts";
import { useColumnWindow } from "../hooks/useColumnWindow.ts";
import { useAutoScrollCursor } from "../hooks/useAutoScrollCursor.ts";
import { StationSidebar } from "../components/StationSidebar.tsx";
import { TrainColumn } from "../components/TrainColumn.tsx";
import { StopTimeEditDialog } from "../components/StopTimeEditDialog.tsx";
import type { StopTimeDto, TrainTypeDto } from "../domain/dto.ts";
import { useStopTimeEditor, useTimetableData } from "../hooks/useTimetableData.ts";
import { useTripClipboard } from "../hooks/useTripClipboard.ts";
import { PasteMoveDialog } from "../components/PasteMoveDialog.tsx";
import { TrainPropertyDialog } from "../components/TrainPropertyDialog.tsx";
import { putTrip, shiftStopTime } from "../store/timetableApi.ts";
import type { Cursor, KeyLike } from "../domain/types.ts";
import { AsyncQueue } from "../Util.ts";
import { useContinuousTimeInput } from "../hooks/useContinuousTimeInput.ts";
import { HelpDialog, HelpSection, HelpShortcutTable, helpButtonStyle } from "../components/HelpDialog.tsx";
import { MobileTimetableKeypad } from "../components/MobileTimetableKeypad.tsx";
import { useIsMobile } from "../hooks/useIsMobile.ts";

/** 列車の種別が見つからないとき（プレースホルダ列など）に使う既定の種別。毎回同じ参照にして再描画を避ける */
const FALLBACK_TRAIN_TYPE: TrainTypeDto = { color: "#000", shortName: "", routeID: 0, name: "", fontBold: false, lineStyle: 0, index: 0, lineBold: false, id: 0 };

const keyEventQueue = new AsyncQueue<unknown>();

export default function RouteTimetablePage() {
    const params = useParams<{ routeId: string; direct: string }>();
    const routeId = Number(params.routeId ?? 0);
    const direct = Number(params.direct ?? 0);
    const nav_ = useNavigate();
    const [helpOpen, setHelpOpen] = useState(false);

    const HEADER_ROW_H = LINE_HEIGHT;
    const HEADER_H = HEADER_ROW_H * 7 + 2;

    const z = { header: 3, left: 4, corner: 5 };

    const scrollRef = useRef<HTMLDivElement | null>(null);

    const { stations, trips, loading, error, traintypes } = useTimetableData(routeId, direct);
    const { saveStopTime, insertEmptyTripAt, deleteTrips } = useStopTimeEditor({
        routeId,
        direct,
    });

    const nav = useSelectionNavigation({
        stationsLen: stations.length,
        trainsLen: trips.length,
        stations,
        direct,
    });
    const cont = useContinuousTimeInput({
        stations,
        trips,
        nav,
        changeStopTime: saveStopTime,
    });

    const [pasteMoveOpen, setPasteMoveOpen] = useState(false);
    const colsRef = useRef<HTMLDivElement | null>(null);
    const columnsActive = !loading && !error && stations.length > 0;
    // 列の仮想化：表示範囲付近の列だけ描画する
    const colWindow = useColumnWindow(scrollRef, colsRef, trips.length, COLUMN_WIDTH, columnsActive);
    useAutoScrollCursor(scrollRef, nav.cursor, { colsRef, width: COLUMN_WIDTH, stickyLeft: STATION_NAME_WIDTH + LINE_HEIGHT });

    const isMobile = useIsMobile();

    // スマホ用キーパッド表示中は、下部メニューのFAB/スワイプ検知帯をキーパッドの上にずらす(App.css側で参照)
    useEffect(() => {
        document.body.classList.add("rt-keypad-active");
        return () => document.body.classList.remove("rt-keypad-active");
    }, []);

    // スマホではシステムキーボード(ダイアログでの自由入力)を使わず、連続入力モードでグリッド上に直接入力させる。
    // PC幅に戻った際は、このために強制していた分だけ元に戻す(ユーザーがAlt+Tで有効にした分は変更しない)。
    const forcedContinuousRef = useRef(false);
    useEffect(() => {
        if (isMobile) {
            cont.setEnabled(true);
            forcedContinuousRef.current = true;
        } else if (forcedContinuousRef.current) {
            cont.setEnabled(false);
            forcedContinuousRef.current = false;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isMobile]);

    const focusGrid = useCallback(() => {
        scrollRef.current?.focus();
    }, []);

    const [editState, setEditState] = useState({ open: false, initialInput: "" });
    const [editTarget, setEditTarget] = useState<{ stationName: string; trainNo: string }>({
        stationName: "",
        trainNo: "",
    });
    const [editInitial, setEditInitial] = useState<StopTimeDto>();
    const tripClipboard = useTripClipboard({
        routeId,
        direct,
        trips,
        getSelectedCols: () => (nav.isMultiColSelected ? Array.from(nav.selectedCols) : [nav.cursor.c]),
        getCursorCol: () => nav.cursor.c,
        onAfterMutate: (c) => nav.setCursor?.((cur: Cursor) => ({ ...cur, c })),
    });

    const [tripPropOpen, setTripPropOpen] = useState(false);
    const [tripPropTargetId, setTripPropTargetId] = useState<number | null>(null);

    const trainTypeById = useMemo(() => {
        const m = new Map<number, TrainTypeDto>();
        traintypes.forEach((tt) => m.set(tt.id, tt));
        return m;
    }, [traintypes]);

    if (loading) return <div style={{ padding: 12 }}>loading...</div>;
    if (error) return <div style={{ padding: 12, color: "crimson" }}>{error}</div>;
    if (stations.length === 0)
        return (
            <div style={{ padding: 12 }}>
                駅が登録されていません。
                <button onClick={() => nav_(`/route/${routeId}`)} style={{ marginLeft: 8 }}>
                    路線編集へ戻る
                </button>
            </div>
        );

    /**
     * 列車プロパティのダイアログを開きます。
     *
     * @param tripId 編集する列車ID
     */
    const openTripProperty = (tripId: number) => {
        setTripPropTargetId(tripId);
        setTripPropOpen(true);
    };
    const targetTrip = tripPropTargetId == null ? undefined : trips.find((t) => t.id === tripPropTargetId);

    /**
     * カーソル位置の時刻編集ダイアログを開きます。
     *
     * @param initialChar 最初に入力欄へ入れる1文字（数字キーで開始した場合）
     */
    const openEdit = (initialChar?: string) => {
        const cursor = nav.cursor;
        const r = cursor.r;
        const c = cursor.c;

        const st = stations[r];
        const tr = trips[c];
        if (!st || !tr) return;

        setEditTarget({
            stationName: st.name,
            trainNo: tr.no,
        });

        // tr.id===-1（未作成の列車）でも、既存トリップの未入力駅でも、
        // 同じ方法でデフォルトのStopTimeDtoを用意する
        setEditInitial(getOrCreateStopTime(tr, st.id));
        setEditState({
            open: true,
            initialInput: initialChar ?? "",
        });
    };

    /**
     * カーソル位置を通過/経由なしに設定し、1段下へ進めます。
     *
     * @param stopType 2:通過 3:経由なし（それ以外は無視）
     */
    const changeStopType = (stopType: number) => {
        if (!(stopType === 2 || stopType === 3)) {
            return;
        }
        const cursor = nav.cursor;
        const r = cursor.r;
        const c = cursor.c;
        const station = stations[r];
        const trip = trips[c];
        const newStopTime = { ...getOrCreateStopTime(trip, station.id) };

        newStopTime.depTime = -1;
        newStopTime.ariTime = -1;
        newStopTime.stop = 0;
        newStopTime.stopType = stopType;
        saveStopTime(newStopTime);
        nav.moveVertical(1);
    };

    /**
     * 時刻表グリッドのキー操作をまとめて処理します。
     *
     * @param e キーイベント（キューで直列実行される）
     */
    const keyEvent = async (e: KeyLike) => {
        // macOSはAlt(Option)併用時にkeyが特殊文字に化ける(例: Alt+T→†)ため、
        // Alt併用のショートカットはレイアウト非依存のe.codeで判定する
        if (e.altKey && e.code === "KeyL") {
            const cursor = nav.cursor;
            e.preventDefault();
            shiftStopTime(routeId, trips[cursor.c].id, stations[cursor.r].id, cursor.part, 60);
            return;
        }
        if (e.altKey && e.code === "KeyJ") {
            const cursor = nav.cursor;
            e.preventDefault();
            shiftStopTime(routeId, trips[cursor.c].id, stations[cursor.r].id, cursor.part, -60);
            return;
        }

        if (await cont.onKeyDown(e)) return;

        // Shift+Enter：貼り付け移動量設定
        if (e.key === "Enter" && e.shiftKey) {
            e.preventDefault();
            setPasteMoveOpen(true);
            return;
        }

        // 編集開始（スマホで連続入力モードが有効な間はダイアログを出さず、入力途中のバッファを確定してから1段下へ進める）
        if (e.key === "Enter") {
            e.preventDefault();
            if (isMobile && cont.state.enabled) {
                const hadPending = cont.state.buf.length > 0;
                const ok = await cont.commitPending();
                if (!ok) return; // 不正な入力中は確定・移動せず、警告を表示したままその場に留める
                // バッファがあった場合はcommitPending自身が必要な移動を行う(分の確定時のみ)ため、ここでは動かさない
                if (!hadPending) nav.moveVertical(1);
            } else {
                openEdit();
            }
            return;
        }
        // 数値入力（連続入力モードが有効なときはcont.onKeyDownが既に処理してここには来ない）
        if (isDigitKey(e)) {
            e.preventDefault();
            openEdit(e.key);
            return;
        }
        if (e.key === "^" && e.ctrlKey) {
            changeStopType(3);
            e.preventDefault();
            return;
        }
        // Ctrl+-はChromeの画面縮小に割り当てられているためAltを使う
        if (e.altKey && e.code === "Minus") {
            changeStopType(2);
            e.preventDefault();
            return;
        }

        // 駅時刻削除
        if (e.ctrlKey && e.key === "Delete") {
            const cursor = nav.cursor;
            const r = cursor.r;
            const c = cursor.c;
            const part = cursor.part;

            const station = stations[r];
            const trip = trips[c];
            const newStopTime = { ...getOrCreateStopTime(trip, station.id) };

            const showStyle = decodeShowStyle(getDirectStyle(station.showStyle, direct));
            if (!showStyle.showDep) {
                newStopTime.depTime = -1;
            }
            if (!showStyle.showArr) {
                newStopTime.ariTime = -1;
            }
            if (!showStyle.showTrack) {
                newStopTime.stop = 0;
            }

            switch (part) {
                case "dep":
                    newStopTime.depTime = -1;
                    break;
                case "arr":
                    newStopTime.ariTime = -1;
                    break;
                case "track":
                    newStopTime.stop = 0;
                    break;
            }
            if (newStopTime.depTime < 0 && newStopTime.ariTime < 0 && newStopTime.stop == 0) {
                newStopTime.stopType = 0;
            }
            saveStopTime(newStopTime);
            nav.moveVertical(1);
            e.preventDefault();
            return;
        }
        // Delete：Trip削除
        if (e.key === "Delete" && !e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();

            const cols = nav.isMultiColSelected ? Array.from(nav.selectedCols.values()) : [nav.cursor.c];

            const tripIds = cols.map((c) => trips[c]?.id).filter((id): id is number => typeof id === "number");

            const hasDeletable = tripIds.some((id) => id !== -1);
            if (!hasDeletable) return;

            deleteTrips(tripIds);

            const newLen = Math.max(1, trips.length - tripIds.length);
            nav.setCursor?.((cur: Cursor) => ({ ...cur, c: Math.min(cur.c, newLen - 1) }));
            return;
        }

        // Ctrl+Insert：空列車挿入（現在列の手前）
        if (e.ctrlKey && e.key === "Insert") {
            e.preventDefault();
            insertEmptyTripAt(nav.cursor.c);
            return;
        }
        tripClipboard.onKeyDown(e);

        // カーソル移動の前に、入力途中のバッファがあれば確定を試みる（1桁なら0埋め）。
        // 不正な値だった場合は警告を出したまま移動をブロックし、その場で修正できるようにする。
        const isArrowKey = e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "ArrowLeft" || e.key === "ArrowRight";
        if (isArrowKey && cont.state.enabled) {
            const hadPending = cont.state.buf.length > 0;
            const ok = await cont.commitPending();
            if (!ok) {
                e.preventDefault();
                return;
            }
            if (hadPending) {
                // 確定処理自体が必要な移動を行っている(分の確定時のみ)ため、矢印キー自体の移動は行わない
                e.preventDefault();
                return;
            }
        }

        nav.onKeyDown(e);
        await new Promise((res) => setTimeout(res, 0));
    };

    return (
        <div style={{ height: "100%", padding: "10px" }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: "#888" }}>※ 左側の駅名をクリックすると、その駅の時刻順に列車を並び替えます</span>
                <Switch
                    label="連続入力"
                    checked={cont.state.enabled}
                    onChange={() => cont.toggle()}
                    style={{ marginLeft: "auto" }}
                    title="数字2桁で時・分を順に確定し、入力後は自動で1段下へ進みます（Alt+Tでも切り替え可能）"
                />
                <button onClick={() => setHelpOpen(true)} style={helpButtonStyle} title="ヘルプ">
                    ？
                </button>
            </div>
            {cont.state.warning && <div className="rt-input-warning">{cont.state.warning}</div>}
            <div
                ref={scrollRef}
                className="rt-grid-scroll"
                tabIndex={0}
                onKeyDown={(e) => {
                    const ev: KeyLike = {
                        key: e.key,
                        code: e.code,
                        altKey: e.altKey,
                        ctrlKey: e.ctrlKey,
                        metaKey: e.metaKey,
                        shiftKey: e.shiftKey,
                        preventDefault: () => e.preventDefault(),
                        nativeEvent: e.nativeEvent,
                    };

                    // デバッグ用：押されたキーの組み合わせをコンソールに表示
                    const combo = [ev.ctrlKey && "Ctrl", ev.altKey && "Alt", ev.shiftKey && "Shift", ev.metaKey && "Meta", ev.key].filter(Boolean).join("+");
                    console.log("[keydown]", combo, `(code: ${ev.code})`);

                    keyEventQueue.push(() => keyEvent(ev));
                }}
                style={{
                    outline: "none",
                    overflow: "auto",
                    background: "#fff",
                    scrollPaddingTop: HEADER_H,
                    scrollPaddingLeft: STATION_NAME_WIDTH + LINE_HEIGHT,
                    fontSize: FONT_SIZE,
                }}
            >
                <div style={{ display: "flex", width: "fit-content", flexWrap: "nowrap", paddingRight: "100px" }}>
                    <StationSidebar stations={stations} trips={trips} routeId={routeId} direct={direct} HEADER_H={HEADER_H} zLeft={z.left} zCorner={z.corner} />

                    <div
                        ref={colsRef}
                        style={{
                            flexShrink: 0,
                            display: "flex",
                            alignItems: "flex-start",
                            boxSizing: "border-box",
                            width: trips.length * COLUMN_WIDTH,
                            paddingLeft: colWindow.first * COLUMN_WIDTH,
                        }}
                        onMouseDown={(e) => {
                            // 別セルをタップしてカーソルを移動する前に、入力途中のバッファがあれば確定を試みる
                            if (cont.state.enabled && cont.state.buf.length > 0) {
                                void cont.commitPending().then((ok) => {
                                    if (ok) nav.onMouseDownDelegated(e, focusGrid);
                                });
                                return;
                            }
                            nav.onMouseDownDelegated(e, focusGrid);
                        }}
                    >
                        {trips.slice(colWindow.first, colWindow.last).map((t, i) => {
                            const c = colWindow.first + i;
                            const isSelected = nav.selectedCols.has(c);
                            const invert = isSelected && nav.isMultiColSelected;

                            return (
                                <TrainColumn
                                    cont={cont.state}
                                    direct={direct}
                                    key={t.id}
                                    trip={t}
                                    c={c}
                                    stations={stations}
                                    cursor={nav.cursor}
                                    isSelected={isSelected}
                                    invert={invert}
                                    HEADER_H={HEADER_H}
                                    zHeader={z.header}
                                    onOpenTripProperty={openTripProperty}
                                    trainType={trainTypeById.get(t.trainTypeID) ?? FALLBACK_TRAIN_TYPE}
                                />
                            );
                        })}
                    </div>
                </div>
            </div>
            <MobileTimetableKeypad gridRef={scrollRef} />
            <StopTimeEditDialog
                state={editState}
                stationName={editTarget.stationName}
                trainNo={editTarget.trainNo}
                initial={editInitial}
                cursorPart={nav.cursor.part}
                onCancel={() => {
                    setEditState({
                        open: false,
                        initialInput: "",
                    });
                    scrollRef.current?.focus();
                }}
                onSave={(stopTime) => {
                    saveStopTime(stopTime);
                    nav.moveVertical(1);
                    setEditState({ open: false, initialInput: "" });
                    scrollRef.current?.focus();
                }}
            />
            <PasteMoveDialog
                open={pasteMoveOpen}
                value={tripClipboard.pasteMove}
                onCancel={() => {
                    setPasteMoveOpen(false);
                    scrollRef.current?.focus();
                }}
                onSave={(v) => {
                    tripClipboard.setPasteMove(v);
                    setPasteMoveOpen(false);
                    scrollRef.current?.focus();
                }}
            />
            <TrainPropertyDialog
                open={tripPropOpen && !!targetTrip}
                trainTypes={traintypes.map((tt) => ({ id: tt.id, name: tt.name }))}
                initial={targetTrip}
                onCancel={() => {
                    setTripPropOpen(false);
                    setTripPropTargetId(null);
                    scrollRef.current?.focus();
                }}
                onSave={(trip) => {
                    // trips state への反映は useTimetableData 側の store 購読(reload)に任せる
                    putTrip(routeId, trip);

                    setTripPropOpen(false);
                    setTripPropTargetId(null);
                    scrollRef.current?.focus();
                }}
            />
            <HelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} title="時刻表 - ヘルプ">
                <HelpSection title="このページでできること">
                    <p style={{ fontSize: 13, color: "#666", margin: "0 0 8px" }}>
                        駅ごとの着時刻・発時刻・番線をマス目で編集します。下り・上りの切り替えやダイヤグラムへの移動は、左のメニュー（スマホでは下部のメニューボタン）から行います（上りは駅の表示順が逆になります）。駅名をクリックするとその駅の時刻順に列車（列）が並び替わります。列車の見出しをダブルクリックすると列車のプロパティ（種別など）を編集できます。スマホでは物理キーボードが無いため、画面下部に数字入力とショートカット操作用のキーパッドを表示します。
                    </p>
                </HelpSection>
                <HelpSection title="キーボードショートカット">
                    <HelpShortcutTable
                        rows={[
                            ["↑ / ↓ / ← / →", "カーソルを移動（左右で列車の列を移動）"],
                            ["Shift+← / Shift+→", "列車の列を範囲選択"],
                            ["Enter", "カーソル位置の時刻を編集"],
                            ["0〜9（数字キー）", "入力した数字から時刻編集を開始"],
                            ["Alt+T", "連続入力モードの切り替え（上部の「連続入力」スイッチでも切り替え可。数字2桁で時・分を順に確定し、入力後は自動で1段下へ）"],
                            ["Alt+L", "カーソル位置の時刻を1分進める"],
                            ["Alt+J", "カーソル位置の時刻を1分戻す"],
                            ["Ctrl+Delete", "カーソル位置の時刻・番線を消去"],
                            ["Ctrl+^", "カーソル位置を「経由なし」に設定"],
                            ["Alt+-", "カーソル位置を「通過」に設定"],
                            ["Delete", "選択中の列車（列）を削除"],
                            ["Ctrl+Insert", "カーソル位置の手前に空の列車を挿入"],
                            ["Ctrl+C / Ctrl+X", "選択中の列車をコピー／切り取り"],
                            ["Ctrl+V", "コピーした列車をカーソル位置に貼り付け"],
                            ["Shift+Enter", "貼り付け時の時刻移動量（分・秒）を設定"],
                        ]}
                    />
                </HelpSection>
            </HelpDialog>
        </div>
    );
}

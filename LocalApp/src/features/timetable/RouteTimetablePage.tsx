import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button, Switch } from "@mantine/core";
import { decodeShowStyle, getDirectStyle } from "../../domain/showStyle.ts";
import { getOrCreateStopTime } from "../../domain/trips.ts";
import { gridMetrics } from "./gridMetrics.ts";
import { isDigitKey } from "../../shared/lib/keyboard.ts";
import { useFontSize } from "../../shared/hooks/useFontSize.ts";
import { useSelectionNavigation } from "./hooks/useSelectionNavigation.ts";
import { useColumnWindow } from "./hooks/useColumnWindow.ts";
import { useAutoScrollCursor } from "./hooks/useAutoScrollCursor.ts";
import { StationSidebar } from "./StationSidebar.tsx";
import { TrainColumn } from "./TrainColumn.tsx";
import { StopTimeEditDialog } from "./StopTimeEditDialog.tsx";
import type { StopTimeDto, TrainTypeDto } from "../../domain/dto.ts";
import { useStopTimeEditor, useTimetableData } from "../../store/useTimetableData.ts";
import { useTripClipboard } from "./hooks/useTripClipboard.ts";
import { PasteMoveDialog } from "./PasteMoveDialog.tsx";
import { TrainPropertyDialog } from "./TrainPropertyDialog.tsx";
import { putTrip, shiftStopTime, shiftStopTimesFrom } from "../../store/timetableApi.ts";
import { getRoute } from "../../store/localStore.ts";
import { downloadBytes, loadPdfFonts, subsetFontInBrowser } from "../../shared/pdf/pdfFonts.ts";
import type { PdfOrientation } from "./pdf/routeTimetablePlan.ts";
import { RouteTimetablePdfDialog } from "./pdf/RouteTimetablePdfDialog.tsx";
import type { Cursor } from "./types.ts";
import type { KeyLike } from "../../shared/lib/keyboard.ts";
import { AsyncQueue } from "../../shared/lib/asyncQueue.ts";
import { FALLBACK_TRAIN_TYPE } from "../../domain/defaults.ts";
import { usePdfExport } from "../../shared/pdf/usePdfExport.ts";
import { useContinuousTimeInput } from "./hooks/useContinuousTimeInput.ts";
import { HelpDialog, HelpSection, HelpShortcutTable } from "../../shared/ui/HelpDialog.tsx";
import { helpButtonStyle } from "../../shared/ui/helpButtonStyle.ts";
import { MobileTimetableKeypad } from "./MobileTimetableKeypad.tsx";
import { useIsMobile } from "../../shared/hooks/useIsMobile.ts";
import { useT } from "./messages.ts";
import { commonT, useCommonT } from "../../shared/i18n/common.ts";

const keyEventQueue = new AsyncQueue<unknown>();

export default function RouteTimetablePage() {
    const params = useParams<{ routeId: string; direct: string }>();
    const routeId = Number(params.routeId ?? 0);
    const direct = Number(params.direct ?? 0);
    const nav_ = useNavigate();
    const [helpOpen, setHelpOpen] = useState(false);
    const [pdfOpen, setPdfOpen] = useState(false);
    const pdf = usePdfExport();
    const { t: msg, table } = useT();
    const cm = useCommonT().t;

    const fontSize = useFontSize();
    const metrics = useMemo(() => gridMetrics(fontSize), [fontSize]);
    const { FONT_SIZE, LINE_HEIGHT, STATION_NAME_WIDTH, COLUMN_WIDTH } = metrics;

    const HEADER_ROW_H = LINE_HEIGHT;
    const HEADER_H = HEADER_ROW_H * 7 + 2;

    const z = { header: 3, left: 4, corner: 5 };

    const scrollRef = useRef<HTMLDivElement | null>(null);

    const { stations, trips, traintypes } = useTimetableData(routeId, direct);
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
    const columnsActive = stations.length > 0;
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

    /** 末尾の入力用プレースホルダ列を除いた、実在する列車 */
    const realTrips = useMemo(() => trips.filter((trip) => trip.id !== -1), [trips]);

    if (stations.length === 0)
        return (
            <div style={{ padding: 12 }}>
                {msg("noStations")}
                <button onClick={() => nav_(`/route/${routeId}`)} style={{ marginLeft: 8 }}>
                    {msg("backToEdit")}
                </button>
            </div>
        );

    /**
     * この方向の時刻表をA4のPDFにして保存します（ブラウザの印刷機能は使わず、フォントを埋め込んだPDFを直接作る）。
     * 列車や駅が多いときはA4に収まるようページが分かれ、どのページにも駅名欄を表示します。
     *
     * @param orientation 用紙の向き（A4の横・縦）
     */
    const exportPdf = (orientation: PdfOrientation) =>
        pdf.run(async () => {
            // PDFライブラリは大きいので、PDF出力を押したときに初めて読み込む
            const { buildRouteTimetablePdf } = await import("./pdf/routeTimetablePdf.ts");
            const fonts = await loadPdfFonts();
            const routeName = getRoute(routeId)?.name ?? commonT().t("routeFallbackName");
            const bytes = await buildRouteTimetablePdf({ routeName, direct, stations, trips: realTrips, trainTypeById, fontSize, orientation }, fonts, subsetFontInBrowser);
            downloadBytes(bytes, msg("pdfFileName", { route: routeName, direction: cm(direct === 1 ? "up" : "down") }));
            setPdfOpen(false);
        });

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
        // Alt+Shift+L / J：カーソル位置とそれより下の駅の時刻（その列車）をまとめて1分進める/戻す
        if (e.altKey && e.shiftKey && (e.code === "KeyL" || e.code === "KeyJ")) {
            e.preventDefault();
            const cursor = nav.cursor;
            const trip = trips[cursor.c];
            if (!trip || trip.id === -1) return;
            shiftStopTimesFrom(
                routeId,
                trip.id,
                stations.slice(cursor.r).map((s) => s.id),
                cursor.part,
                e.code === "KeyL" ? 60 : -60,
            );
            return;
        }
        if (e.altKey && (e.code === "KeyL" || e.code === "KeyJ")) {
            const cursor = nav.cursor;
            e.preventDefault();
            shiftStopTime(routeId, trips[cursor.c].id, stations[cursor.r].id, cursor.part, e.code === "KeyL" ? 60 : -60);
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
        <div className="rt-page">
            <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "flex-end", marginBottom: 6 }}>
                <Switch
                    label={msg("continuousInput")}
                    size="sm"
                    checked={cont.state.enabled}
                    onChange={() => cont.toggle()}
                    // 狭い画面でラベルが縦に折れないようにする
                    styles={{ label: { whiteSpace: "nowrap" } }}
                    style={{ flexShrink: 0 }}
                    title={msg("continuousInputTitle")}
                />
                <Button variant="default" size="compact-xs" style={{ flexShrink: 0 }} styles={{ label: { whiteSpace: "nowrap" } }} onClick={() => setPdfOpen(true)} title={msg("pdfButtonTitle")}>
                    {msg("pdfButton")}
                </Button>
                <button onClick={() => setHelpOpen(true)} style={helpButtonStyle} title={msg("help")}>
                    ？
                </button>
            </div>
            {pdf.error && <div className="rt-input-warning">{msg("pdfFailed", { message: pdf.error })}</div>}
            <RouteTimetablePdfDialog open={pdfOpen} onClose={() => setPdfOpen(false)} stations={stations} direct={direct} tripCount={realTrips.length} busy={pdf.busy} onCreate={(o) => void exportPdf(o)} />
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
                    <StationSidebar stations={stations} trips={trips} routeId={routeId} direct={direct} HEADER_H={HEADER_H} zLeft={z.left} zCorner={z.corner} metrics={metrics} />

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
                                    metrics={metrics}
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
                    // trips の反映は、useTimetableData が購読しているストアの更新に任せる
                    putTrip(routeId, trip);

                    setTripPropOpen(false);
                    setTripPropTargetId(null);
                    scrollRef.current?.focus();
                }}
            />
            <HelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} title={msg("helpTitle")}>
                <HelpSection title={msg("helpDoSection")}>
                    <p style={{ fontSize: 13, color: "#666", margin: "0 0 8px" }}>
                        {msg("helpDoNote")}
                    </p>
                </HelpSection>
                <HelpSection title={msg("helpKeysSection")}>
                    <HelpShortcutTable rows={table("helpKeys")} />
                </HelpSection>
            </HelpDialog>
        </div>
    );
}

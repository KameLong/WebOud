import { ActionIcon, TextInput } from "@mantine/core";
import React, { useCallback, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { TrashIcon } from "../components/TrashIcon.tsx";
import { ShowStyleComponent } from "../components/ShowStyleComponent.tsx";
import { IndexedListComponent, RowSelectHandle, type RowRenderProps } from "../components/IndexedListComponent.tsx";
import type { StationDto } from "../domain/dto.ts";
import * as timetableApi from "../store/timetableApi.ts";
import { getRoute, subscribe } from "../store/localStore.ts";
import { getDirectStyle, isImeComposing, makeShowStyle, setDirectStyle, SHOW_DEP } from "../domain/utils.ts";

const EMPTY_STATIONS: StationDto[] = [];

/** 新規駅の初期表示：下り・上りとも「発」のみ */
const DEFAULT_SHOW_STYLE = makeShowStyle(SHOW_DEP, SHOW_DEP);

// ShowStyleComponent(駅一覧の着/番線/発チェックボックス群)の実寸に合わせた値。
// 変更する場合はShowStyleComponent.tsx側のchkCell/padding/gapも揃えること。
const COL = {
    name: 240,
    block: 42 * 3 + 4 * 2 + 6 * 2,
    chk: 42,
};
const styles: Record<string, React.CSSProperties> = {
    row: {
        display: "flex",
        alignItems: "stretch",
        borderTop: "1px solid #eee",
        borderLeft: "1px solid #ddd",
        borderRight: "1px solid #ddd",
        borderBottom: "1px solid #eee",
    },
    headRow: {
        borderTop: "none",
        background: "#fafafa",
        fontWeight: 600,
    },
    cell: {
        padding: 8,
        boxSizing: "border-box",
    },
    nameCell: {
        width: COL.name,
        minWidth: COL.name,
        maxWidth: COL.name,
        borderRight: "1px solid #eee",
    },
    blockCell: {
        width: COL.block,
        minWidth: COL.block,
        maxWidth: COL.block,
        borderRight: "1px solid #eee",
    },
    blockTitle: {
        marginBottom: 6,
        fontSize: 14,
    },
    checkGridHead: {
        display: "grid",
        gridTemplateColumns: `${COL.chk}px ${COL.chk}px ${COL.chk}px`,
        gap: 6,
        fontSize: 12,
        color: "#666",
    },
};

/**
 * 新しい駅名を入力する最下行。Enterで末尾に駅を追加する。
 * ここに入力した名前は、行間の「＋」ボタンやCtrl+Insertでの挿入にも使われる（空のままでは挿入できない）。
 *
 * @param props newName:入力中の駅名 / setNewName:入力値の更新 / error:空のまま追加しようとしたときの警告表示 / inputRef:入力欄のref / onAppend:末尾に追加する処理
 */
function AppendComponent(props: { newName: string; setNewName: (v: string) => void; error: boolean; inputRef: React.RefObject<HTMLInputElement | null>; onAppend: () => void }) {
    const { newName, setNewName, error, inputRef, onAppend } = props;

    return (
        <div className="station-row station-append-row" style={{ ...styles.row, background: "#f0fff4" }}>
            <div className="station-name" style={{ ...styles.cell, ...styles.nameCell }}>
                <TextInput
                    ref={inputRef}
                    value={newName}
                    placeholder="新しい駅名 (Enter / ＋で挿入)"
                    title="駅名を入力してEnterで末尾に追加。行間の＋ボタンでその位置に挿入"
                    aria-label="新しい駅名"
                    error={error ? "駅名を入力してください" : undefined}
                    onChange={(e) => setNewName(e.currentTarget.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && !isImeComposing(e)) {
                            e.preventDefault();
                            onAppend();
                        }
                    }}
                />
            </div>

            <div className="station-blocks station-append-blocks">
                <ShowStyleComponent bits={4} disabled={true} />
                <ShowStyleComponent bits={4} disabled={true} />
            </div>
        </div>
    );
}

function StationHeaderComponent() {
    return (
        <div className="station-header" style={{ display: "flex", border: "1px solid #ddd" }}>
            <div className="station-row" style={{ ...styles.row, ...styles.headRow }}>
                <div className="station-name" style={{ ...styles.cell, ...styles.nameCell }}>
                    駅名
                </div>
                <div className="station-blocks">
                    <div style={{ ...styles.cell, ...styles.blockCell }}>
                        <div style={styles.blockTitle}>下り</div>
                        <div className="station-check-head" style={styles.checkGridHead}>
                            <span>着</span>
                            <span>番線</span>
                            <span>発</span>
                        </div>
                    </div>
                    <div style={{ ...styles.cell, ...styles.blockCell }}>
                        <div style={styles.blockTitle}>上り</div>
                        <div className="station-check-head" style={styles.checkGridHead}>
                            <span>着</span>
                            <span>番線</span>
                            <span>発</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

/**
 * 駅一覧の1行を描画します。
 *
 * @param item 表示する駅
 * @param isSelected 選択中か
 * @param onMouseDown 行のmousedownハンドラ（選択処理）
 * @param update 行の値を更新する関数（未保存変更として記録される）
 */
/**
 * 駅と駅の間の「駅を挿入」ボタン。行の選択状態が変わっても再描画されないよう分離している。
 *
 * @param props name:駅名（ボタンのラベル用） / insertBefore:この駅の手前に挿入する処理
 */
const InsertStrip = React.memo(function InsertStrip({ name, insertBefore }: { name: string; insertBefore: () => void }) {
    return (
        <div className="station-insert">
            <ActionIcon variant="light" size="sm" radius="xl" onClick={insertBefore} aria-label={`${name}の手前に駅を挿入`} title="ここに駅を挿入">
                ＋
            </ActionIcon>
        </div>
    );
});

/**
 * 駅名の入力欄と、削除ボタン（ゴミ箱アイコン）。行の選択状態が変わっても再描画されないよう分離している。
 * 駅名は空にできない。入力途中で空になっても保存せず、入力欄を離れたときに元の駅名へ戻す。
 *
 * @param props item:駅 / update:駅の値を更新する関数 / remove:この駅を削除する関数
 */
const StationNameField = React.memo(function StationNameField({ item, update, remove }: Pick<RowRenderProps<StationDto>, "item" | "update" | "remove">) {
    // 編集中の文字列。nullのときは保存済みの駅名を表示する
    const [draft, setDraft] = useState<string | null>(null);
    return (
        <>
            <div style={{ flex: 1, minWidth: 0 }}>
                <TextInput
                    size="xs"
                    value={draft ?? item.name}
                    placeholder="駅名"
                    aria-label="駅名"
                    onChange={(e) => {
                        const v = e.currentTarget.value;
                        setDraft(v);
                        if (v.trim() !== "") update((x) => ({ ...x, name: v }));
                    }}
                    onBlur={() => setDraft(null)}
                />
            </div>
            {/* 駅名の右側に削除ボタン（キーボードのDeleteや操作バーからも削除できる） */}
            <ActionIcon
                className="station-delete"
                variant="subtle"
                color="red"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={remove}
                aria-label={`${item.name}を削除`}
                title="この駅を削除"
            >
                <TrashIcon size={16} />
            </ActionIcon>
        </>
    );
});

/**
 * 下り・上りの着/番線/発のチェックボックス群。行の選択状態が変わっても再描画されないよう分離している（Mantineの部品が多く重いため）。
 *
 * @param props showStyle:駅の表示スタイル(下り・上り) / update:駅の値を更新する関数
 */
const StationBlocks = React.memo(function StationBlocks({ showStyle, update }: { showStyle: number; update: RowRenderProps<StationDto>["update"] }) {
    const changeDown = useCallback((bits: number) => update((x) => ({ ...x, showStyle: setDirectStyle(x.showStyle, 0, bits) })), [update]);
    const changeUp = useCallback((bits: number) => update((x) => ({ ...x, showStyle: setDirectStyle(x.showStyle, 1, bits) })), [update]);
    return (
        <div className="station-blocks">
            <ShowStyleComponent title="下り" bits={getDirectStyle(showStyle, 0)} onChangeBits={changeDown} />
            <ShowStyleComponent title="上り" bits={getDirectStyle(showStyle, 1)} onChangeBits={changeUp} />
        </div>
    );
});

const StationRowComponent = React.memo(function StationRowComponent({ item, isSelected, onMouseDown, onSelectClick, update, remove, insertBefore }: RowRenderProps<StationDto>) {
    return (
        <>
            {item.index > 0 && <InsertStrip name={item.name} insertBefore={insertBefore} />}
            <div
                className="station-row"
                data-row-id={item.id}
                onMouseDown={onMouseDown}
                style={{
                    ...styles.row,
                    background: isSelected ? "#e6f2ff" : undefined,
                }}
            >
                <div className="station-name" style={{ ...styles.cell, ...styles.nameCell }}>
                    <div className="station-name-inner">
                        <RowSelectHandle checked={isSelected} onClick={onSelectClick} />
                        <StationNameField item={item} update={update} remove={remove} />
                    </div>
                </div>

                <StationBlocks showStyle={item.showStyle} update={update} />
            </div>
        </>
    );
});

/**
 * 駅の一覧編集UIです。
 *
 * @param routeId 編集する路線ID
 */
export default function StationListPage({ routeId }: { routeId: number }) {
    const stations = useSyncExternalStore(subscribe, () => getRoute(routeId)?.stations ?? EMPTY_STATIONS);

    // 新しい駅名の入力欄（最下行）。末尾追加のほか、行間の＋ボタン・Ctrl+Insertでの挿入にも使う
    const [newName, setNewName] = useState("");
    const [nameError, setNameError] = useState(false);
    const newInputRef = useRef<HTMLInputElement | null>(null);
    const newNameRef = useRef(newName);
    useLayoutEffect(() => {
        newNameRef.current = newName;
    });

    /**
     * 入力欄の駅名を取り出して、入力欄を空にする。空のままなら警告を出して入力欄にフォーカスし、nullを返す
     */
    function takeNewName(): string | null {
        const name = newNameRef.current.trim();
        if (!name) {
            setNameError(true);
            newInputRef.current?.focus();
            return null;
        }
        setNewName("");
        setNameError(false);
        return name;
    }

    /** 入力欄の駅名で、一覧の末尾に駅を追加する */
    function appendStation() {
        const name = takeNewName();
        if (!name) return;
        timetableApi.insertStations(routeId, stations.length, [{ name, routeID: routeId, index: stations.length, showStyle: DEFAULT_SHOW_STYLE }]);
        requestAnimationFrame(() => newInputRef.current?.focus());
    }

    return (
        <div className="station-list">
            <IndexedListComponent<StationDto>
                routeId={routeId}
                items={stations}
                onUpdate={(item) => timetableApi.updateStation(routeId, item)}
                onInsert={(position, dtos) => timetableApi.insertStations(routeId, position, dtos)}
                onRemove={(ids) => timetableApi.deleteStations(routeId, ids)}
                createEmpty={(routeId, index) => {
                    const name = takeNewName();
                    return name ? { name, routeID: routeId, index, showStyle: DEFAULT_SHOW_STYLE } : null;
                }}
                toClip={(s) => s}
                fromClip={(c, routeId, index) => (c.name?.trim() ? { name: c.name, routeID: routeId, index, showStyle: c.showStyle } : null)}
                HeaderComponent={StationHeaderComponent}
                RowComponent={StationRowComponent}
                AppendRowComponent={
                    <AppendComponent
                        newName={newName}
                        setNewName={(v) => {
                            setNewName(v);
                            setNameError(false);
                        }}
                        error={nameError}
                        inputRef={newInputRef}
                        onAppend={appendStation}
                    />
                }
            />
        </div>
    );
}

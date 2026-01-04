import React, { useEffect, useMemo, useRef, useState } from "react";

export type IndexedItemBase = {
    id: number;
    routeID: number;
    index: number;
};

export type ClipboardPayload<TClip> = {
    kind: "indexed-list-v1";
    items: TClip[];
};

export type RowRenderProps<TItem> = {
    item: TItem;
    isSelected: boolean;
    onMouseDown: (e: React.MouseEvent) => void;
    updateLocal: (updater: (x: TItem) => TItem) => void;
};

type Props<TItem extends IndexedItemBase> = {
    routeId: number;

    // データ
    items: TItem[];
    setItems: React.Dispatch<React.SetStateAction<TItem[]>>;

    // API（最低限）
    load: () => Promise<void>;
    updateRemote: (item: TItem) => Promise<void>;    // PUT相当
    createRemote: (item: Omit<TItem, "id">) => Promise<TItem>; // POST相当（id返す）
    deleteRemote: (id: number) => Promise<void>;     // DELETE相当

    // dirty（Stationのようにまとめて保存したい場合）
    setDirty: React.Dispatch<React.SetStateAction<Record<number, TItem>>>;
    saveAll: () => Promise<void>;

    // クリップボード変換（Station/TrainTypeで内容を決める）
    toClip: (item: TItem) => TItem;
    fromClip: (clip: TItem, routeId: number, index: number) => Omit<TItem, "id">;

    createEmpty: (routeId: number, index: number) => Omit<TItem, "id">;

    // 行描画（ここだけ差し替える）
    RowComponent: React.ComponentType<RowRenderProps<TItem>>;
    HeaderComponent: React.ComponentType;
    AppendRowComponent?: React.ReactNode;

};

function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
}

export function IndexedListComponent<TItem extends IndexedItemBase>(props: Props<TItem>) {
    const {
        routeId,
        items,
        setItems,
        load,
        updateRemote,
        createRemote,
        deleteRemote,
        setDirty,
        saveAll,
        toClip,
        fromClip,
        createEmpty,
        RowComponent,
        HeaderComponent,
        AppendRowComponent
    } = props;

    // list focus
    const listRef = useRef<HTMLDivElement | null>(null);

    // selection
    const [cursorId, setCursorId] = useState<number | null>(null);
    const [anchorId, setAnchorId] = useState<number | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

    // clipboard fallback
    const clipRef = useRef<ClipboardPayload<TItem> | null>(null);

    const ordered = useMemo(() => {
        return [...items].filter(x => x.routeID === routeId).sort((a, b) => a.index - b.index);
    }, [items, routeId]);

    const orderedIds = useMemo(() => ordered.map(x => x.id), [ordered]);

    const indexOfId = (id: number | null) => (id == null ? -1 : orderedIds.indexOf(id));

    const lastSelectedId = (sel: Set<number>) => {
        let bestIdx = -1, bestId: number | null = null;
        for (const id of sel) {
            const i = indexOfId(id);
            if (i > bestIdx) { bestIdx = i; bestId = id; }
        }
        return bestId;
    };

    const rangeSelect = (aId: number, bId: number) => {
        const a = indexOfId(aId);
        const b = indexOfId(bId);
        if (a < 0 || b < 0) return new Set<number>();
        const [lo, hi] = a < b ? [a, b] : [b, a];
        return new Set(orderedIds.slice(lo, hi + 1));
    };

    // local update + dirty
    const itemsRef = useRef<TItem[]>([]);
    useEffect(() => { itemsRef.current = items; }, [items]);

    const updateLocalById = (id: number, updater: (x: TItem) => TItem) => {
        setItems(prev => prev.map(x => (x.id === id ? updater(x) : x)));
        setDirty(prev => {
            const base = itemsRef.current.find(x => x.id === id);
            const cur = prev[id] ?? base;
            if (!cur) return prev;
            const updated = updater(cur);
            return { ...prev, [id]: updated };
        });
    };

    // clipboard
    async function writeClipboard(payload: ClipboardPayload<TItem>) {
        clipRef.current = payload;
        try { await navigator.clipboard.writeText(JSON.stringify(payload));
        } catch(ex){
            alert(ex);
        }
    }
    async function readClipboard(): Promise<ClipboardPayload<TItem> | null> {
        try {
            const text = await navigator.clipboard.readText();
            const parsed = JSON.parse(text);
            if (parsed?.kind === "indexed-list-v1" && Array.isArray(parsed.items)) return parsed;
        } catch(ex){
            alert(ex);
        }
        return clipRef.current;
    }

    // Insert helper: “cursorの上” or “末尾”
    const getInsertIndex = () => {
        const curIdx = indexOfId(cursorId);
        const insertPos = curIdx >= 0 ? curIdx : ordered.length;
        if (insertPos < ordered.length) return ordered[insertPos].index;
        return ordered.length ? ordered[ordered.length - 1].index + 1 : 0;
    };

    // Shift indices (client-driven; serverに一括APIがあれば置換推奨)
    async function shiftIndices(fromIndex: number, delta: number) {
        const toShift = ordered.filter(x => x.index >= fromIndex).sort((a,b) => b.index - a.index);
        for (const x of toShift) {
            const moved = { ...x, index: x.index + delta };
            await updateRemote(moved);
        }
        // local reflect
        setItems(prev => prev.map(x => {
            if (x.routeID !== routeId) return x;
            if (x.index >= fromIndex) return { ...x, index: x.index + delta };
            return x;
        }));
        // dirty safety: shift対象は捨てる（衝突回避）
        setDirty(prev => {
            const next = { ...prev };
            for (const x of toShift) delete next[x.id];
            return next;
        });
    }

    async function insertOne() {
        const insertIndex = getInsertIndex();
        await shiftIndices(insertIndex, 1);
        console.log(routeId);

        const created = await createRemote(createEmpty(routeId, insertIndex));
        setItems(prev => [...prev, created].sort((a,b) => a.index - b.index));

        setSelectedIds(new Set([created.id]));
        setCursorId(created.id);
        setAnchorId(created.id);
        requestAnimationFrame(() => listRef.current?.focus());
    }

    // Delete
    async function deleteSelected() {
        const ids = Array.from(selectedIds);
        if (ids.length === 0) return;

        if (!confirm(`${ids.length}件削除しますか？`)) return;

        for (const id of ids) await deleteRemote(id);

        setItems(prev => prev.filter(x => !selectedIds.has(x.id)));
        setDirty(prev => {
            const next = { ...prev };
            for (const id of ids) delete next[id];
            return next;
        });

        // move cursor
        const remaining = orderedIds.filter(id => !selectedIds.has(id));
        const curIdx = cursorId != null ? orderedIds.indexOf(cursorId) : -1;
        const nextIdx = clamp(curIdx, 0, remaining.length - 1);
        const nextId = remaining.length ? remaining[nextIdx] : null;

        setSelectedIds(nextId ? new Set([nextId]) : new Set());
        setCursorId(nextId);
        setAnchorId(nextId);
    }

    // Copy/Paste
    async function handleCopy() {
        if (selectedIds.size === 0) return;
        const selectedOrdered = ordered.filter(x => selectedIds.has(x.id));
        const payload: ClipboardPayload<TItem> = {
            kind: "indexed-list-v1",
            items: selectedOrdered.map(toClip),
        };
        await writeClipboard(payload);

        // “最後の次へフォーカス”
        const lastId = lastSelectedId(selectedIds);
        const lastIdx = indexOfId(lastId);
        const nextIdx = clamp(lastIdx + 1, 0, orderedIds.length - 1);
        const nextId = orderedIds.length ? orderedIds[nextIdx] : null;
        setCursorId(nextId);
        setAnchorId(nextId);
        setSelectedIds(nextId ? new Set([nextId]) : new Set());
        requestAnimationFrame(() => listRef.current?.focus());
    }

    async function paste() {
        const clip = await readClipboard();
        if (!clip || clip.items.length === 0) return;

        const insertIndex = (selectedIds.size === 0) // ←「フォーカス外なら末尾」等の判定に置換可
            ? (ordered.length ? ordered[ordered.length - 1].index + 1 : 0)
            : getInsertIndex();

        const n = clip.items.length;
        await shiftIndices(insertIndex, n);

        const createdList: TItem[] = [];
        for (let k = 0; k < n; k++) {
            const dto = fromClip(clip.items[k], routeId, insertIndex + k);
            const created = await createRemote(dto);
            createdList.push(created);
        }

        setItems(prev => [...prev, ...createdList].sort((a,b) => a.index - b.index));

        const newSel = new Set(createdList.map(x => x.id));
        const newCursor = createdList.length ? createdList[createdList.length - 1].id : cursorId;
        setSelectedIds(newSel);
        setAnchorId(createdList.length ? createdList[0].id : newCursor);
        setCursorId(newCursor);
        requestAnimationFrame(() => listRef.current?.focus());
    }

    // keyboard
    async function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
        const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
        if (tag === "input" || tag === "textarea") return;
        if (orderedIds.length === 0) return;

        const isCtrl = e.ctrlKey || e.metaKey;

        // arrows
        const curId = cursorId ?? orderedIds[0];
        const curIdx = indexOfId(curId);
        const dir = e.key === "ArrowUp" ? -1 : e.key === "ArrowDown" ? 1 : 0;
        if (dir !== 0) {
            e.preventDefault();
            const nextIdx = clamp(curIdx + dir, 0, orderedIds.length - 1);
            const nextId = orderedIds[nextIdx];
            if (e.shiftKey) {
                const a = anchorId ?? curId;
                setAnchorId(a);
                setCursorId(nextId);
                setSelectedIds(rangeSelect(a, nextId));
            } else {
                setAnchorId(nextId);
                setCursorId(nextId);
                setSelectedIds(new Set([nextId]));
            }
            return;
        }

        if (isCtrl && (e.key === "c" || e.key === "C")) { e.preventDefault(); await handleCopy(); return; }
        if (isCtrl && (e.key === "v" || e.key === "V")) { e.preventDefault(); await paste(); return; }
        if (isCtrl && e.key === "Insert") { e.preventDefault(); await insertOne(); return; }
        if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); await deleteSelected(); return; }
    }

    // row click handler generator
    const makeRowMouseDown = (id: number) => (e: React.MouseEvent) => {
        listRef.current?.focus();

        const isSelected = selectedIds.has(id);

        if (e.shiftKey && cursorId != null) {
            const a = anchorId ?? cursorId;
            setSelectedIds(rangeSelect(a, id));
            setCursorId(id);
            return;
        }

        // 単独選択済みなら解除
        if (!e.ctrlKey && !e.metaKey) {
            if (isSelected && selectedIds.size === 1) {
                setSelectedIds(new Set());
                setCursorId(null);
                setAnchorId(null);
                return;
            }
            setSelectedIds(new Set([id]));
            setCursorId(id);
            setAnchorId(id);
            return;
        }
    };
    useEffect(() => {
        load();
    }, []);

    return (
        <div>
            <div style={{ display:"flex", gap:8, marginBottom: 8 }}>
                <button onClick={load}>再読み込み</button>
                <button onClick={saveAll}>変更を保存</button>
            </div>

            <div
                ref={listRef}
                tabIndex={0}
                onKeyDown={onKeyDown}
                style={{ outline: "none" }}
            >
                <HeaderComponent />
                {ordered.map((item) => (
                    <RowComponent
                        key={item.id}
                        item={item}
                        isSelected={selectedIds.has(item.id)}
                        onMouseDown={makeRowMouseDown(item.id)}
                        updateLocal={(updater) => updateLocalById(item.id, updater)}
                    />
                ))}

                {AppendRowComponent ?? null}
            </div>
        </div>
    );
}
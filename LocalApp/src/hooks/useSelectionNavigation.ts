import type { Cursor, KeyLike, Part } from "../domain/types.ts";
import { useCallback, useMemo, useState } from "react";
import { decodeParts, makeRangeSet } from "../domain/utils.ts";
import type { StationDto } from "../domain/dto.ts";

/**
 * 選択とキー操作をまとめる
 *
 * @param params stationsLen:駅数 / trainsLen:列車数 / stations:カーソル移動の経路を作るための駅一覧 / direct:0:下り 1:上り（表示パートの判定に使う）
 */
export function useSelectionNavigation(params: {
    stationsLen: number;
    trainsLen: number;
    stations: StationDto[];
    direct: number;
}) {
    const { trainsLen, stations, direct } = params;

    const [cursor, setCursor] = useState<Cursor>(() => ({
        r: 0,
        c: 0,
        part: "arr",
    }));

    const [selectedCols, setSelectedCols] = useState<Set<number>>(new Set([0]));
    const [anchorCol, setAnchorCol] = useState<number>(0);

    const isMultiColSelected = selectedCols.size > 1;

    const verticalRoute = useMemo<Cursor[]>(() => {
        const list: Cursor[] = [];
        for (let r = 0; r < stations.length; r++) {
            const parts = decodeParts(stations[r].showStyle, direct);
            for (const part of parts) list.push({ r, c: 0, part });
        }
        return list;
    }, [stations, direct]);

    const moveVertical = useCallback(
        /**
         * カーソルを表示パート単位で上下に動かします。
         *
         * @param delta -1:上へ 1:下へ
         */
        (delta: -1 | 1) => {
            if (verticalRoute.length === 0) return;

            const curIndex = verticalRoute.findIndex((x) => x.r === cursor.r && x.part === cursor.part);

            let idx = curIndex >= 0 ? curIndex : 0;

            idx = Math.max(0, Math.min(verticalRoute.length - 1, idx + delta));

            const next = verticalRoute[idx];
            setCursor((cur) => ({ ...cur, r: next.r, part: next.part }));
        },
        [verticalRoute, cursor]
    );

    const moveHorizontal = useCallback(
        /**
         * カーソルを列車の列方向に動かします。
         *
         * @param delta -1:左へ 1:右へ
         * @param withShift trueなら起点列からの範囲選択を拡張する
         */
        (delta: -1 | 1, withShift: boolean) => {
            const nc = Math.max(0, Math.min(trainsLen - 1, cursor.c + delta));
            setCursor((cur) => ({ ...cur, c: nc }));

            if (withShift) {
                setSelectedCols(makeRangeSet(anchorCol, nc));
            } else {
                setAnchorCol(nc);
                setSelectedCols(new Set([nc]));
            }
        },
        [anchorCol, cursor.c, trainsLen]
    );

    const onKeyDown = useCallback(
        /**
         * 矢印キーでカーソル移動・範囲選択を行います。
         *
         * @param e キーイベント
         */
        (e: KeyLike) => {
            if (e.key === "ArrowDown") {
                e.preventDefault();
                moveVertical(1);
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                moveVertical(-1);
            } else if (e.key === "ArrowLeft") {
                e.preventDefault();
                moveHorizontal(-1, e.shiftKey);
            } else if (e.key === "ArrowRight") {
                e.preventDefault();
                moveHorizontal(1, e.shiftKey);
            }
        },
        [moveHorizontal, moveVertical]
    );

    /** クリック（イベント委譲のために上位で使う） */
    const onMouseDownDelegated = useCallback(
        /**
         * @param e グリッド上のmousedownイベント（data-r/c/part属性を持つ要素を探す）
         * @param focus 選択後にグリッドへフォーカスを戻す関数
         */
        (e: React.MouseEvent, focus?: () => void) => {
            const target = e.target as HTMLElement | null;
            if (!target) return;
            const el = target.closest("[data-r][data-c][data-part]") as HTMLElement | null;
            if (!el) return;

            e.preventDefault();
            const r = Number(el.dataset.r);
            const c = Number(el.dataset.c);
            const part = el.dataset.part as Part;

            setCursor({ r, c, part });

            if (e.shiftKey) {
                setSelectedCols(makeRangeSet(anchorCol, c));
            } else {
                setAnchorCol(c);
                setSelectedCols(new Set([c]));
            }

            focus?.();
        },
        [anchorCol]
    );

    return {
        cursor,
        setCursor,
        selectedCols,
        setSelectedCols,
        anchorCol,
        setAnchorCol,
        isMultiColSelected,
        onKeyDown,
        onMouseDownDelegated,
        moveVertical,
    };
}

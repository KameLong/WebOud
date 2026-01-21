import type {Cursor, KeyLike, Part} from "../domain/types.ts";
import {useCallback,  useMemo, useState} from "react";
import {decodeDownParts, makeRangeSet} from "../domain/utils.ts";
import type {StationDto} from "../../server/DTO/StationDTO.ts";

/** 選択とキー操作をまとめる */
export function useSelectionNavigation(params: {
    stationsLen: number;
    trainsLen: number;
    stations:StationDto[];
}) {
    const { trainsLen, stations } = params;

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
            const parts = decodeDownParts(stations[r].showStyle);
            for (const part of parts) list.push({ r,c:0, part });
        }
        return list;
    }, [stations]);

    const moveVertical = useCallback((delta: -1 | 1) => {
        if (verticalRoute.length === 0) return;

        const curIndex = verticalRoute.findIndex(
            (x) => x.r === cursor.r && x.part === cursor.part
        );

        // 現在位置がルート上に無い場合（表示切替直後など）は「その駅の先頭」へ寄せる
        let idx = curIndex >= 0 ? curIndex : 0;

        idx = Math.max(0, Math.min(verticalRoute.length - 1, idx + delta));

        const next = verticalRoute[idx];
        setCursor((cur) => ({ ...cur, r: next.r, part: next.part }));
    },[verticalRoute,cursor]);


    const moveHorizontal = useCallback(
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
        moveVertical
    };
}

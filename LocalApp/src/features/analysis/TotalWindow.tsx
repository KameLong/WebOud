import type { RouteRecord } from "../../store/types.ts";
import { setAnalysisTime } from "../../store/timetableApi.ts";
import { ClockWindow } from "./ClockWindow.tsx";
import { useT } from "./messages.ts";

/**
 * 合計所要時間を求める時間帯（例：10:30〜11:30）の入力欄。この時間帯（開始以上・終了未満）に発駅に着いた乗客が、
 * 着駅に着くまでに要した時間の合計を、解析の結果に表示する。
 *
 * @param props route:路線（保存済みの時間帯）
 */
export function TotalWindow({ route }: { route: RouteRecord }) {
    const { t } = useT();
    return (
        <ClockWindow
            title={t("totalTitle")}
            intro={t("totalIntro")}
            startLabel={t("windowStart")}
            endLabel={t("windowEnd")}
            start={route.total?.start}
            end={route.total?.end}
            onChange={(which, s) => setAnalysisTime(route.id, "total", which, s)}
        />
    );
}

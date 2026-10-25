/**
 * 駅名に、その言語の「駅」にあたる語（日本語は「駅」、繁體中文は「站」）を補います（すでに付いていれば、そのまま返す）。
 *
 * @param name 駅名
 * @param suffix 補う語（messagesのstationSuffix。補わない言語では空）
 */
export function labelStation(name: string, suffix: string): string {
    return suffix === "" || name.endsWith(suffix) ? name : `${name}${suffix}`;
}

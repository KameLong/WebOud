// アプリが利用しているnpmパッケージ（dependenciesとその依存先）のライセンス情報を集めて、
// src/features/licenses/licenses.json に書き出します（npm run build の前に自動で実行される）。
// 開発用のパッケージ（devDependencies）は、配布するアプリに含まれないため対象外です。
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT = join(ROOT, "src/features/licenses/licenses.json");

/** ライセンス文のファイル名（LICENSE, LICENSE.md, license-mit, COPYING など） */
const LICENSE_FILE = /^(licen[sc]e|copying)([-._].*)?$/i;

/**
 * パッケージ名から、package.json の場所を探します（Node の解決と同じく、親のフォルダへさかのぼる）。
 *
 * @param name パッケージ名
 * @param from 探し始めるフォルダ
 */
function findPackageJson(name, from) {
    let dir = from;
    while (true) {
        const candidate = join(dir, "node_modules", name, "package.json");
        if (existsSync(candidate)) return candidate;
        const parent = dirname(dir);
        if (parent === dir) return null;
        dir = parent;
    }
}

/**
 * リポジトリのURLを、ブラウザで開ける形に直します。
 *
 * @param repository package.json の repository（文字列またはオブジェクト）
 */
function repositoryUrl(repository) {
    const raw = typeof repository === "string" ? repository : repository?.url;
    if (!raw) return "";
    let url = raw.replace(/^git\+/, "").replace(/^git:\/\//, "https://").replace(/\.git$/, "");
    if (/^[\w.-]+\/[\w.-]+$/.test(url)) url = `https://github.com/${url}`;
    return url.startsWith("http") ? url : "";
}

/**
 * ライセンスの表記を文字列にします。
 *
 * @param pkg package.json の内容
 */
function licenseName(pkg) {
    if (typeof pkg.license === "string") return pkg.license;
    if (pkg.license?.type) return pkg.license.type;
    if (Array.isArray(pkg.licenses)) return pkg.licenses.map((l) => l.type).join(" OR ");
    return "UNKNOWN";
}

/**
 * パッケージのフォルダにあるライセンス文を、すべて読み込んで連結します。
 *
 * @param dir パッケージのフォルダ
 */
function readLicenseText(dir) {
    const files = readdirSync(dir, { withFileTypes: true })
        .filter((f) => f.isFile() && LICENSE_FILE.test(f.name))
        .map((f) => f.name)
        .sort();
    return files.map((f) => readFileSync(join(dir, f), "utf8").replace(/\r\n/g, "\n").trim()).join("\n\n----------\n\n");
}

const rootPkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
/** 名前@バージョン → ライセンス情報 */
const found = new Map();
/** 調べ済みのフォルダ */
const visited = new Set();

/**
 * パッケージとその依存先を、たどって集めます。
 *
 * @param name パッケージ名
 * @param from 探し始めるフォルダ
 */
function collect(name, from) {
    const file = findPackageJson(name, from);
    if (!file) return; // 省略可能な依存（optionalDependencies）などで、入っていないもの
    const dir = dirname(file);
    if (visited.has(dir)) return;
    visited.add(dir);

    const pkg = JSON.parse(readFileSync(file, "utf8"));
    const key = `${pkg.name}@${pkg.version}`;
    if (!found.has(key)) {
        found.set(key, {
            name: pkg.name,
            version: pkg.version,
            license: licenseName(pkg),
            url: repositoryUrl(pkg.repository) || pkg.homepage || "",
            text: readLicenseText(dir),
        });
    }
    for (const dep of Object.keys(pkg.dependencies ?? {})) collect(dep, dir);
}

for (const name of Object.keys(rootPkg.dependencies ?? {})) collect(name, ROOT);

const packages = [...found.values()].sort((a, b) => a.name.localeCompare(b.name) || a.version.localeCompare(b.version));
mkdirSync(dirname(OUTPUT), { recursive: true });
writeFileSync(OUTPUT, JSON.stringify(packages, null, 2) + "\n");
console.log(`${packages.length} 件のライセンス情報を書き出しました: ${OUTPUT}`);

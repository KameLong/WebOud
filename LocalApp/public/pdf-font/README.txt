PDF出力(駅時刻表)に埋め込む日本語フォントです。

BIZ UDゴシック (BIZ UDGothic) - SIL Open Font License 1.1 (OFL.txt を参照)
  https://github.com/googlefonts/morisawa-biz-ud-gothic
JIS X 0208 + cp932拡張の文字、ASCII、一部の記号だけに絞った(サブセット化した)ファイルです。
元のフォントから fonttools (pyftsubset相当) で作成しています。

Noto Sans TC (NotoSansTC-Regular.ttf / NotoSansTC-Bold.ttf) - SIL Open Font License 1.1 (OFL-NotoSansTC.txt を参照)
  https://github.com/google/fonts/tree/main/ofl/notosanstc
繁體中文(台灣)でPDFを出力するときに使うフォントです。可変フォント(Noto Sans TC[wght])から太さ400/700を取り出し、
fonttoolsで文字を絞っています。Regularは Big5(cp950) の全文字＋ASCII・記号・かな・全角形、
Boldは Big5 の第一水準(常用字)＋ASCII・記号・かな・全角形です。Boldに無い文字は、Regularで描きます。

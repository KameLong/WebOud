namespace FeedbackApi;

/// <summary>投稿の受け付けに関する設定（appsettings.json の "Feedback" セクション）。</summary>
public sealed class FeedbackOptions
{
    /// <summary>投稿を受け付けるWebアプリのOrigin（例: https://example.com）。ここに無いOriginからの投稿は拒否する。</summary>
    public string[] AllowedOrigins { get; set; } = [];

    /// <summary>
    /// リバースプロキシ（IISやnginxなど）のIPアドレス。ここに書いたプロキシ経由のときだけ X-Forwarded-For を信用する。
    /// 直接公開する場合は空のままにする（空なら X-Forwarded-For は無視する）。
    /// </summary>
    public string[] TrustedProxies { get; set; } = [];

    /// <summary>投稿データの保存先フォルダ。相対パスはアプリのフォルダ基準。公開フォルダ（wwwroot）の外に置くこと。</summary>
    public string DataDirectory { get; set; } = "Data";

    /// <summary>リクエスト本文の最大バイト数。</summary>
    public long MaxRequestBytes { get; set; } = 16 * 1024;

    /// <summary>1日分の保存ファイルの最大バイト数。超えたらその日は受け付けを止める（ディスク枯渇対策）。</summary>
    public long MaxDailyBytes { get; set; } = 5 * 1024 * 1024;

    /// <summary>件名の最大文字数（画面側の上限と同じにする）。</summary>
    public int MaxSubjectLength { get; set; } = 100;

    /// <summary>内容の最大文字数（画面側の上限と同じにする）。</summary>
    public int MaxBodyLength { get; set; } = 3000;

    /// <summary>同一IPからの投稿回数の上限。</summary>
    public RateLimitOptions RateLimit { get; set; } = new();
}

/// <summary>IP単位のレート制限。</summary>
public sealed class RateLimitOptions
{
    /// <summary>1分あたりの上限。</summary>
    public int PerMinute { get; set; } = 1;

    /// <summary>1時間あたりの上限。</summary>
    public int PerHour { get; set; } = 5;

    /// <summary>1日あたりの上限。</summary>
    public int PerDay { get; set; } = 20;
}

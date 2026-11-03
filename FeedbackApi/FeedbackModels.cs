namespace FeedbackApi;

/// <summary>画面から送られてくる投稿。</summary>
/// <param name="Category">種類（bug / question / request）</param>
/// <param name="Subject">件名</param>
/// <param name="Body">内容</param>
/// <param name="Website">ハニーポット。人間には見えない欄で、値が入っていたらBotとみなす</param>
public sealed record FeedbackRequest(string? Category, string? Subject, string? Body, string? Website);

/// <summary>保存する1件の投稿（1行のJSONとして保存する）。</summary>
public sealed record FeedbackRecord(
    Guid Id,
    DateTimeOffset ReceivedAt,
    string Ip,
    string UserAgent,
    string Category,
    string Subject,
    string Body);

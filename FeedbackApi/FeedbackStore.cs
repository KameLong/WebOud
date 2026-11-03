using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using Microsoft.Extensions.Options;

namespace FeedbackApi;

/// <summary>保存の結果。</summary>
public enum StoreResult
{
    /// <summary>保存した。</summary>
    Saved,

    /// <summary>その日の保存上限に達していて保存しなかった。</summary>
    Full,
}

/// <summary>
/// 投稿を、日ごとのJSON Linesファイル（1行1投稿）に追記して保存します。
/// 保存先は公開フォルダの外に置きます。書き込みは1件ずつ直列に行います。
/// </summary>
public sealed class FeedbackStore
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        // 日本語をエスケープせず、ファイルを読みやすくする（改行は\nに変換されるので1行に収まる）
        Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
    };

    private readonly SemaphoreSlim _gate = new(1, 1);
    private readonly string _directory;
    private readonly long _maxDailyBytes;

    public FeedbackStore(IOptions<FeedbackOptions> options, IHostEnvironment env)
    {
        _directory = Path.GetFullPath(options.Value.DataDirectory, env.ContentRootPath);
        _maxDailyBytes = options.Value.MaxDailyBytes;
        Directory.CreateDirectory(_directory);
    }

    /// <summary>投稿を1件追記します。</summary>
    public async Task<StoreResult> AppendAsync(FeedbackRecord record, CancellationToken ct)
    {
        string line = JsonSerializer.Serialize(record, JsonOptions) + "\n";
        byte[] bytes = new UTF8Encoding(false).GetBytes(line);
        string path = Path.Combine(_directory, $"feedback-{record.ReceivedAt.UtcDateTime:yyyyMMdd}.jsonl");

        await _gate.WaitAsync(ct);
        try
        {
            long current = File.Exists(path) ? new FileInfo(path).Length : 0;
            if (current + bytes.Length > _maxDailyBytes) return StoreResult.Full;

            await using var stream = new FileStream(path, FileMode.Append, FileAccess.Write, FileShare.Read);
            await stream.WriteAsync(bytes, ct);
            return StoreResult.Saved;
        }
        finally
        {
            _gate.Release();
        }
    }
}

using System.Net;
using System.Text;
using System.Text.Json;
using System.Threading.RateLimiting;
using FeedbackApi;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.Extensions.Options;

var builder = WebApplication.CreateBuilder(args);

builder.Services.Configure<FeedbackOptions>(builder.Configuration.GetSection("Feedback"));
var settings = builder.Configuration.GetSection("Feedback").Get<FeedbackOptions>() ?? new FeedbackOptions();

if (settings.AllowedOrigins.Length == 0)
{
    throw new InvalidOperationException("Feedback:AllowedOrigins に、投稿を受け付けるWebアプリのOriginを1つ以上設定してください。");
}

// 許可するOrigin（末尾の / は除いて比較する）
var allowedOrigins = new HashSet<string>(
    settings.AllowedOrigins.Select(o => o.Trim().TrimEnd('/')),
    StringComparer.OrdinalIgnoreCase);

// リクエスト本文のサイズ上限（超えると読み込み時に 413 になる）
builder.WebHost.ConfigureKestrel(k => k.Limits.MaxRequestBodySize = settings.MaxRequestBytes);

// リバースプロキシ経由のとき、設定したプロキシからの X-Forwarded-For だけを信用して、本当のIPを取り出す
if (settings.TrustedProxies.Length > 0)
{
    builder.Services.Configure<ForwardedHeadersOptions>(o =>
    {
        o.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
        o.ForwardLimit = 1;
        o.KnownIPNetworks.Clear();
        o.KnownProxies.Clear();
        foreach (string proxy in settings.TrustedProxies) o.KnownProxies.Add(IPAddress.Parse(proxy));
    });
}

builder.Services.AddCors(o => o.AddPolicy("feedback", p => p
    .WithOrigins(allowedOrigins.ToArray())
    .WithMethods("POST")
    .WithHeaders("Content-Type")));

// IP単位のレート制限（1分・1時間・1日の3つを同時に適用する）。不正な投稿も回数に数える
builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    o.GlobalLimiter = PartitionedRateLimiter.CreateChained(
        CreateLimiter(settings.RateLimit.PerMinute, TimeSpan.FromMinutes(1)),
        CreateLimiter(settings.RateLimit.PerHour, TimeSpan.FromHours(1)),
        CreateLimiter(settings.RateLimit.PerDay, TimeSpan.FromDays(1)));
    o.OnRejected = (context, _) =>
    {
        if (context.Lease.TryGetMetadata(MetadataName.RetryAfter, out TimeSpan retryAfter))
        {
            context.HttpContext.Response.Headers.RetryAfter = ((int)Math.Ceiling(retryAfter.TotalSeconds)).ToString();
        }
        return ValueTask.CompletedTask;
    };
});

builder.Services.AddSingleton<FeedbackStore>();

var app = builder.Build();

if (settings.TrustedProxies.Length > 0) app.UseForwardedHeaders();
app.UseCors();
app.UseRateLimiter();

app.MapPost("/api/feedback", async (HttpContext ctx, FeedbackStore store, IOptions<FeedbackOptions> opt, ILogger<Program> log) =>
{
    var o = opt.Value;

    // 1. Origin：許可したWebアプリからの投稿だけを受け付ける
    string origin = ctx.Request.Headers.Origin.ToString().Trim().TrimEnd('/');
    if (origin == "" || !allowedOrigins.Contains(origin)) return Results.StatusCode(StatusCodes.Status403Forbidden);

    // 2. 形式：JSONのみ。本文サイズは Kestrel の上限でも制限している
    if (!ctx.Request.HasJsonContentType()) return Results.StatusCode(StatusCodes.Status415UnsupportedMediaType);
    if (ctx.Request.ContentLength is long len && len > o.MaxRequestBytes) return Results.StatusCode(StatusCodes.Status413PayloadTooLarge);

    FeedbackRequest? req;
    try
    {
        req = await ctx.Request.ReadFromJsonAsync<FeedbackRequest>(ctx.RequestAborted);
    }
    catch (BadHttpRequestException e) when (e.StatusCode == StatusCodes.Status413PayloadTooLarge)
    {
        return Results.StatusCode(StatusCodes.Status413PayloadTooLarge);
    }
    catch (JsonException)
    {
        return Results.BadRequest(new { error = "invalid" });
    }
    if (req is null) return Results.BadRequest(new { error = "invalid" });

    // 3. ハニーポット：人間には見えない欄に値が入っていたらBot。成功したように見せて、保存はしない
    if (!string.IsNullOrWhiteSpace(req.Website)) return Results.Ok(new { ok = true });

    // 4. 入力の検証
    string category = (req.Category ?? "").Trim();
    if (category is not ("bug" or "question" or "request")) return Results.BadRequest(new { error = "invalid" });

    string subject = Sanitize(req.Subject, allowNewLine: false);
    string body = Sanitize(req.Body, allowNewLine: true);
    if (subject.Length == 0 || subject.Length > o.MaxSubjectLength) return Results.BadRequest(new { error = "invalid" });
    if (body.Length == 0 || body.Length > o.MaxBodyLength) return Results.BadRequest(new { error = "invalid" });

    // 5. 保存（IPアドレスはここで記録する）
    string ip = FormatIp(ctx.Connection.RemoteIpAddress);
    string userAgent = Truncate(ctx.Request.Headers.UserAgent.ToString(), 200);
    var record = new FeedbackRecord(Guid.NewGuid(), DateTimeOffset.UtcNow, ip, userAgent, category, subject, body);

    StoreResult result = await store.AppendAsync(record, ctx.RequestAborted);
    if (result == StoreResult.Full)
    {
        log.LogWarning("1日の保存上限に達したため、投稿を受け付けませんでした。");
        return Results.StatusCode(StatusCodes.Status503ServiceUnavailable);
    }
    return Results.Ok(new { ok = true });
}).RequireCors("feedback");

app.Run();

/// <summary>IPごとのレート制限を作る。投稿のエンドポイント以外は制限しない。</summary>
static PartitionedRateLimiter<HttpContext> CreateLimiter(int permits, TimeSpan window) =>
    PartitionedRateLimiter.Create<HttpContext, string>(ctx =>
    {
        bool target = HttpMethods.IsPost(ctx.Request.Method) && ctx.Request.Path.StartsWithSegments("/api/feedback");
        if (!target) return RateLimitPartition.GetNoLimiter("other");
        return RateLimitPartition.GetFixedWindowLimiter(FormatIp(ctx.Connection.RemoteIpAddress), _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = permits,
            Window = window,
            QueueLimit = 0,
            AutoReplenishment = true,
        });
    });

/// <summary>IPv4射影のIPv6アドレス（::ffff:1.2.3.4）は、IPv4の表記に直す。</summary>
static string FormatIp(IPAddress? ip)
{
    if (ip is null) return "unknown";
    if (ip.IsIPv4MappedToIPv6) ip = ip.MapToIPv4();
    return ip.ToString();
}

/// <summary>前後の空白を除き、改行を \n にそろえ、制御文字を取り除く。</summary>
static string Sanitize(string? text, bool allowNewLine)
{
    if (text is null) return "";
    var sb = new StringBuilder(text.Length);
    string normalized = text.Replace("\r\n", "\n").Replace('\r', '\n');
    foreach (char c in normalized)
    {
        if (c == '\n' || c == '\t')
        {
            sb.Append(allowNewLine ? c : ' ');
        }
        else if (!char.IsControl(c))
        {
            sb.Append(c);
        }
    }
    return sb.ToString().Trim();
}

static string Truncate(string text, int max) => text.Length <= max ? text : text[..max];

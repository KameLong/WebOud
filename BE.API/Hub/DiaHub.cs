using Microsoft.AspNetCore.SignalR;
using WebOudDB;

public class DiaHub : Hub
{
    // 例: 画面で開いている route の更新だけ受け取りたい
    public Task SubscribeRoute(int routeId)
    {
        return Groups.AddToGroupAsync(Context.ConnectionId, RouteGroup(routeId));

    }

    public Task UnsubscribeRoute(int routeId)
        => Groups.RemoveFromGroupAsync(Context.ConnectionId, RouteGroup(routeId));

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        // グループは接続単位で管理されるので通常は何もしなくてOK
        await base.OnDisconnectedAsync(exception);
    }


    public static string RouteGroup(int routeId) => $"route:{routeId}";
}
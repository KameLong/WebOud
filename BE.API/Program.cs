using Microsoft.EntityFrameworkCore;
using WebOudDB;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddCors(options =>
{
    options.AddPolicy("ReactApp", policy =>
    {
        policy
            .WithOrigins(
                "http://localhost:3000", // CRA
                "http://localhost:5173"  // Vite
            )
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials(); // SignalR ÇégÇ§èÍçáÇŸÇ⁄ïKê{
    });
});

//var cs = builder.Configuration.GetConnectionString("Default");
var cs = builder.Configuration.GetConnectionString("Remote");
builder.Services.AddDbContext<DiaDataContext>(o => o.UseNpgsql(cs));

builder.Services.AddSignalR();

var app = builder.Build();
app.UseCors("ReactApp");
app.MapControllers();
app.MapHub<DiaHub>("/hub/dia");

app.Run();
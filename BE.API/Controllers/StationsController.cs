using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using WebOudDB;

[ApiController]
[Route("stations")]
public class StationsController : ControllerBase
{
    private readonly DiaDataContext _db;
    private readonly IHubContext<DiaHub> _hub;

    public StationsController(DiaDataContext db, IHubContext<DiaHub> hub)
    {
        _db = db;
        _hub = hub;
    }

    // GET /stations?routeId=1（任意）
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Station>>> Get([FromQuery] int? routeId)
    {
        var q = _db.Stations.AsQueryable();

        if (routeId is not null)
            q = q.Where(s => s.RouteID == routeId.Value);

        var stations = await q
            .OrderBy(s => s.RouteID)
            .ThenBy(s => s.Index)
            .ToListAsync();

        return Ok(stations);
    }

    // POST /stations (insert)
    [HttpPost]
    public async Task<ActionResult<Station>> Insert([FromBody] Station dto)
    {
        var e = new Station
        {
            Name = dto.Name,
            RouteID = dto.RouteID,
            Index = dto.Index,
            ShowStyle = dto.ShowStyle
        };

        _db.Stations.Add(e);
        await _db.SaveChangesAsync();

        await _hub.Clients.All.SendAsync("station/created", e);

        return Created($"/stations/{e.Id}", e);
    }

    // PUT /stations/{id} (update)
    [HttpPut("{id:int}")]
    public async Task<ActionResult<Station>> Update(int id, [FromBody] Station dto)
    {
        var e = await _db.Stations.FirstOrDefaultAsync(s => s.Id == id);
        if (e is null) return NotFound();

        e.Name = dto.Name;
        e.RouteID = dto.RouteID;
        e.Index = dto.Index;
        e.ShowStyle = dto.ShowStyle;

        await _db.SaveChangesAsync();

        await _hub.Clients.All.SendAsync("station/updated", e);

        return Ok(e);
    }

    // DELETE /stations/{id} (delete)
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var e = await _db.Stations.FirstOrDefaultAsync(s => s.Id == id);
        if (e is null) return NotFound();

        _db.Stations.Remove(e);
        await _db.SaveChangesAsync();

        await _hub.Clients.All.SendAsync("station/deleted", new { id });

        return NoContent();
    }

    //public record StationDto(int id, string name, int route_id, int index, int show_style);
    //public record StationCreateDto(string name, int route_id, int index, int show_style = 1);
    //public record StationUpdateDto(string name, int route_id, int index, int show_style);
}
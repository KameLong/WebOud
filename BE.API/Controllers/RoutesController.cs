using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using WebOudDB;
using static StopTimesController;
using static TripsController;

[ApiController]
[Route("routes")]
public class RoutesController : ControllerBase
{
    private readonly DiaDataContext _db;
    private readonly IHubContext<DiaHub> _hub;

    public RoutesController(DiaDataContext db, IHubContext<DiaHub> hub)
    {
        _db = db;
        _hub = hub;
    }

    // GET /routes
    [HttpGet]
    public async Task<ActionResult<IEnumerable<RouteDto>>> GetAll()
    {
        var routes = await _db.Routes
            .OrderBy(r => r.RouteID)
            .Select(r => new RouteDto(r.RouteID, r.RouteName))
            .ToListAsync();

        return Ok(routes);
    }

    // POST /routes (insert)
    [HttpPost]
    public async Task<ActionResult<RouteDto>> Insert([FromBody] RouteCreateDto dto)
    {
        var e = new WebOudDB.Route { RouteName = dto.route_name };
        _db.Routes.Add(e);
        await _db.SaveChangesAsync();

        var created = new RouteDto(e.RouteID, e.RouteName);
        await _hub.Clients.All.SendAsync("route/created", created);

        return Created($"/routes/{created.id}", created);
    }

    // PUT /routes/{id} (update)
    [HttpPut("{id:int}")]
    public async Task<ActionResult<RouteDto>> Update(int id, [FromBody] RouteUpdateDto dto)
    {
        var e = await _db.Routes.FirstOrDefaultAsync(r => r.RouteID == id);
        if (e is null) return NotFound();

        e.RouteName = dto.route_name;
        await _db.SaveChangesAsync();

        var updated = new RouteDto(e.RouteID, e.RouteName);
        await _hub.Clients.All.SendAsync("route/updated", updated);

        return Ok(updated);
    }

    // DELETE /routes/{id} (delete)
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var e = await _db.Routes.FirstOrDefaultAsync(r => r.RouteID == id);
        if (e is null) return NotFound();

        _db.Routes.Remove(e);
        await _db.SaveChangesAsync();

        await _hub.Clients.All.SendAsync("route/deleted", new { id });

        return NoContent();
    }

    public record RouteDto(int id, string route_name);
    public record RouteCreateDto(string route_name);
    public record RouteUpdateDto(string route_name);


    public record TimeTableDto(
    List<Station> Stations,
    List<TrainType> TrainTypes,
    List<TripWithStopTimesDto> Trips
);
    // GET api/routes/{routeId}/timetable
    [HttpGet("{routeId:int}/timetable")]
    public async Task<ActionResult<TimeTableDto>> GetTimeTable(int routeId)
    {
        // ① Station 一覧（路線順）
        var stations = await _db.Stations
            .AsNoTracking()
            .Where(s => s.RouteID == routeId)
            .OrderBy(s => s.Index)
            .ToListAsync();

        // ② TrainType 一覧（その路線に属するもの）
        var trainTypes = await _db.TrainTypes
            .AsNoTracking()
            .Where(t => t.RouteID == routeId)
            .OrderBy(t => t.Index)
            .ToListAsync();

        // ③ Trip 一覧（列車）
        var trips = await _db.Trips
            .AsNoTracking()
            .Where(t => t.RouteID == routeId)
            .OrderBy(t => t.Id)
            .ToListAsync();

        var tripIds = trips.Select(t => t.Id).ToList();

        // ④ StopTime 一覧（その路線の列車分のみ）
        var stopTimes = await _db.StopTimes
            .AsNoTracking()
            .Where(s => tripIds.Contains(s.TripID))
            .Select(s => new StopTimeDto(
                s.Id,
                s.TripID,
                s.StationID,
                s.DepTime,
                s.AriTime,
                s.StopType,
                s.Stop
            ))
            .ToListAsync();
        var stopTimesByTrip = stopTimes
            .GroupBy(s => s.TripID)
            .ToDictionary(
                g => g.Key,
                g => g.ToDictionary(x => x.StationID, x => x)
            );
        var result = trips.Select(t =>
        {
            stopTimesByTrip.TryGetValue(t.Id, out var dict);
            dict ??= new Dictionary<int, StopTimeDto>();

            return new TripWithStopTimesDto(
                t.Id,
                t.RouteID,
                t.Direct,
                t.TrainTypeID,
                t.Name,
                t.No,
                dict
            );
        }).ToList();

        return Ok(new TimeTableDto(
            stations,
            trainTypes,
            result
        ));
    }


}
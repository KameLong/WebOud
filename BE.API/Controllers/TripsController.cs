using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using System;
using System.Linq;
using System.Reflection.Metadata.Ecma335;
using WebOudDB;
using static StopTimesController;
using static System.Collections.Specialized.BitVector32;

[ApiController]
[Route("trips")]
public class TripsController : ControllerBase
{
    private readonly DiaDataContext _db;
    private readonly IHubContext<DiaHub> _hub;
    public TripsController(DiaDataContext db, IHubContext<DiaHub> hub)
    {
        _db = db;
        _hub = hub;
    }

    // GET api/trips?routeId=1
    [HttpGet]
    public async Task<ActionResult<List<TripDto>>> GetTrips([FromQuery] int? routeId)
    {
        var q = _db.Trips.AsNoTracking();

        if (routeId.HasValue)
            q = q.Where(x => x.RouteID == routeId.Value);

        var list = await q
            .OrderBy(x => x.Id)
            .Select(x => new TripDto(x.Id, x.RouteID, x.Direct, x.TrainTypeID, x.Name, x.No))
            .ToListAsync();

        return Ok(list);
    }

    // GET api/trips/123
    [HttpGet("{id:int}")]
    public async Task<ActionResult<TripDto>> GetTrip(int id)
    {
        var x = await _db.Trips.AsNoTracking().FirstOrDefaultAsync(t => t.Id == id);
        if (x == null) return NotFound();

        return Ok(new TripDto(x.Id, x.RouteID, x.Direct, x.TrainTypeID, x.Name, x.No));
    }

    // POST api/trips
    [HttpPost]
    public async Task<ActionResult<TripWithStopTimesDto>> CreateTrip([FromBody] int routeID)
    {
        try
        {

            var trip = new Trip();
            trip.RouteID = routeID;
            _db.Trips.Add(trip);
            await _db.SaveChangesAsync();
            _db.AddRange(_db.Stations.Where(s => s.RouteID == routeID)
                .Select(s => new StopTime()
                {
                    TripID = trip.Id,
                    StationID = s.Id
                }));
            await _db.SaveChangesAsync();



            // ④ StopTime 一覧（その路線の列車分のみ）
            var stopTimes = await _db.StopTimes
                .AsNoTracking()
                .Where(s => s.TripID == trip.Id)
                .ToDictionaryAsync(s => s.StationID, s => new StopTimeDto(
                    s.Id,
                    s.TripID,
                    s.StationID,
                    s.DepTime,
                    s.AriTime,
                    s.StopType,
                    s.Stop
                ));

            return CreatedAtAction(nameof(GetTrip), new { id = trip.Id }, new TripWithStopTimesDto(
                    trip.Id,
                    trip.RouteID,
                    trip.Direct,
                    trip.TrainTypeID,
                    trip.Name,
                    trip.No,
                    stopTimes
                )
                );
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException pg)
        {
            // どのFK制約か
            var constraint = pg.ConstraintName;     // 例: "trip_route_id_fkey"
            var detail = pg.Detail;                 // 設定により入る（後述）
            var schema = pg.SchemaName;
            var table = pg.TableName;

            return Problem(
                title: "Foreign key violation",
                detail: $"constraint={constraint}, table={table}, schema={schema}, detail={detail}",
                statusCode: 409
            );

        }
    }

    [HttpPost("block")]
    
    public async Task<ActionResult<List<TripWithStopTimesDto>>> AddTripBlock([FromBody] List<TripWithStopTimesDto> tripDtos)
    {
        using (var tran = _db.Database.BeginTransaction()) // トランザクション開始
        {
            try
            {
                var trips = tripDtos.Select(dto => new Trip()
                {
                    Direct = dto.Direct,
                    TrainTypeID = dto.TrainTypeID,
                    Name = dto.Name,
                    No = dto.No,
                    Id = 0,
                    RouteID = dto.RouteID,
                }).ToList();
                _db.Trips.AddRange(
                    trips
                );
                await _db.SaveChangesAsync();

                var stopTimes = tripDtos.SelectMany((dto, i) =>
                {
                    int tripID = trips[i].Id;
                    return dto.StopTimesByStationId.Values.Select(st =>
                    {
                        return new StopTime()
                        {
                            StationID = st.StationID,
                            AriTime = st.AriTime,
                            DepTime = st.DepTime,
                            Id = 0,
                            Stop = st.Stop,
                            TripID = tripID,
                            StopType = st.StopType,
                        };
                    });
                });
                _db.StopTimes.AddRange(stopTimes);
                await _db.SaveChangesAsync();
                tran.Commit();

                // ④ StopTime 一覧（その路線の列車分のみ）

                return Ok(
                    trips.Select(trip =>
                    {
                        var stopTimes = _db.StopTimes
                        .AsNoTracking()
                        .Where(s => s.TripID == trip.Id)
                        .ToDictionary(s => s.StationID, s => new StopTimeDto(
                            s.Id,
                            s.TripID,
                            s.StationID,
                            s.DepTime,
                            s.AriTime,
                            s.StopType,
                            s.Stop
                        ));

                        return new TripWithStopTimesDto(
                            trip.Id,
                            trip.RouteID,
                            trip.Direct,
                            trip.TrainTypeID,
                            trip.Name,
                            trip.No,
                            stopTimes
                        );
                    }).ToList()
                );
            }
            catch (Exception)
            {
                tran.Rollback();
                throw;
            }
        }


    }

    // PUT api/trips/123
    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdateTrip(int id, [FromBody] TripDto dto)
    {
        var entity = await _db.Trips.FirstOrDefaultAsync(x => x.Id == id);
        if (entity == null) return NotFound();

        entity.RouteID = dto.RouteID;
        entity.Direct = dto.Direct;
        entity.TrainTypeID = dto.TrainTypeID;
        entity.Name = dto.Name ?? "";
        entity.No = dto.No ?? "";

        await _db.SaveChangesAsync();
        return NoContent();
    }

    // DELETE api/trips/123
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteTrip(int id)
    {
        var entity = await _db.Trips.FirstOrDefaultAsync(x => x.Id == id);
        if (entity == null) return NotFound();

        // StopTime を子に持つなら、DB側のFK設定で CASCADE にするのが理想。
        // ここでは安全側で先に削除（必要に応じて）
        var children = await _db.StopTimes.Where(s => s.TripID == id).ToListAsync();
        _db.StopTimes.RemoveRange(children);

        _db.Trips.Remove(entity);
        await _db.SaveChangesAsync();

        return NoContent();
    }


    [HttpPost("ChangeTime/{tripID:int}/{stationID:int}/{pos}/{sec:int}")]
    public async Task<IActionResult> ChangeTime(int tripID, int stationID, string pos, int sec)
    {
        var trip = await _db.Trips
            .Where(x => x.Id == tripID)
            .Select(x => new
            {
                x.Id,
                x.RouteID,
                x.Direct,
                x.TrainTypeID,
                x.Name,
                x.No
            })
            .FirstOrDefaultAsync();

        if (trip == null) return NotFound();

        var stationIds = await _db.Stations
            .Where(s => s.RouteID == trip.RouteID)
            .OrderBy(s => s.Index) 
            .Select(s => s.Id)
            .ToListAsync();

        var stopTimes = await _db.StopTimes
            .Where(st => st.TripID == tripID)
            .ToListAsync();

        var stDic = stopTimes.ToDictionary(st => st.StationID);

        if (trip.Direct == 0)
        {
            bool target = false;

            foreach (var stationId2 in stationIds)
            {
                if (stationId2 == stationID && (pos == "ari" || pos == "dep"))
                {
                    target = true;
                }

                if (!target) continue;

                if (!stDic.TryGetValue(stationId2, out var st)) continue;

                if (pos == "ari" && st.AriTime > 0)
                {
                    st.AriTime += sec;
                    if (st.AriTime < 3600 * 3) st.AriTime += 86400;
                }

                if (pos == "dep" && st.DepTime > 0)
                {
                    st.DepTime += sec;
                    if (st.DepTime < 3600 * 3) st.DepTime += 86400;
                }
            }
        }

        await _db.SaveChangesAsync();

        var stopTimeDtos = stopTimes
            .Select(s => new StopTimeDto(
                s.Id,
                s.TripID,
                s.StationID,
                s.DepTime,
                s.AriTime,
                s.StopType,
                s.Stop
            ))
            .ToDictionary(x => x.StationID, x => x);

        var tripWithStopTime = new TripWithStopTimesDto(
            trip.Id,
            trip.RouteID,
            trip.Direct,
            trip.TrainTypeID,
            trip.Name,
            trip.No,
            stopTimeDtos
        );

        await _hub.Clients
            .Group($"route:{trip.RouteID}")
            .SendAsync("TripUpdated", new
            {
                trip = tripWithStopTime,
                updatedAt = DateTimeOffset.Now
            });

        return Ok(tripWithStopTime);
    }


    public record TripDto(
    int Id,
    int RouteID,
    int Direct,
    int TrainTypeID,
    string Name,
    string No
);

    public record TripCreateDto(
        int RouteID,
        int Direct,
        int TrainTypeID,
        string Name,
        string No
    );

    public record TripUpdateDto(
        int RouteID,
        int Direct,
        int TrainTypeID,
        string Name,
        string No
    );
    public record TripWithStopTimesDto(
    int Id,
    int RouteID,
    int Direct,
    int TrainTypeID,
    string Name,
    string No,
    Dictionary<int, StopTimeDto> StopTimesByStationId
);
}
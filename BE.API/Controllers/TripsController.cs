using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using System;
using System.Linq;
using System.Reflection.Metadata.Ecma335;
using WebOudDB;
using static StopTimesController;

[ApiController]
[Route("trips")]
public class TripsController : ControllerBase
{
    private readonly DiaDataContext context;
    public TripsController(DiaDataContext db) => context = db;

    // GET api/trips?routeId=1
    [HttpGet]
    public async Task<ActionResult<List<TripDto>>> GetTrips([FromQuery] int? routeId)
    {
        var q = context.Trips.AsNoTracking();

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
        var x = await context.Trips.AsNoTracking().FirstOrDefaultAsync(t => t.Id == id);
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
            context.Trips.Add(trip);
            await context.SaveChangesAsync();
            context.AddRange(context.Stations.Where(s => s.RouteID == routeID)
                .Select(s => new StopTime()
                {
                    TripID = trip.Id,
                    StationID = s.Id
                }));
            await context.SaveChangesAsync();



            // ④ StopTime 一覧（その路線の列車分のみ）
            var stopTimes = await context.StopTimes
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
        using (var tran = context.Database.BeginTransaction()) // トランザクション開始
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
                context.Trips.AddRange(
                    trips
                );
                await context.SaveChangesAsync();

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
                context.StopTimes.AddRange(stopTimes);
                await context.SaveChangesAsync();
                tran.Commit();

                // ④ StopTime 一覧（その路線の列車分のみ）

                return Ok(
                    trips.Select(trip =>
                    {
                        var stopTimes = context.StopTimes
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
        var entity = await context.Trips.FirstOrDefaultAsync(x => x.Id == id);
        if (entity == null) return NotFound();

        entity.RouteID = dto.RouteID;
        entity.Direct = dto.Direct;
        entity.TrainTypeID = dto.TrainTypeID;
        entity.Name = dto.Name ?? "";
        entity.No = dto.No ?? "";

        await context.SaveChangesAsync();
        return NoContent();
    }

    // DELETE api/trips/123
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteTrip(int id)
    {
        var entity = await context.Trips.FirstOrDefaultAsync(x => x.Id == id);
        if (entity == null) return NotFound();

        // StopTime を子に持つなら、DB側のFK設定で CASCADE にするのが理想。
        // ここでは安全側で先に削除（必要に応じて）
        var children = await context.StopTimes.Where(s => s.TripID == id).ToListAsync();
        context.StopTimes.RemoveRange(children);

        context.Trips.Remove(entity);
        await context.SaveChangesAsync();

        return NoContent();
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
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using WebOudDB;

[ApiController]
[Route("api/stopTimes")]
public class StopTimesController : ControllerBase
{
    private readonly DiaDataContext _db;
    public StopTimesController(DiaDataContext db) => _db = db;

    // GET api/stopTimes?tripId=123
    // GET api/stopTimes?tripId=123&stationId=45
    [HttpGet]
    public async Task<ActionResult<List<StopTimeDto>>> Get([FromQuery] int tripId, [FromQuery] int? stationId)
    {
        var q = _db.StopTimes.AsNoTracking().Where(x => x.TripID == tripId);
        if (stationId.HasValue) q = q.Where(x => x.StationID == stationId.Value);

        var list = await q
            .OrderBy(x => x.StationID)
            .Select(x => new StopTimeDto(x.Id, x.TripID, x.StationID, x.DepTime, x.AriTime, x.StopType, x.Stop))
            .ToListAsync();

        return Ok(list);
    }

    // GET api/stopTimes/999
    [HttpGet("{id:long}")]
    public async Task<ActionResult<StopTimeDto>> GetById(long id)
    {
        var x = await _db.StopTimes.AsNoTracking().FirstOrDefaultAsync(s => s.Id == id);
        if (x == null) return NotFound();

        return Ok(new StopTimeDto(x.Id, x.TripID, x.StationID, x.DepTime, x.AriTime, x.StopType, x.Stop));
    }

    // POST api/stopTimes
    [HttpPost]
    public async Task<ActionResult<StopTimeDto>> Create([FromBody] StopTimeCreateDto dto)
    {
        // 軽いバリデーション例（必要なら厳密化）
        if (dto.TripID <= 0) return BadRequest("TripID is required.");
        if (dto.StationID <= 0) return BadRequest("StationID is required.");

        var entity = new StopTime
        {
            TripID = dto.TripID,
            StationID = dto.StationID,
            DepTime = dto.DepTime,
            AriTime = dto.AriTime,
            StopType = dto.StopType,
            Stop = dto.Stop,
        };

        _db.StopTimes.Add(entity);
        await _db.SaveChangesAsync();

        var outDto = new StopTimeDto(entity.Id, entity.TripID, entity.StationID, entity.DepTime, entity.AriTime, entity.StopType, entity.Stop);
        return CreatedAtAction(nameof(GetById), new { id = entity.Id }, outDto);
    }

    // PUT api/stopTimes/999
    [HttpPut("{id:long}")]
    public async Task<IActionResult> Update(long id, [FromBody] StopTimeUpdateDto dto)
    {
        var entity = await _db.StopTimes.FirstOrDefaultAsync(x => x.Id == id);
        if (entity == null) return NotFound();

        entity.TripID = dto.TripID;
        entity.StationID = dto.StationID;
        entity.DepTime = dto.DepTime;
        entity.AriTime = dto.AriTime;
        entity.StopType = dto.StopType;
        entity.Stop = dto.Stop;

        await _db.SaveChangesAsync();
        return NoContent();
    }

    // DELETE api/stopTimes/999
    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(long id)
    {
        var entity = await _db.StopTimes.FirstOrDefaultAsync(x => x.Id == id);
        if (entity == null) return NotFound();

        _db.StopTimes.Remove(entity);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // PUT api/stopTimes/upsert
    // TripID + StationID で 1件を作成or更新（時刻表UI編集向け）
    [HttpPut("upsert")]
    public async Task<ActionResult<StopTimeDto>> Upsert([FromBody] StopTimeUpsertDto dto)
    {
        if (dto.TripID <= 0) return BadRequest("TripID is required.");
        if (dto.StationID <= 0) return BadRequest("StationID is required.");

        var entity = await _db.StopTimes
            .FirstOrDefaultAsync(x => x.TripID == dto.TripID && x.StationID == dto.StationID);

        if (entity == null)
        {
            entity = new StopTime
            {
                TripID = dto.TripID,
                StationID = dto.StationID,
            };
            _db.StopTimes.Add(entity);
        }

        entity.DepTime = dto.DepTime;
        entity.AriTime = dto.AriTime;
        entity.StopType = dto.StopType;
        entity.Stop = dto.Stop;

        await _db.SaveChangesAsync();

        return Ok(new StopTimeDto(entity.Id, entity.TripID, entity.StationID, entity.DepTime, entity.AriTime, entity.StopType, entity.Stop));
    }
    public record StopTimeDto(
    long Id,
    int TripID,
    int StationID,
    int DepTime,
    int AriTime,
    int StopType,
    int Stop
);

    public record StopTimeCreateDto(
        int TripID,
        int StationID,
        int DepTime,
        int AriTime,
        int StopType,
        int Stop
    );

    public record StopTimeUpdateDto(
        int TripID,
        int StationID,
        int DepTime,
        int AriTime,
        int StopType,
        int Stop
    );

    // 編集UI向け：tripId + stationId で保存（既存があれば更新、無ければ作成）
    public record StopTimeUpsertDto(
        int TripID,
        int StationID,
        int DepTime,
        int AriTime,
        int StopType,
        int Stop
    );
}
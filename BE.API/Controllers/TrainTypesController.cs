using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using WebOudDB;
using Microsoft.EntityFrameworkCore;

namespace BE.API.Controllers
{
    [ApiController]
    [Route("traintypes")]
    public class TrainTypesController : ControllerBase
    {
        private readonly DiaDataContext _db;

        public TrainTypesController(DiaDataContext db)
        {
            _db = db;
        }

        // GET /traintypes?routeId=1
        [HttpGet]
        public async Task<ActionResult<IEnumerable<TrainType>>> Get([FromQuery] int routeId)
        {
            var list = await _db.Set<TrainType>()
                .Where(t => t.RouteID == routeId)
                .OrderBy(t => t.Index)
                .ToListAsync();

            return Ok(list);
        }

        // POST /traintypes
        [HttpPost]
        public async Task<ActionResult<TrainType>> Create([FromBody] TrainType dto)
        {
            var entity = new TrainType
            {
                Name = dto.Name,
                ShortName = dto.ShortName,
                RouteID = dto.RouteID,
                Index = dto.Index,
                Color = dto.Color,
                FontBold = dto.FontBold,
                LineBold = dto.LineBold,
                LineStyle = dto.LineStyle,
            };

            _db.Add(entity);
            await _db.SaveChangesAsync();

            return Ok(entity);
        }

        // PUT /traintypes/{id}
        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] TrainType dto)
        {
            var entity = await _db.Set<TrainType>().FirstOrDefaultAsync(t => t.Id == id);
            if (entity == null) return NotFound();

            entity.Name = dto.Name;
            entity.ShortName = dto.ShortName;
            entity.RouteID = dto.RouteID;
            entity.Index = dto.Index;
            entity.Color = dto.Color;
            entity.FontBold = dto.FontBold;
            entity.LineBold = dto.LineBold;
            entity.LineStyle = dto.LineStyle;

            await _db.SaveChangesAsync();
            return NoContent();
        }

        // DELETE /traintypes/{id}
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            var entity = await _db.Set<TrainType>().FirstOrDefaultAsync(t => t.Id == id);
            if (entity == null) return NotFound();

            _db.Remove(entity);
            await _db.SaveChangesAsync();
            return NoContent();
        }

    }
}

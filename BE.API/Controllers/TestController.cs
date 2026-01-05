using Microsoft.AspNetCore.Mvc;
using static TripsController;

namespace BE.API.Controllers
{
    [ApiController]
    [Route("test")]

    public class TestController : Controller
    {
        [HttpGet]
        public async Task<ActionResult<int>> GetTrips()
        {
            return Ok(10);
        }
    }
}

using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WebOudDB
{
    [Table("route")]
    public class Route
    {
        [Key]
        [Column("id")]
        public int RouteID { get; set; }   // PostgreSQL: serial / identity 相当（DB側で自動採番）

        [Column("route_name")]
        public string RouteName { get; set; } = string.Empty;

        public ICollection<Station> Stations { get; set; } = new List<Station>();
        public ICollection<TrainType> TrainTypes { get; set; } = new List<TrainType>();
    }
    [Table("station")]
    public class Station
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }   // serial / identity（DB側で自動採番）

        [Column("name")]
        public string Name { get; set; } = string.Empty;

        [Column("route_id")]
        public int RouteID { get; set; }

        [Column("index")]
        public int Index { get; set; }

        [Column("show_style")]
        public int ShowStyle { get; set; } = 1;
    }

    [Table("train_type")]
    public class TrainType
    {
        [Key]
        [Column("id")]
        public int Id { get; set; } // identity

        [Column("name")]
        public string Name { get; set; } = string.Empty;

        [Column("route_id")]
        public int RouteID { get; set; }

        // PostgreSQL列は "index" なので Column で明示
        [Column("index")]
        public int Index { get; set; }

        [Column("short_name")]
        public string ShortName { get; set; } = string.Empty;

        [Column("color")]
        public string Color { get; set; }

        [Column("font_bold")]
        public bool FontBold { get; set; }

        [Column("line_bold")]
        public bool LineBold { get; set; }

        [Column("line_style")]
        public int LineStyle { get; set; }

        // optional: ナビゲーション
        [ForeignKey(nameof(RouteID))]
        public Route? Route { get; set; }
    }

    [Table("trip")]
    public class Trip
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }   // PostgreSQL: serial / identity

        [Column("route_id")]
        public int RouteID { get; set; }

        [Column("direct")]
        public int Direct { get; set; } = 0;

        [Column("train_type_id")]
        public int TrainTypeID { get; set; } = 0;

        [Column("name")]
        public string Name { get; set; } = string.Empty;

        [Column("no")]
        public string No { get; set; } = string.Empty;

        // optional navigation（必要なら）
        [ForeignKey(nameof(RouteID))]
        public Route? Route { get; set; }

        [ForeignKey(nameof(TrainTypeID))]
        public TrainType? TrainType { get; set; }


    }

    [Table("stop_time")]
    public class StopTime
    {
        [Key]
        [Column("id")]
        public long Id { get; set; }   // PostgreSQL: bigserial

        [Column("trip_id")]
        public int TripID { get; set; }

        [Column("station_id")]
        public int StationID { get; set; }

        [Column("dep_time")]
        public int DepTime { get; set; } = -1;

        [Column("ari_time")]
        public int AriTime { get; set; } = -1;
        /// <summary>
        /// 運行状態
        /// 0: 運行なし
        /// 1: 停車
        /// 2: 通過（将来拡張用）
        /// </summary>

        [Column("stop_type")]
        public int StopType { get; set; } = 0;

        [Column("stop")]
        public int Stop { get; set; } = 0;

        // optional navigation
        [ForeignKey(nameof(TripID))]
        public Trip? Trip { get; set; }

        [ForeignKey(nameof(StationID))]
        public Station? Station { get; set; }
    }

    public class DiaDataContext : DbContext
    {
        public DiaDataContext(DbContextOptions<DiaDataContext> options)
            : base(options)
        {
        }

        public DbSet<Route> Routes => Set<Route>();
        public DbSet<Station> Stations => Set<Station>();
        public DbSet<Trip> Trips => Set<Trip>();
        public DbSet<StopTime> StopTimes => Set<StopTime>();

        public DbSet<TrainType> TrainTypes => Set<TrainType>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // 属性で十分ですが、念のためテーブル/キーを明示しておく例（任意）
            modelBuilder.Entity<Route>(entity =>
            {
                entity.ToTable("route");
                entity.HasKey(e => e.RouteID);
            });
            modelBuilder.Entity<Station>(entity =>
            {
                entity.ToTable("station");
                entity.HasKey(e => e.Id);

                entity.HasOne<Route>()
                      .WithMany(r => r.Stations)
                      .HasForeignKey(s => s.RouteID);
            });
            modelBuilder.Entity<TrainType>(e =>
            {
                e.ToTable("train_type");
                e.HasIndex(x => new { x.RouteID, x.Index }).IsUnique();

                e.HasOne(x => x.Route)
                 .WithMany(r => r.TrainTypes)
                 .HasForeignKey(x => x.RouteID)
                 .OnDelete(DeleteBehavior.Cascade);
            });
            modelBuilder.Entity<Trip>(e =>
            {
                e.ToTable("trip");

            });

        }
    }
}

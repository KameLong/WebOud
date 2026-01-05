// api/tripsApi.ts
import { SERVER_URL } from "../ServerSetting.ts";
import type {TripDto, TripWithStopTimesDto} from "../DTO/TripDTO.ts";

export async function addTripBlock(
    tripDtos: TripWithStopTimesDto[]
): Promise<TripWithStopTimesDto[]> {
    const res = await fetch(`${SERVER_URL}/trips/block`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tripDtos),
    });

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`AddTripBlock failed: HTTP ${res.status} ${text}`);
    }

    // Controller が int を返す場合もあるので両対応
    const data = await res.json();
    return data as TripWithStopTimesDto[];
}

export async function putTrip(trip: TripDto): Promise<void> {
    const res = await fetch(`${SERVER_URL}/trips/${trip.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(trip),
    });

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`AddTripBlock failed: HTTP ${res.status} ${text}`);
    }
}
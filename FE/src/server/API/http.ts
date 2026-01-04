import {SERVER_URL} from "../ServerSetting.ts";

const BASE_URL=SERVER_URL;
async function request<T>(
    input: RequestInfo,
    init?: RequestInit
): Promise<T> {
    const res = await fetch(BASE_URL + input, {
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
        },
        ...init,
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`${res.status}: ${text}`);
    }

    return res.json() as Promise<T>;
}

export const http = {
    get:  <T>(url: string) => request<T>(url),
    post: <T>(url: string, body?: unknown) =>
        request<T>(url, { method: "POST", body: JSON.stringify(body) }),
    put:  <T>(url: string, body?: unknown) =>
        request<T>(url, { method: "PUT", body: JSON.stringify(body) }),
    del:  <T>(url: string) =>
        request<T>(url, { method: "DELETE" }),
};
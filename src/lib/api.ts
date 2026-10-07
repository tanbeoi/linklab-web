import type { ApiError } from "@/types/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export class ApiRequestError extends Error {
    constructor(
        message: string,
        public readonly status: number,
    ) {
        super(message);
        this.name = "ApiRequestError";
    }
}

export async function apiRequest<T>(
    // path if API string, options is an optional parameter of type RequestInit
    path: string,
    options: RequestInit = {},
) : Promise<T> {
    if (!API_URL) {
        throw new Error("API URL is not defined");
    }

    // create a new Headers object 
    // if options.headers is empty then is becomes an empty headers collection 
    // if options.headers is not empty then it preserves the existing headers' values 
    const headers = new Headers(options.headers);

    // check if the request has a body and if content-type has not been already provided
    if (options.body && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
    }
    
    // typeof window !== "undefined" checks if the code is running in a browser environment
    // if YES? then attach the token to the authorization header 
    const token = typeof window !== "undefined" 
        ? localStorage.getItem("linklab_token")
        : null;

    if (token) {
        headers.set("Authorization", `Bearer ${token}`);
    }

    const response = await fetch(`${API_URL}${path}`, {
        ...options,
        headers,
    });

    const responseText = await response.text();
    let data: unknown = null;

    if (responseText) {
        try {
            data = JSON.parse(responseText);
        } catch {
            data = responseText;
        }
    }

    // If response is not ok, then return as ApiError in order to fetch the error message 
    // If response is ok, then return the data as Type T because we dont know which API request we are sending, 
    // therefore we don't know which DTO response we will get
    if (!response.ok) {
        const apiError =
            data !== null && typeof data === "object"
                ? data as ApiError
                : null;

        throw new ApiRequestError(
            apiError?.error ||
                responseText ||
                `Request failed with status ${response.status}`,
            response.status,
        );
    }

    return data as T;
}

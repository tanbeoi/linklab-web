import type { ApiError } from "@/types/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function apiRequest<T>(
    // path if API string, options is an optional parameter of type RequestInit
    path: string,
    options: RequestInit = {},
) : Promise<T> {
    if (!API_URL) {
        throw new Error("API URL is not defined");
    }

    // create a new Headers object 
    // if options.headers is empty thaen is becomes an empty headers collection 
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

    const data = await response.json();

    // If response it ok, then return the data as Type T because we dont know which API request we are sending, therefore we don't know which DTO response we will get
    // If response is not ok, then return as ApiError in order to fetch the error message 
    if (!response.ok) {
        const apiError = data as ApiError;

        throw new Error(
            apiError.error ?? `Request failed with status ${response.status}`,
        );
    }

    return data as T;
}

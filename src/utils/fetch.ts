type GetOptions = {
    url: string;
    params?: Record<string, string>;
    headers?: Record<string, string>;
};

export async function get({ url, params, headers }: GetOptions) {
    const response = await fetch(url + "?" + new URLSearchParams(params), {
        method: "GET",
        headers,
        credentials: "include",
    });

    if (!response.ok) {
        throw new Error(response.statusText);
    }

    return await response.json();
}

type PostOptions = {
    url: string;
    params?: Record<string, unknown> | any[];
    headers?: Record<string, string>;
};

export async function post({ url, params, headers }: PostOptions) {
    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...headers,
        },
        body: JSON.stringify(params ?? {}),
        credentials: "include",
    });

    if (!response.ok) {
        throw new Error(response.statusText);
    }

    return await response.json();
}

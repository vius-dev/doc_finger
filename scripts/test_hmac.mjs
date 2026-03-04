import { webcrypto } from "node:crypto";
const crypto = webcrypto;

async function generateHmacSignature(apiKey, message) {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(apiKey),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    );
    const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
    return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

async function testValidate() {
    const apiKey = "noun-pilot_test_5ebc355231fad9b539dc2fb266199e2f";
    const functionName = "auth";
    const path = "/keys/validate";
    const method = "POST";
    const bodyStr = "{}";

    const timestamp = "2026-03-04T13:20:14.650Z";
    const messagePath = `/${functionName}${path}`;
    const fetchPath = `/functions/v1${messagePath}`;
    const message = `${timestamp}\n${method}\n${messagePath}\n${bodyStr}`;
    const signature = await generateHmacSignature(apiKey, message);

    console.log("Message to sign:\\n" + message);
    console.log("Signature:", signature);

    const url = `https://tzulhmrmscedulpldvnk.supabase.co${fetchPath}`;
    const res = await fetch(url, {
        method,
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
            "X-Timestamp": timestamp,
            "X-Signature": signature
        },
        body: bodyStr
    });

    console.log("Status:", res.status);
    const text = await res.text();
    console.log("Response:", text);
}

testValidate().catch(console.error);

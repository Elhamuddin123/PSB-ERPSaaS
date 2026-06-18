import { TRPCError } from "@trpc/server";

export function isExchangeApiConfigured() {
  return !!process.env.EXCHANGE_API_KEY?.trim() && !!process.env.EXCHANGE_API_URL?.trim();
}

export async function fetchExchangeRates() {
  const apiKey = process.env.EXCHANGE_API_KEY?.trim();
  const url = process.env.EXCHANGE_API_URL?.trim();

  if (!apiKey || !url) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message:
        "Exchange API is not configured. Please set EXCHANGE_API_URL and EXCHANGE_API_KEY.",
    });
  }

  const response = await fetch(`${url}/${apiKey}/latest/USD`);
  if (!response.ok) {
    const body = await response.text();
    throw new TRPCError({
      code: "BAD_GATEWAY",
      message: `Exchange API request failed with status ${response.status}: ${body}`,
    });
  }

  const text = await response.text();

  console.log("[raw exchange response]", text);

  let data;

  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(
      "Exchange API returned HTML instead of JSON. Check URL/API key."
    );
  }

  if (!data?.conversion_rates) {
    throw new Error(
      "Rates not found in API response"
    );
  }

  return [
    { code:"AFN", rate:data.conversion_rates.AFN },
    { code:"EUR", rate:data.conversion_rates.EUR },
    { code:"AED", rate:data.conversion_rates.AED },
    { code:"SAR", rate:data.conversion_rates.SAR },
    { code:"PKR", rate:data.conversion_rates.PKR },
  ];
}
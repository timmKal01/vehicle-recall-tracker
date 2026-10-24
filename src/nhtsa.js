import { log } from 'apify';

// Some public APIs refuse requests that identify themselves only as Node's default "node" user agent (data.cms.gov
// started doing so in October 2026), so every request says which tool is asking and where to find it.
const USER_AGENT = 'vehicle-recall-tracker/0.1 (+https://apify.com/m_ctim/vehicle-recall-tracker)';

const BASE_URL = 'https://api.nhtsa.gov/recalls/recallsByVehicle';
const REQUEST_TIMEOUT_MS = 20_000;
const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 1000;

/** NHTSA returns ReportReceivedDate as DD/MM/YYYY. */
function toIsoDate(dmy) {
    if (typeof dmy !== 'string') return null;
    const [day, month, year] = dmy.split('/');
    if (!day || !month || !year) return null;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

async function fetchWithTimeout(url) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
        return await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: controller.signal });
    } finally {
        clearTimeout(timer);
    }
}

async function fetchRecallsForYear(make, model, year) {
    const url = new URL(BASE_URL);
    url.searchParams.set('make', make);
    url.searchParams.set('model', model);
    url.searchParams.set('modelYear', String(year));

    let lastErr;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
            const res = await fetchWithTimeout(url);
            const body = await res.json().catch(() => null);

            // NHTSA returns HTTP 400 even for a genuine zero-results response (e.g. a model
            // year with no recalls filed yet) — trust the parsed body over the status code.
            if (body && Array.isArray(body.results)) {
                return body.results;
            }

            // A rate limit, server error, or a body that failed to parse at all is a transient
            // condition worth retrying; anything else (an unexpected 4xx with a real error body)
            // is treated as a real failure.
            const retryable = res.status === 429 || res.status >= 500 || body === null;
            lastErr = new Error(
                `NHTSA API request failed for model year ${year}: ${res.status} ${res.statusText}`,
            );
            if (!retryable) throw lastErr;
        } catch (err) {
            lastErr = err.name === 'AbortError'
                ? new Error(`NHTSA API request timed out for model year ${year} (attempt ${attempt}/${MAX_ATTEMPTS})`)
                : err;
        }

        if (attempt < MAX_ATTEMPTS) {
            const delay = BASE_DELAY_MS * 2 ** (attempt - 1);
            log.warning(`Retrying NHTSA request for model year ${year} in ${delay}ms (attempt ${attempt}/${MAX_ATTEMPTS}): ${lastErr.message}`);
            await new Promise((r) => setTimeout(r, delay));
        }
    }
    throw lastErr;
}

export async function fetchRecalls({ make, model, yearFrom, yearTo, maxResults }) {
    const years = [];
    for (let year = yearFrom; year <= yearTo; year++) years.push(year);

    const byCampaign = new Map();
    for (const year of years) {
        const recalls = await fetchRecallsForYear(make, model, year);
        for (const recall of recalls) {
            try {
                if (!recall || typeof recall !== 'object') {
                    log.warning(`Skipping malformed recall entry for model year ${year} (not an object).`);
                    continue;
                }
                const campaignNumber = recall.NHTSACampaignNumber;
                if (!campaignNumber || byCampaign.has(campaignNumber)) continue;

                byCampaign.set(campaignNumber, {
                    campaignNumber,
                    manufacturer: recall.Manufacturer ?? null,
                    make: recall.Make ?? null,
                    model: recall.Model ?? null,
                    modelYear: recall.ModelYear ?? null,
                    component: recall.Component ?? null,
                    summary: recall.Summary ?? null,
                    consequence: recall.Consequence ?? null,
                    remedy: recall.Remedy ?? null,
                    notes: recall.Notes ?? null,
                    reportReceivedDate: toIsoDate(recall.ReportReceivedDate),
                    parkIt: recall.parkIt ?? null,
                    parkOutside: recall.parkOutSide ?? null,
                    overTheAirUpdate: recall.overTheAirUpdate ?? null,
                });
            } catch (err) {
                log.warning(`Skipping malformed recall record for model year ${year}: ${err.message}`);
            }
        }
    }

    return [...byCampaign.values()]
        .sort((a, b) => (b.reportReceivedDate ?? '').localeCompare(a.reportReceivedDate ?? ''))
        .slice(0, maxResults);
}

const BASE_URL = 'https://api.nhtsa.gov/recalls/recallsByVehicle';

/** NHTSA returns ReportReceivedDate as DD/MM/YYYY. */
function toIsoDate(dmy) {
    const [day, month, year] = dmy.split('/');
    if (!day || !month || !year) return null;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

async function fetchRecallsForYear(make, model, year) {
    const url = new URL(BASE_URL);
    url.searchParams.set('make', make);
    url.searchParams.set('model', model);
    url.searchParams.set('modelYear', String(year));

    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`NHTSA API request failed for model year ${year}: ${res.status} ${res.statusText}`);
    }
    const body = await res.json();
    return body.results ?? [];
}

export async function fetchRecalls({ make, model, yearFrom, yearTo, maxResults }) {
    const years = [];
    for (let year = yearFrom; year <= yearTo; year++) years.push(year);

    const byCampaign = new Map();
    for (const year of years) {
        const recalls = await fetchRecallsForYear(make, model, year);
        for (const recall of recalls) {
            if (byCampaign.has(recall.NHTSACampaignNumber)) continue;
            byCampaign.set(recall.NHTSACampaignNumber, {
                campaignNumber: recall.NHTSACampaignNumber,
                manufacturer: recall.Manufacturer,
                make: recall.Make,
                model: recall.Model,
                modelYear: recall.ModelYear,
                component: recall.Component,
                summary: recall.Summary,
                consequence: recall.Consequence,
                remedy: recall.Remedy,
                notes: recall.Notes,
                reportReceivedDate: toIsoDate(recall.ReportReceivedDate),
                parkIt: recall.parkIt,
                parkOutside: recall.parkOutSide,
                overTheAirUpdate: recall.overTheAirUpdate,
            });
        }
    }

    return [...byCampaign.values()]
        .sort((a, b) => (b.reportReceivedDate ?? '').localeCompare(a.reportReceivedDate ?? ''))
        .slice(0, maxResults);
}

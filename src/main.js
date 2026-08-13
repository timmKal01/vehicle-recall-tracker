import { Actor, log } from 'apify';
import { fetchRecalls } from './nhtsa.js';

await Actor.init();

const input = (await Actor.getInput()) ?? {};
const { make, model, yearFrom = 2018, yearTo = 2026, maxResults = 50 } = input;

if (!make || !model) {
    throw new Error('Both "make" and "model" are required.');
}
if (yearFrom > yearTo) {
    throw new Error('"yearFrom" must be less than or equal to "yearTo".');
}
if (yearTo - yearFrom > 15) {
    throw new Error('Model year range cannot exceed 15 years.');
}

/** Must match the event name configured in this Actor's pay-per-event pricing on Apify. */
const RECALL_SEARCH_EVENT = 'recall-search';

const recalls = await fetchRecalls({
    make,
    model,
    yearFrom,
    yearTo,
    maxResults: Math.min(maxResults, 200),
});

for (const recall of recalls) {
    await Actor.pushData(recall);
}

await Actor.charge({ eventName: RECALL_SEARCH_EVENT });

log.info(`Pushed ${recalls.length} recall(s) for ${make} ${model} (${yearFrom}-${yearTo})`);

await Actor.exit();

# Vehicle Recall Tracker — NHTSA Safety Recalls by Make/Model

Search official NHTSA safety recalls for a specific vehicle make, model,
and model-year range. Get the campaign number, affected component, defect
summary, consequence, and free remedy for each recall.

Built for dealers, fleet managers, mechanics, and shoppers who want a
vehicle's full safety-recall history in one call instead of digging
through NHTSA.gov by hand.

## Input

```json
{
  "make": "Honda",
  "model": "Accord",
  "yearFrom": 2018,
  "yearTo": 2022,
  "maxResults": 50
}
```

| Field | Type | Description |
|---|---|---|
| `make` | string | Vehicle manufacturer, e.g. `"Honda"`, `"Ford"`, `"Toyota"`. |
| `model` | string | Vehicle model, e.g. `"Accord"`, `"Explorer"`, `"Camry"`. |
| `yearFrom` | number | Earliest model year to search (inclusive). Default `2018`. |
| `yearTo` | number | Latest model year to search (inclusive). Default `2026`. Range capped at 15 years. |
| `maxResults` | number | Max recalls to return, most recent first. Default `50`, max `200`. |

## Output

One record per recall campaign:

```json
{
  "campaignNumber": "20V771000",
  "manufacturer": "Honda (American Honda Motor Co.)",
  "make": "HONDA",
  "model": "ACCORD",
  "modelYear": "2020",
  "component": "ELECTRICAL SYSTEM:BODY CONTROL MODULE:SOFTWARE",
  "summary": "Honda (American Honda Motor Co.) is recalling certain 2018-2020 Accord Sedan, Accord Hybrid, and 2019-2020 Insight vehicles. A software error may cause intermittent or continuous disruptions in communication between the Body Control Module (BCM) and other components.",
  "consequence": "Various system malfunctions such as inoperative windshield wipers, defroster, rearview camera, or exterior lighting can increase the risk of a crash.",
  "remedy": "Honda will notify owners, and dealers will update the BCM software, free of charge.",
  "notes": "Owners may also contact the National Highway Traffic Safety Administration Vehicle Safety Hotline at 1-888-327-4236.",
  "reportReceivedDate": "2020-12-10",
  "parkIt": false,
  "parkOutside": false,
  "overTheAirUpdate": false
}
```

A search with no matching recalls returns no items but is still billed
once for the search.

## How it works

Direct calls to the official [NHTSA Recalls
API](https://www.nhtsa.gov/nhtsa-datasets-and-apis) (`api.nhtsa.gov`),
one request per model year in the requested range, deduplicated by
recall campaign number (a single recall can span multiple model years
and would otherwise show up once per year). No proxy, no key, no
scraping — public-domain U.S. government data.

## Pricing note

Billed per **search**, not per recall returned — one charge whether the
search spans one model year or fifteen, and whether it returns 0 recalls
or 200.

## Related products

- [Product Recall Alert](https://github.com/timmKal01/product-recall-alert) — the FDA equivalent for drug, food, and medical device recalls
- [Vehicle Complaint Tracker](https://github.com/timmKal01/vehicle-complaint-tracker) — raw owner complaints from the same NHTSA data family, the "before" to this actor's "after"

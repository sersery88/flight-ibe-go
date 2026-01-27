# Flight IBE - Go Backend

A production-ready Go backend for Flight Internet Booking Engine with Amadeus Self-Service API integration.

> **Based on:** [sersery88/flight-ibe](https://github.com/sersery88/flight-ibe) (Rust implementation)  
> **API Docs:** [sersery88/amadeus-api-docs](https://github.com/sersery88/amadeus-api-docs)

## Features

- 🔍 **Flight Search** - Search flight offers by origin, destination, dates
- 💰 **Pricing** - Get final pricing with taxes and fees
- ✈️ **Booking** - Create, retrieve, and cancel flight orders (PNR)
- 💺 **Seat Maps** - Display aircraft seat maps for seat selection
- 📊 **Flight Status** - Real-time flight tracking
- 🌍 **Inspiration** - Find destinations by budget
- 🏷️ **Reference Data** - Airport/city search, airline lookup

## Tech Stack

- **Go 1.22+**
- **Gin** - HTTP framework
- **OAuth2** - Amadeus authentication with token caching
- **Rate Limiting** - Per-IP request throttling

## Quick Start

### 1. Clone & Setup

```bash
git clone https://github.com/sersery88/flight-ibe-go.git
cd flight-ibe-go
cp .env.example .env
```

### 2. Get Amadeus Credentials

1. Register at [developers.amadeus.com](https://developers.amadeus.com)
2. Create an application
3. Copy your API Key and Secret to `.env`:

```env
AMADEUS_CLIENT_ID=your_api_key
AMADEUS_CLIENT_SECRET=your_api_secret
AMADEUS_ENV=test
```

### 3. Run

```bash
# Install dependencies
go mod download

# Run server
make run
# or
go run ./cmd/server
```

Server starts at `http://localhost:8080`

## API Endpoints

### Flight Search & Booking

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/flights/search` | Search flight offers |
| POST | `/api/flights/price` | Get final pricing |
| POST | `/api/flights/book` | Create booking (PNR) |
| GET | `/api/flights/orders/:id` | Get booking details |
| DELETE | `/api/flights/orders/:id` | Cancel booking |
| POST | `/api/flights/seatmap` | Get seat map |
| GET | `/api/flights/status` | Check flight status |
| GET | `/api/flights/inspirations` | Find destinations |

### Reference Data

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/locations?keyword=` | Search airports/cities |

### Health Check

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Server status |

## Usage Examples

### Search Flights

```bash
curl -X POST http://localhost:8080/api/flights/search \
  -H "Content-Type: application/json" \
  -d '{
    "origin": "ZRH",
    "destination": "BCN",
    "departureDate": "2026-03-15",
    "returnDate": "2026-03-22",
    "adults": 2,
    "travelClass": "ECONOMY",
    "currency": "EUR"
  }'
```

### Price Selected Offer

```bash
curl -X POST http://localhost:8080/api/flights/price \
  -H "Content-Type: application/json" \
  -d '{
    "flightOffers": [<offer_from_search>]
  }'
```

### Create Booking

```bash
curl -X POST http://localhost:8080/api/flights/book \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "type": "flight-order",
      "flightOffers": [<priced_offer>],
      "travelers": [{
        "id": "1",
        "dateOfBirth": "1990-01-15",
        "name": {
          "firstName": "MAX",
          "lastName": "MUSTERMANN"
        },
        "contact": {
          "emailAddress": "max@example.com",
          "phones": [{
            "countryCallingCode": "41",
            "number": "791234567"
          }]
        }
      }]
    }
  }'
```

### Search Airports

```bash
curl "http://localhost:8080/api/locations?keyword=zur"
```

### Check Flight Status

```bash
curl "http://localhost:8080/api/flights/status?carrierCode=LX&flightNumber=1&date=2026-03-15"
```

## Project Structure

```
flight-ibe-go/
├── cmd/
│   └── server/
│       └── main.go          # Entry point
├── internal/
│   ├── amadeus/
│   │   ├── client.go        # OAuth2 client with token cache
│   │   └── flights.go       # Amadeus API methods
│   ├── handlers/
│   │   └── flights.go       # HTTP handlers
│   ├── middleware/
│   │   └── ratelimit.go     # Rate limiting, logging
│   └── models/
│       ├── requests.go      # Request structs
│       └── responses.go     # Response structs
├── .env.example
├── Dockerfile
├── Makefile
└── go.mod
```

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `AMADEUS_CLIENT_ID` | API Key | required |
| `AMADEUS_CLIENT_SECRET` | API Secret | required |
| `AMADEUS_ENV` | `test` or `production` | `test` |
| `PORT` | Server port | `8080` |
| `GIN_MODE` | `debug` or `release` | `debug` |

## Docker

```bash
# Build
docker build -t flight-ibe-go .

# Run
docker run -p 8080:8080 \
  -e AMADEUS_CLIENT_ID=xxx \
  -e AMADEUS_CLIENT_SECRET=xxx \
  flight-ibe-go
```

## Production Notes

1. **Environment**: Set `AMADEUS_ENV=production` for live data (paid)
2. **Rate Limits**: Amadeus test: 10 req/s, production: varies by plan
3. **Token Caching**: Tokens auto-refresh with 2-minute buffer
4. **CORS**: Configure `AllowOrigins` for your frontend domain

## Related Projects

- [flight-ibe](https://github.com/sersery88/flight-ibe) - Rust backend + React frontend
- [amadeus-api-docs](https://github.com/sersery88/amadeus-api-docs) - Go-focused API documentation
- [ETG-Hotel-IBE](https://github.com/sersery88/ETG-Hotel-IBE) - Hotel booking engine

## License

MIT

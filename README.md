# Flight IBE Go - Enterprise Flight Booking Engine

A high-performance, enterprise-grade Flight Internet Booking Engine built in Go with the Amadeus API. Designed for B2B OTA platforms with a focus on scalability, reliability, and observability.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Flight IBE Go                                   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        Interfaces Layer                              │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────────┐     │   │
│  │  │   HTTP Handlers │  │    Middleware   │  │    Router/Mux    │     │   │
│  │  │   (Gin-based)   │  │ (Auth, CORS,    │  │                  │     │   │
│  │  │                 │  │  Rate Limit,    │  │                  │     │   │
│  │  │                 │  │  Tracing, Log)  │  │                  │     │   │
│  │  └─────────────────┘  └─────────────────┘  └──────────────────┘     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                       Application Layer                              │   │
│  │  ┌────────────────────────────────────────────────────────────┐     │   │
│  │  │                     FlightService                           │     │   │
│  │  │  • Search with caching & request coalescing                 │     │   │
│  │  │  • Pricing                                                  │     │   │
│  │  │  • Booking                                                  │     │   │
│  │  │  • Filtering (via OpenSearch)                               │     │   │
│  │  └────────────────────────────────────────────────────────────┘     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         Domain Layer                                 │   │
│  │  ┌──────────────┐  ┌──────────────────────────────────────────┐     │   │
│  │  │   Entities   │  │             Ports (Interfaces)           │     │   │
│  │  │ FlightOffer  │  │  FlightSearcher, FlightBooker, Cache,    │     │   │
│  │  │ Booking      │  │  FlightIndexer, Metrics, HealthChecker   │     │   │
│  │  │ Traveler     │  │                                          │     │   │
│  │  └──────────────┘  └──────────────────────────────────────────┘     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      Infrastructure Layer                            │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐  │   │
│  │  │   Amadeus   │  │  LRU Cache  │  │  OpenSearch │  │ Prometheus │  │   │
│  │  │   Adapter   │  │             │  │   Indexer   │  │  Metrics   │  │   │
│  │  └──────┬──────┘  └─────────────┘  └─────────────┘  └────────────┘  │   │
│  │         │         ┌─────────────┐  ┌─────────────┐  ┌────────────┐  │   │
│  │         │         │  Coalescer  │  │    OTel     │  │   slog     │  │   │
│  │         │         │             │  │   Tracing   │  │  Logging   │  │   │
│  │         │         └─────────────┘  └─────────────┘  └────────────┘  │   │
│  └─────────┼───────────────────────────────────────────────────────────┘   │
│            │                                                               │
└────────────┼───────────────────────────────────────────────────────────────┘
             │
             ▼
    ┌────────────────┐
    │  Amadeus API   │
    │  (Self-Service)│
    └────────────────┘
```

## ✨ Features

### Core Functionality
- **Flight Search** - Search for flights with comprehensive filtering
- **Flight Pricing** - Get real-time pricing for selected offers
- **Booking** - Create, retrieve, and cancel flight bookings
- **Location Search** - Airport and city autocomplete

### Performance & Reliability
- **In-Memory LRU Caching** - Fast response times with configurable TTL
- **Request Coalescing** - Prevents duplicate API calls for identical searches
- **Connection Pooling** - Efficient HTTP connection reuse
- **Graceful Shutdown** - Clean shutdown handling

### Observability
- **Structured Logging (slog)** - JSON-formatted logs with request context
- **Prometheus Metrics** - Search latency, cache hit rates, API errors
- **OpenTelemetry Tracing** - Distributed tracing with Jaeger export
- **Health Checks** - Kubernetes-ready liveness/readiness probes

### Security & API
- **Rate Limiting** - Per-IP request limiting with burst support
- **CORS** - Configurable cross-origin resource sharing
- **Request ID** - Traceable request IDs in all responses
- **API Versioning** - `/api/v1/` prefix for future compatibility

## 🚀 Quick Start

### Prerequisites
- Go 1.22+
- Docker & Docker Compose (optional)
- Amadeus API credentials ([Get them here](https://developers.amadeus.com))

### Run Locally

```bash
# Clone the repository
git clone https://github.com/sersery88/flight-ibe-go
cd flight-ibe-go

# Copy environment file
cp .env.example .env
# Edit .env with your Amadeus credentials

# Download dependencies
make deps

# Run the server
make run

# Or with debug logging
make run-dev
```

### Run with Docker Compose

```bash
# Start all services (API, OpenSearch, Prometheus, Grafana, Jaeger)
make docker-up

# View logs
make docker-logs

# Stop services
make docker-down
```

## 🔧 Configuration

| Environment Variable | Description | Default |
|---------------------|-------------|---------|
| `PORT` | Server port | `8080` |
| `ENVIRONMENT` | Environment name | `development` |
| `AMADEUS_CLIENT_ID` | Amadeus API client ID | Required |
| `AMADEUS_CLIENT_SECRET` | Amadeus API client secret | Required |
| `AMADEUS_ENV` | Amadeus environment (`test`/`production`) | `test` |
| `CACHE_SIZE` | Maximum cache entries | `1000` |
| `CACHE_TTL` | Cache time-to-live | `15m` |
| `RATE_LIMIT_RPS` | Requests per second per IP | `10` |
| `RATE_LIMIT_BURST` | Burst size for rate limiter | `20` |
| `ENABLE_TRACING` | Enable OpenTelemetry tracing | `false` |
| `ENABLE_METRICS` | Enable Prometheus metrics | `true` |
| `OTLP_ENDPOINT` | OTLP collector endpoint | `` |
| `LOG_LEVEL` | Log level (`debug`/`info`) | `info` |

## 📡 API Endpoints

### Flight Operations
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/flights/search` | Search for flights |
| `POST` | `/api/v1/flights/filter` | Filter cached results |
| `POST` | `/api/v1/flights/price` | Get pricing for offers |
| `POST` | `/api/v1/flights/book` | Create booking |
| `GET` | `/api/v1/flights/orders/:id` | Get booking |
| `DELETE` | `/api/v1/flights/orders/:id` | Cancel booking |

### Health & Metrics
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Full health check |
| `GET` | `/health/live` | Liveness probe |
| `GET` | `/health/ready` | Readiness probe |
| `GET` | `/metrics` | Prometheus metrics |

### Example: Search Flights

```bash
curl -X POST http://localhost:8080/api/v1/flights/search \
  -H "Content-Type: application/json" \
  -d '{
    "origin": "ZRH",
    "destination": "LHR",
    "departureDate": "2024-03-15",
    "adults": 1,
    "travelClass": "ECONOMY",
    "currency": "CHF"
  }'
```

## 📊 Monitoring

### Grafana Dashboards
Access Grafana at `http://localhost:3000` (admin/admin) with pre-configured:
- Flight IBE Overview dashboard
- Request latency histograms
- Cache hit/miss rates
- API error rates

### Prometheus Metrics
Key metrics exposed at `/metrics`:
- `flight_ibe_search_requests_total` - Total searches
- `flight_ibe_search_latency_milliseconds` - Search latency histogram
- `flight_ibe_cache_hits_total` - Cache hits
- `flight_ibe_cache_misses_total` - Cache misses
- `flight_ibe_api_errors_total` - API errors by type
- `flight_ibe_api_latency_milliseconds` - External API latency

### Jaeger Tracing
Access Jaeger UI at `http://localhost:16686` to trace requests through the system.

## 🏛️ Project Structure

```
flight-ibe-go/
├── cmd/
│   └── server/
│       └── main.go              # Application entry point
├── internal/
│   ├── domain/                  # Business entities & ports
│   │   ├── entities.go          # Domain models
│   │   └── ports.go             # Interface definitions
│   ├── application/             # Use cases / business logic
│   │   └── flight_service.go    # Flight service implementation
│   ├── infrastructure/          # External adapters
│   │   ├── amadeus/             # Amadeus API adapter
│   │   ├── cache/               # LRU cache implementation
│   │   ├── coalesce/            # Request coalescer
│   │   ├── metrics/             # Prometheus metrics
│   │   └── observability/       # OpenTelemetry setup
│   └── interfaces/              # HTTP layer
│       └── http/
│           ├── handlers.go      # HTTP handlers
│           ├── middleware.go    # HTTP middleware
│           └── router.go        # Route configuration
├── config/                      # Configuration files
│   ├── prometheus.yml
│   └── grafana/
├── frontend/                    # Optional web UI
├── docker-compose.yml           # Local development stack
├── Dockerfile                   # Multi-stage build
├── Makefile                     # Build automation
└── README.md
```

## 🧪 Testing

```bash
# Run all tests
make test

# Run with coverage
make test-coverage

# Run benchmarks
make benchmark
```

## 🔐 Production Deployment

### Kubernetes
The service is Kubernetes-ready with:
- Liveness probe: `GET /health/live`
- Readiness probe: `GET /health/ready`
- Metrics endpoint: `GET /metrics`
- Graceful shutdown handling

### Environment Variables for Production
```bash
ENVIRONMENT=production
AMADEUS_ENV=production
ENABLE_TRACING=true
OTLP_ENDPOINT=otel-collector:4318
RATE_LIMIT_RPS=100
CACHE_SIZE=10000
```

## 📈 Performance Considerations

### Caching Strategy
- **15-minute TTL** - Flight prices change frequently
- **LRU eviction** - Keeps frequently accessed routes cached
- **Request coalescing** - Prevents thundering herd on cache miss

### Recommended Setup (Single Server)
- **Memory**: 2GB+ (cache size depends on traffic)
- **CPU**: 2+ cores
- **Network**: Low-latency connection to Amadeus API

### For High Traffic
Consider:
- Redis for distributed caching
- OpenSearch for advanced filtering
- Horizontal scaling with sticky sessions

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

- [Amadeus for Developers](https://developers.amadeus.com) - Flight API
- [Gin Web Framework](https://gin-gonic.com) - HTTP routing
- [OpenTelemetry](https://opentelemetry.io) - Observability
- [Prometheus](https://prometheus.io) - Metrics

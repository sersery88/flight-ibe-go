# ✈️ Seatmap Feature — Implementierungsplan v2

> **Ziel:** State-of-the-Art Sitzplatzwahl wie bei Lufthansa/Emirates/Google Flights
> **Alle Flugzeugtypen inkl. Multi-Deck (A380, 747)**
> **v2 — 08.02.2026, aktualisiert nach Review**

---

## 1. Architektur-Überblick

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js)                        │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐ │
│  │ SeatmapModal │  │  DeckView    │  │  SeatTooltip      │ │
│  │ (Container)  │→ │  (CSS Grid)  │→ │  (Bottom Sheet)   │ │
│  └──────┬───────┘  └──────────────┘  └───────────────────┘ │
│         │          ┌──────────────┐  ┌───────────────────┐ │
│         │          │  CabinLegend │  │  PriceTierFilter  │ │
│         │          └──────────────┘  └───────────────────┘ │
│         │          ┌──────────────┐  ┌───────────────────┐ │
│         │          │  DeckTabs    │  │  MiniMap          │ │
│         │          └──────────────┘  └───────────────────┘ │
│         │          ┌──────────────┐  ┌───────────────────┐ │
│         │          │ PassengerBar │  │  GroupSuggest     │ │
│         │          └──────────────┘  └───────────────────┘ │
│         │                                                   │
│  ┌──────┴──────────────────────────────────────────────┐   │
│  │           Zustand Store (seat-selection-store)       │   │
│  │  selections · totalCost · sessionStorage persist     │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────┼───────────────────────────────────────────────────┘
          │ POST /api/flights/seatmap  (offer body)
          ▼
┌─────────────────────────────────────────────────────────────┐
│                   BACKEND (Go/Gin)                           │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  /seatmap    │→ │  Amadeus     │→ │  Response        │  │
│  │  Handler     │  │  SeatMap API │  │  Transformer     │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  Redis Cache │  │  Offer Store │  │  Seat Validator  │  │
│  │  (5min TTL)  │  │  (in-memory) │  │  (pre-booking)   │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
│                                                             │
│  POST /v1/shopping/seatmaps  (Amadeus)                      │
│  + Sitzplatz-Daten in CreateOrder (SSR)                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Backend — Go

### 2.1 Amadeus SeatMap API

**Endpoint:** `POST /v1/shopping/seatmaps`
**Input:** Flight Offer(s) als JSON Body (max 6 Offers)
**Output:** Seatmap pro Segment (inkl. Multi-Deck, Facilities, Pricing)

```go
// POST body
{
  "data": [<flight-offer>],
  "included": {
    "travelers": {
      "1": { "id": "1", "travelerType": "ADULT" }
    }
  }
}
```

> **Wichtig:** Traveler-Info mitsenden für personalisierte Preise und FF-Rabatte.

### 2.2 Domain Models (`internal/domain/entities.go`)

```go
// ---- Seatmap Domain Models ----

type SeatmapResponse struct {
    Data     []SeatmapData          `json:"data"`
    Dictionaries *SeatmapDictionaries `json:"dictionaries,omitempty"`
}

type SeatmapDictionaries struct {
    Facilities map[string]string `json:"facility,omitempty"` // Code → Label
    Seat       map[string]string `json:"seatCharacteristic,omitempty"`
}

type SeatmapData struct {
    Type                   string                  `json:"type"`
    ID                     string                  `json:"id"`
    FlightOfferID          string                  `json:"flightOfferId"`
    SegmentID              string                  `json:"segmentId"`
    Departure              FlightEndpoint          `json:"departure"`
    Arrival                FlightEndpoint          `json:"arrival"`
    CarrierCode            string                  `json:"carrierCode"`
    Number                 string                  `json:"number"`
    Operating              *OperatingFlight        `json:"operating,omitempty"`
    Aircraft               Aircraft                `json:"aircraft"`
    Class                  string                  `json:"class"` // RBD
    Decks                  []Deck                  `json:"decks"`
    AircraftCabinAmenities *AircraftCabinAmenities `json:"aircraftCabinAmenities,omitempty"`
    AvailableSeatsCounters []AvailableSeatsCounter `json:"availableSeatsCounters,omitempty"`
}

type Deck struct {
    DeckType          string            `json:"deckType"` // UPPER, MAIN, LOWER
    DeckConfiguration DeckConfiguration `json:"deckConfiguration"`
    Facilities        []Facility        `json:"facilities,omitempty"`
    Seats             []Seat            `json:"seats"`
}

type DeckConfiguration struct {
    Width         int   `json:"width"`
    Length        int   `json:"length"`
    StartSeatRow  int   `json:"startSeatRow"`
    EndSeatRow    int   `json:"endSeatRow"`
    StartWingsX   int   `json:"startWingsX,omitempty"`
    EndWingsX     int   `json:"endWingsX,omitempty"`
    StartWingsRow int   `json:"startWingsRow,omitempty"`
    EndWingsRow   int   `json:"endWingsRow,omitempty"`
    ExitRowsX     []int `json:"exitRowsX,omitempty"`
}

type Facility struct {
    Code        string      `json:"code"`     // LA=Lavatory, G=Galley, CL=Closet, ST=Stairs
    Column      string      `json:"column"`
    Row         string      `json:"row"`
    Position    string      `json:"position"` // FRONT, REAR, SEAT
    Coordinates Coordinates `json:"coordinates"`
}

type Seat struct {
    Cabin                string                 `json:"cabin"` // M=Economy, W=PremEco, C=Business, F=First
    Number               string                 `json:"number"` // z.B. "12B"
    CharacteristicsCodes []string               `json:"characteristicsCodes,omitempty"`
    TravelerPricing      []SeatTravelerPricing  `json:"travelerPricing,omitempty"`
    Coordinates          Coordinates            `json:"coordinates"`
}

type Coordinates struct {
    X int `json:"x"`
    Y int `json:"y"`
}

type SeatTravelerPricing struct {
    TravelerID             string `json:"travelerId"`
    SeatAvailabilityStatus string `json:"seatAvailabilityStatus"` // AVAILABLE, BLOCKED, OCCUPIED
    Price                  *Price `json:"price,omitempty"`
}

type AircraftCabinAmenities struct {
    Power         *AmenityPower          `json:"power,omitempty"`
    Seat          *AmenitySeat           `json:"seat,omitempty"`
    Wifi          *AmenityWifi           `json:"wifi,omitempty"`
    Entertainment []AmenityEntertainment `json:"entertainment,omitempty"`
    Food          *AmenityFood           `json:"food,omitempty"`
    Beverage      *AmenityBeverage       `json:"beverage,omitempty"`
}

type AmenitySeat struct {
    LegSpace  int    `json:"legSpace,omitempty"`  // in inches/cm
    SpaceUnit string `json:"spaceUnit,omitempty"` // INCHES / CENTIMETERS
    Tilt      string `json:"tilt,omitempty"`      // FULL_FLAT / ANGLE_FLAT / NORMAL
}

type AvailableSeatsCounter struct {
    TravelerID string `json:"travelerId"`
    Value      int    `json:"value"`
}
```

### 2.3 Adapter (`internal/infrastructure/amadeus/adapter.go`)

```go
func (a *Adapter) GetSeatmap(ctx context.Context, offers []domain.FlightOffer, travelers []domain.Traveler) ([]domain.SeatmapData, *domain.SeatmapDictionaries, error) {
    // 1. Build request body mit Offer + Traveler-Info
    payload := map[string]interface{}{
        "data": offers,
    }
    if len(travelers) > 0 {
        travMap := make(map[string]interface{})
        for _, t := range travelers {
            travMap[t.ID] = map[string]interface{}{
                "id": t.ID,
                "travelerType": t.Type,
            }
        }
        payload["included"] = map[string]interface{}{
            "travelers": travMap,
        }
    }
    
    // 2. POST to Amadeus
    body, err := a.doRequest(ctx, "POST", "/v1/shopping/seatmaps", payload)
    
    // 3. Parse response inkl. dictionaries
    // 4. Return []SeatmapData + Dictionaries
}
```

### 2.4 Seat Validation vor Buchung

```go
func (a *Adapter) ValidateSeatAvailability(ctx context.Context, offers []domain.FlightOffer, seatSelections map[string]string) error {
    // Frischen Seatmap-Call machen
    // Prüfen ob gewählte Sitze noch AVAILABLE sind
    // Fehler zurückgeben wenn belegt
}
```

### 2.5 Sitzplatz in CreateOrder übergeben (SSR — Special Service Request)

```go
// In CreateOrder: Seat Requests pro Traveler/Segment anhängen
// Amadeus erwartet Seat-Daten im remarks/SSR Bereich
func (a *Adapter) CreateOrder(ctx context.Context, req domain.BookingRequest) (*domain.FlightOrder, error) {
    // Bestehende Logik + Sitzplatz-SSRs
    orderPayload["data"]["remarks"] = buildSeatSSRs(req.SeatSelections)
}
```

### 2.6 API Endpoints

| Method | Path | Beschreibung |
|--------|------|-------------|
| `POST` | `/api/flights/seatmap` | Seatmap für Offer abrufen (Offer als Body) |
| `POST` | `/api/flights/seatmap/validate` | Verfügbarkeit prüfen vor Buchung |

### 2.7 Caching-Strategie

- **Redis Key:** `seatmap:{offerId}:{segmentId}`
- **TTL:** 5 Minuten
- **Invalidierung:** Bei neuer Suche/Offer-Änderung
- **Stale-Warnung:** Frontend zeigt Hinweis wenn Daten > 10min alt

---

## 3. Frontend — React/Next.js

### 3.1 Komponenten-Hierarchie

```
SeatmapModal (Full-Screen Dialog via @base-ui/react/dialog)
├── ModalHeader
│   ├── CloseButton
│   ├── FlightInfo (FRA → BKK, TK1588)
│   └── OperatingCarrierHint ("Betrieben von Turkish Airlines")
│
├── SegmentTabs                    // Tab pro Flugsegment (FRA→IST, IST→BKK)
│
├── DeckTabs                       // Tab pro Deck (Hauptdeck / Oberdeck)
│   └── DeckSideView (SVG)        // Mini-Seitenansicht mit markiertem Deck
│
├── PassengerSelector              // "Sitz für: Max Mustermann (Erw. 1)"
│   └── PassengerChips             // Farbige Chips pro Passagier
│
├── CabinSections                  // Visuell getrennte Kabinen
│   ├── CabinHeader                // "Business Class · Legspace 38" · Lie-flat"
│   │   └── AmenityBadges          // WiFi, Power, Food, Entertainment
│   │
│   ├── SeatmapGrid               // CSS Grid für diese Kabine
│   │   ├── ColumnLabels           // A B C  [Gang]  D E F
│   │   ├── WingIndicator          // Flügel-Overlay
│   │   ├── ExitRowMarker          // 🚪 Notausgang
│   │   ├── FacilityBlock          // 🚻 Toilette, 🍽 Küche, Treppen
│   │   ├── RowNumbers             // 1, 2, 3... (inkl. Lücken)
│   │   ├── CabinDivider           // Trennlinie Business → Economy
│   │   └── SeatCell               // Einzelner Sitz
│   │       ├── SeatShape (div)    // Farbcodiert, rounded
│   │       ├── PassengerMarker    // Farbiger Dot wenn zugewiesen
│   │       └── SeatTooltip        // Hover/Tap Details
│   │
│   └── CabinHeader (nächste Kabine...)
│
├── MiniMap                        // Scroll-Übersicht des ganzen Flugzeugs
│   └── ViewportIndicator          // Zeigt aktuellen sichtbaren Bereich
│
├── Legend                         // Farblegende + Sitz-Charakteristiken
│
├── PriceTierFilter                // Toggle: Alle / Kostenlos / CHF 15-30 / CHF 30+
│
├── SelectionSummary               // Gewählte Sitze pro Passagier + Kosten
│   ├── SeatAssignment (pro Pax)   // "Max M. → 14A (Fenster) · CHF 25"
│   └── TotalCost                  // "Sitzplätze gesamt: CHF 45"
│
└── Footer
    ├── SkipButton                 // "Überspringen" (keine Sitzwahl)
    └── ConfirmButton              // "Sitzplätze bestätigen · CHF 45"
```

### 3.2 Seatmap Grid — Rendering-Strategie

**Technologie: CSS Grid**
- Performanter für Touch-Events und Accessibility als Canvas/SVG
- Jeder Sitz = ein `<button>` (native focus, aria)
- Grid-Koordinaten direkt aus Amadeus `coordinates.x / coordinates.y`

**Grid-Berechnung:**
```typescript
interface GridLayout {
  columns: number[];          // Sortierte Y-Positionen
  aisles: number[];           // Y-Position nach der ein Gang ist
  rowRange: [number, number]; // Start/End Row
  rowGaps: number[];          // Reihen die übersprungen werden (z.B. 13)
  cabinBoundaries: CabinBoundary[];
}

interface CabinBoundary {
  cabin: string;              // M, W, C, F
  startRow: number;
  endRow: number;
  label: string;              // "Economy", "Business", etc.
  amenities?: AircraftCabinAmenities;
}

function buildGridLayout(deck: Deck): GridLayout {
  const allYPositions = new Set(deck.seats.map(s => s.coordinates.y));
  const sortedY = [...allYPositions].sort((a, b) => a - b);
  
  // Gänge erkennen: Lücken in Y-Koordinaten
  const aisles: number[] = [];
  for (let i = 1; i < sortedY.length; i++) {
    if (sortedY[i] - sortedY[i-1] > 1) {
      aisles.push(sortedY[i-1]);
    }
  }
  
  // Reihen-Lücken erkennen (z.B. Reihe 13 übersprungen)
  const allRows = [...new Set(deck.seats.map(s => s.coordinates.x))].sort((a, b) => a - b);
  const rowGaps: number[] = [];
  for (let i = 1; i < allRows.length; i++) {
    if (allRows[i] - allRows[i-1] > 1) {
      for (let gap = allRows[i-1] + 1; gap < allRows[i]; gap++) {
        rowGaps.push(gap);
      }
    }
  }
  
  // Kabinen-Grenzen erkennen
  const cabinBoundaries = detectCabinBoundaries(deck.seats);
  
  return { columns: sortedY, aisles, rowRange: [allRows[0], allRows[allRows.length-1]], rowGaps, cabinBoundaries };
}
```

### 3.3 Multi-Deck Support

| Flugzeug | Decks | Typisches Layout |
|----------|-------|-----------------|
| A380-800 | MAIN + UPPER | Economy unten (3-4-3), Business/First oben (2-2-2) |
| 747-8 | MAIN + UPPER | Economy unten, Business oben (Nose Section) |
| A350 | MAIN only | 3-3-3 Economy, 1-2-1 Business |
| 777 | MAIN only | 3-3-3 oder 3-4-3 Economy, 1-2-1 Business |
| A330 | MAIN only | 2-4-2 Economy, 1-2-1 Business |
| A321/320 | MAIN only | 3-3 durchgehend |
| 737 | MAIN only | 3-3 durchgehend |
| 787 | MAIN only | 3-3-3 Economy, 1-2-1 Business |
| E190/E195 | MAIN only | 2-2 |
| CRJ-900 | MAIN only | 2-2 |

**UI:** Tabs "Hauptdeck" / "Oberdeck" mit Flugzeug-Seitenansicht (SVG)
- Animierter Tab-Wechsel
- Badge pro Deck: "X Sitze verfügbar"

### 3.4 Business/First Class Seat-Shapes

Business/First haben unterschiedliche Konfigurationen:

| Typ | Layout | Darstellung |
|-----|--------|-------------|
| Standard | 2-2-2, 2-3-2 | Normale Zelle, etwas breiter |
| Reverse Herringbone | 1-2-1 | Abgewinkelte Zellen (45°) |
| Staggered | 1-1-1 | Versetzte Zellen |
| Suite | 1-1 | Große Zelle mit Umrandung |
| Lie-flat | diverse | Badge "Lie-flat" im Tooltip |

→ Amadeus liefert die X/Y-Koordinaten — die Zellgröße ergibt sich automatisch aus dem Abstand zum Nachbarsitz. Größere Abstände = größere Grid-Zellen.

### 3.5 Seat-Status & Farbcodierung

| Status | Farbe | CSS | Muster (Farbenblind) |
|--------|-------|-----|---------------------|
| Verfügbar (kostenlos) | Grün | `#10B981` | Ausgefüllt |
| Verfügbar (günstig, < €30) | Blau | `#3B82F6` | Ausgefüllt |
| Verfügbar (mittel, €30-80) | Amber | `#F59E0B` | Ausgefüllt |
| Verfügbar (premium/Extra-Leg) | Violett | `#8B5CF6` | Ausgefüllt + Stern |
| Blockiert | Hellgrau | `#D1D5DB` | Schraffiert |
| Belegt | Dunkelgrau | `#9CA3AF` | Kreuz ✗ |
| Ausgewählt (mein Sitz) | Pink | `#EC4899` | Ausgefüllt + Check ✓ |
| Ausgewählt (anderer Pax) | Pax-Farbe | dynamisch | Ausgefüllt + Nummer |

**Farbblind-Modus:** Zusätzliche Muster (Schraffierung, Punkte, Kreuz) + immer Kontrast-Labels

### 3.6 Seat Characteristics Mapping

```typescript
const SEAT_CHARACTERISTICS: Record<string, { label: string; icon: string; warning?: boolean }> = {
  // IATA Standard Codes (9825)
  'W':  { label: 'Fenster', icon: '🪟' },
  'A':  { label: 'Gang', icon: '🚶' },
  'K':  { label: 'Bulkhead', icon: '🔲' },
  'E':  { label: 'Notausgang', icon: '🚪', warning: true },
  'L':  { label: 'Extra Beinfreiheit', icon: '🦵' },
  'LS': { label: 'Rückenlehne eingeschränkt', icon: '⚠️', warning: true },
  'IE': { label: 'Neben Notausgang', icon: '🚪' },
  'B':  { label: 'Bassinet-Position (Babybett)', icon: '👶' },
  'CH': { label: 'Für Begleithund', icon: '🐕' },
  'V':  { label: 'Eingeschränkte Sicht', icon: '👁️', warning: true },
  'GN': { label: 'Gruppenplatz', icon: '👥' },
  '1':  { label: 'Nicht verstellbar', icon: '⚠️', warning: true },
  'H':  { label: 'Rollstuhlgerecht', icon: '♿' },
  
  // Position Codes
  'OW': { label: 'Über dem Flügel', icon: '✈️' },
  'LA': { label: 'Neben Toilette', icon: '🚻', warning: true },
  'GA': { label: 'Neben Küche', icon: '🍽️', warning: true },
  
  // Amadeus Extensions
  'MV': { label: 'Vor Bildschirm', icon: '📺' },
  '1A_AQC_PREMIUM_SEAT': { label: 'Premium Sitzplatz', icon: '⭐' },
};

// Facility Codes
const FACILITY_TYPES: Record<string, { label: string; icon: string }> = {
  'LA': { label: 'Toilette', icon: '🚻' },
  'G':  { label: 'Küche', icon: '🍽️' },
  'CL': { label: 'Garderobe', icon: '🧥' },
  'ST': { label: 'Treppe', icon: '🪜' },     // A380/747
  'BA': { label: 'Bar', icon: '🍸' },         // Emirates A380
  'SO': { label: 'Lager', icon: '📦' },
};
```

### 3.7 Interaktion

**Mobile (< 768px):**
- **Full-Screen Dialog** (slide-up, `@base-ui/react/dialog`)
- **Pinch-to-Zoom** (`touch-action: manipulation`, CSS `transform: scale()`)
- **Double-Tap-to-Zoom** auf einen Bereich
- **Sitz-Tap** → Bottom Sheet mini mit Details + "Auswählen" Button
- **Long-Press** → Tooltip mit allen Characteristics
- **Sticky Header:** Segment-Tab, Deck-Tab, Passagier-Chips
- **Sticky Footer:** Auswahl-Summary + Bestätigen
- **Landscape-Modus:** Optimiertes Widebody-Layout (mehr Spalten sichtbar)
- **Swipe-Geste:** Links/Rechts zwischen Segmenten

**Desktop (≥ 768px):**
- **Modal** (max-width 1000px, max-height 85vh)
- **Hover** → Tooltip mit Details + Preis
- **Click** → Selection
- **Sidebar rechts:** Legende + Passagier-Zuordnungen + Preis-Summary
- **Keyboard:** ← → ↑ ↓ Navigation, Enter = Auswählen, Escape = Schließen

**Performance:**
- **Virtualisierung** bei > 300 Sitzen: Nur sichtbare Reihen rendern (A380 hat 500+)
- **`React.memo`** auf SeatCell — Re-render nur bei Status-Änderung
- **`will-change: transform`** für smooth Zoom/Scroll

### 3.8 Passagier-Zuordnung

**Regeln:**
1. Aktiver Passagier in Header hervorgehoben
2. Sitz klicken → wird dem aktiven Passagier zugewiesen → Auto-Advance zum nächsten
3. Farbige Marker: Pax 1 = Pink, Pax 2 = Blau, Pax 3 = Grün, Pax 4 = Amber
4. Re-Click auf zugewiesenen Sitz → Zuweisung entfernen
5. Passagier-Chip klicken → diesen Passagier zum aktiven machen

**Spezialfälle:**
- **Infants (<2):** Werden übersprungen (kein eigener Sitz). Bassinet-Positionen (Code `B`) werden für den begleitenden Erwachsenen hervorgehoben.
- **Kinder (2-11):** Können Notausgangsreihen NICHT wählen. System blockiert automatisch.
- **Unaccompanied Minors:** Nicht im Scope (erst bei Order-Erstellung relevant).

### 3.9 Notausgang-Regeln

Wenn ein Sitz mit Characteristic `E` (Exit Row) gewählt wird:

```
┌────────────────────────────────────────────┐
│  ⚠️ Notausgangsreihe                       │
│                                            │
│  Dieser Sitzplatz befindet sich an einem   │
│  Notausgang. Voraussetzungen:              │
│                                            │
│  ✓ Mindestens 15 Jahre alt                 │
│  ✓ Körperlich in der Lage, die Tür zu     │
│    bedienen (ca. 20kg)                     │
│  ✓ Sprachkenntnisse der Crew-Sprache      │
│  ✓ Kein Begleittier / Infant              │
│                                            │
│  [Abbrechen]       [Akzeptieren & Wählen] │
└────────────────────────────────────────────┘
```

### 3.10 Gruppenplatz-Algorithmus

Bei 2+ Passagieren: "Nebeneinander sitzend"-Vorschlag

```typescript
function suggestGroupSeats(
  availableSeats: Seat[],
  passengerCount: number,
  preferences: { window?: boolean; aisle?: boolean; frontOfCabin?: boolean }
): SeatGroup[] {
  // 1. Sitze nach Reihe gruppieren
  // 2. Reihen filtern wo >= passengerCount nebeneinander (gleiche Y-Achse, benachbart)
  // 3. Ranking:
  //    - Sitze nebeneinander (keine Lücke/Gang dazwischen) → Score +10
  //    - Fenster + Gang bei 2 Pax → Score +5
  //    - Gleiche Preisstufe → Score +3
  //    - Vorne im Flugzeug → Score +1 pro Reihe näher am Bug
  // 4. Top 3 Vorschläge zurückgeben
  
  return topSuggestions;
}
```

**UI:** "Vorgeschlagene Plätze für Ihre Gruppe" Banner oben mit 1-Klick-Zuordnung.

---

## 4. Integration in den Booking Flow

### 4.1 Flow-Position

```
Search → Results → [Fare Selection] → Booking Page
                                         │
                                    ┌────┴────────────────────────┐
                                    │  1. Flugübersicht            │
                                    │     └─ [💺 Sitzplatz wählen] │ ← Modal öffnen
                                    │  2. Passagiere               │
                                    │  3. Kontakt                  │
                                    │  4. Sitzplätze (Summary)     │ ← Gewählte Sitze
                                    │  5. Preis + AGB              │
                                    │  6. Buchen                   │
                                    └──────────────────────────────┘
```

**Button pro Segment in der Flugübersicht:**
```
✈ HINFLUG · DO. 4. JUNI
18:55 FRA → 22:15 IST → 15:25 BKK
Economy | U | 30kg | PS

[💺 Sitzplatz wählen]          ← Standard
[💺 14A, 14B gewählt ✓ · €45]  ← Nach Auswahl (editierbar)
```

### 4.2 State Management (Zustand)

```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface SelectedSeat {
  number: string;      // "14A"
  cabin: string;       // "M"
  price?: number;      // 25.00
  currency?: string;   // "EUR"
  characteristics: string[];
  displayLabel: string; // "14A · Fenster"
}

interface SeatSelectionState {
  // segmentId → travelerId → SelectedSeat
  selections: Record<string, Record<string, SelectedSeat>>;
  
  // Computed
  totalSeatCost: number;
  currency: string;
  hasSelections: boolean;
  
  // Freshness
  lastFetchedAt: Record<string, number>; // segmentId → timestamp
  
  // Actions
  selectSeat: (segmentId: string, travelerId: string, seat: SelectedSeat) => void;
  removeSeat: (segmentId: string, travelerId: string) => void;
  clearSegment: (segmentId: string) => void;
  clearAll: () => void;
  isStale: (segmentId: string) => boolean; // > 10min
}

const useSeatSelectionStore = create<SeatSelectionState>()(
  persist(
    (set, get) => ({
      // ... implementation
    }),
    {
      name: 'seat-selection',
      storage: createJSONStorage(() => sessionStorage), // Überlebt Page Refresh
    }
  )
);
```

### 4.3 Preis-Integration

```
1 × Erwachsene              876,64 €
Sitzplätze                    45,00 €
  └ 14A Hinflug (Fenster)     25,00 €
  └ 14A Rückflug (Fenster)    20,00 €
──────────────────────────────────────
Gesamtpreis                  921,64 €
Inkl. 338,27 € Steuern & Gebühren
```

### 4.4 Amadeus Order Creation mit Sitzplätzen

```go
// Seat SSR (Special Service Request) Format für Amadeus
type SeatRequest struct {
    SegmentID  string `json:"segmentId"`
    TravelerID string `json:"travelerId"`
    SeatNumber string `json:"seatNumber"`
}

// In der Order Creation:
// remarks.seatRequests = [{segmentId: "1", travelerId: "1", seatNumber: "14A"}, ...]
```

### 4.5 Pre-Booking Validation

Vor dem finalen Buchungsaufruf:
1. **Seatmap nochmal abrufen** (frische Daten)
2. **Gewählte Sitze prüfen** → Noch AVAILABLE?
3. **Falls belegt:** User informieren, Seatmap neu laden, Alternative vorschlagen
4. **Falls OK:** Buchung mit Sitzplätzen durchführen

---

## 5. Flugzeug-Datenbank

### 5.1 Aircraft Profiles

```typescript
interface AircraftProfile {
  name: string;
  iataCode: string;
  manufacturer: 'Airbus' | 'Boeing' | 'Embraer' | 'Bombardier' | 'ATR';
  decks: ('MAIN' | 'UPPER')[];
  widebody: boolean;
  typicalLayout: string;  // z.B. "3-3" oder "3-4-3"
  svgFamily: string;
  maxPax: number;
}

const AIRCRAFT_PROFILES: Record<string, AircraftProfile> = {
  // Airbus Widebody
  '380': { name: 'Airbus A380', iataCode: '380', manufacturer: 'Airbus', decks: ['MAIN', 'UPPER'], widebody: true, typicalLayout: '3-4-3', svgFamily: 'a380', maxPax: 853 },
  '388': { name: 'Airbus A380-800', iataCode: '388', manufacturer: 'Airbus', decks: ['MAIN', 'UPPER'], widebody: true, typicalLayout: '3-4-3', svgFamily: 'a380', maxPax: 853 },
  '359': { name: 'Airbus A350-900', iataCode: '359', manufacturer: 'Airbus', decks: ['MAIN'], widebody: true, typicalLayout: '3-3-3', svgFamily: 'a350', maxPax: 440 },
  '35K': { name: 'Airbus A350-1000', iataCode: '35K', manufacturer: 'Airbus', decks: ['MAIN'], widebody: true, typicalLayout: '3-3-3', svgFamily: 'a350', maxPax: 480 },
  '333': { name: 'Airbus A330-300', iataCode: '333', manufacturer: 'Airbus', decks: ['MAIN'], widebody: true, typicalLayout: '2-4-2', svgFamily: 'a330', maxPax: 440 },
  '332': { name: 'Airbus A330-200', iataCode: '332', manufacturer: 'Airbus', decks: ['MAIN'], widebody: true, typicalLayout: '2-4-2', svgFamily: 'a330', maxPax: 406 },
  
  // Boeing Widebody
  '74E': { name: 'Boeing 747-400', iataCode: '74E', manufacturer: 'Boeing', decks: ['MAIN', 'UPPER'], widebody: true, typicalLayout: '3-4-3', svgFamily: '747', maxPax: 524 },
  '74H': { name: 'Boeing 747-8', iataCode: '74H', manufacturer: 'Boeing', decks: ['MAIN', 'UPPER'], widebody: true, typicalLayout: '3-4-3', svgFamily: '747', maxPax: 605 },
  '77W': { name: 'Boeing 777-300ER', iataCode: '77W', manufacturer: 'Boeing', decks: ['MAIN'], widebody: true, typicalLayout: '3-4-3', svgFamily: '777', maxPax: 550 },
  '772': { name: 'Boeing 777-200', iataCode: '772', manufacturer: 'Boeing', decks: ['MAIN'], widebody: true, typicalLayout: '3-3-3', svgFamily: '777', maxPax: 440 },
  '789': { name: 'Boeing 787-9', iataCode: '789', manufacturer: 'Boeing', decks: ['MAIN'], widebody: true, typicalLayout: '3-3-3', svgFamily: '787', maxPax: 420 },
  '788': { name: 'Boeing 787-8', iataCode: '788', manufacturer: 'Boeing', decks: ['MAIN'], widebody: true, typicalLayout: '3-3-3', svgFamily: '787', maxPax: 381 },
  
  // Airbus Narrowbody
  '321': { name: 'Airbus A321', iataCode: '321', manufacturer: 'Airbus', decks: ['MAIN'], widebody: false, typicalLayout: '3-3', svgFamily: 'a320', maxPax: 236 },
  '32N': { name: 'Airbus A321neo', iataCode: '32N', manufacturer: 'Airbus', decks: ['MAIN'], widebody: false, typicalLayout: '3-3', svgFamily: 'a320', maxPax: 244 },
  '320': { name: 'Airbus A320', iataCode: '320', manufacturer: 'Airbus', decks: ['MAIN'], widebody: false, typicalLayout: '3-3', svgFamily: 'a320', maxPax: 194 },
  '32A': { name: 'Airbus A320', iataCode: '32A', manufacturer: 'Airbus', decks: ['MAIN'], widebody: false, typicalLayout: '3-3', svgFamily: 'a320', maxPax: 194 },
  '319': { name: 'Airbus A319', iataCode: '319', manufacturer: 'Airbus', decks: ['MAIN'], widebody: false, typicalLayout: '3-3', svgFamily: 'a320', maxPax: 160 },
  
  // Boeing Narrowbody
  '738': { name: 'Boeing 737-800', iataCode: '738', manufacturer: 'Boeing', decks: ['MAIN'], widebody: false, typicalLayout: '3-3', svgFamily: '737', maxPax: 189 },
  '7M8': { name: 'Boeing 737 MAX 8', iataCode: '7M8', manufacturer: 'Boeing', decks: ['MAIN'], widebody: false, typicalLayout: '3-3', svgFamily: '737', maxPax: 210 },
  '739': { name: 'Boeing 737-900', iataCode: '739', manufacturer: 'Boeing', decks: ['MAIN'], widebody: false, typicalLayout: '3-3', svgFamily: '737', maxPax: 220 },
  '7M9': { name: 'Boeing 737 MAX 9', iataCode: '7M9', manufacturer: 'Boeing', decks: ['MAIN'], widebody: false, typicalLayout: '3-3', svgFamily: '737', maxPax: 220 },
  
  // Regional
  'E95': { name: 'Embraer E195', iataCode: 'E95', manufacturer: 'Embraer', decks: ['MAIN'], widebody: false, typicalLayout: '2-2', svgFamily: 'e190', maxPax: 132 },
  'E90': { name: 'Embraer E190', iataCode: 'E90', manufacturer: 'Embraer', decks: ['MAIN'], widebody: false, typicalLayout: '2-2', svgFamily: 'e190', maxPax: 114 },
  'CR9': { name: 'CRJ-900', iataCode: 'CR9', manufacturer: 'Bombardier', decks: ['MAIN'], widebody: false, typicalLayout: '2-2', svgFamily: 'crj', maxPax: 90 },
  'AT7': { name: 'ATR 72', iataCode: 'AT7', manufacturer: 'ATR', decks: ['MAIN'], widebody: false, typicalLayout: '2-2', svgFamily: 'atr', maxPax: 78 },
};
```

### 5.2 SVG Templates (7 Familien)

| Familie | Flugzeuge | Umriss |
|---------|-----------|--------|
| `a380` | A380 | Double-Deck, breiter Rumpf |
| `747` | 747-400, 747-8 | Upper Deck Buckel (Nose) |
| `a350` | A350-900/1000 | Breiter Rumpf, spitze Nase |
| `a330` | A330-200/300, A340 | Breiter Rumpf, runde Nase |
| `777` | 777-200/300, 787 | Breiter Rumpf |
| `a320` | A319/A320/A321, 737 | Schmaler Rumpf |
| `e190` | E190/E195, CRJ, ATR | Kleiner Rumpf |

---

## 6. Fallback-Szenarien

### 6.1 Keine Seatmap verfügbar

Gründe: Airline blockiert, Codeshare-Einschränkung, regionale Carrier

```
┌──────────────────────────────────────┐
│  💺 Sitzplatzwahl nicht verfügbar    │
│                                      │
│  Für diesen Flug ist die Sitzplatz-  │
│  wahl online nicht möglich.          │
│                                      │
│  Sie können Ihren Sitzplatz beim     │
│  Online-Check-in oder am Flughafen   │
│  wählen.                             │
│                                      │
│  [Verstanden]                        │
└──────────────────────────────────────┘
```

### 6.2 Amadeus Test-Umgebung (Dev)

Limitierte Seatmap-Daten → Mock-Generator:

```typescript
function generateMockSeatmap(aircraftCode: string): SeatmapData {
  const profile = AIRCRAFT_PROFILES[aircraftCode];
  // Generiert realistische Seatmap basierend auf typicalLayout
  // Zufällige Belegung (60-80% belegt)
  // Preis-Staffelung nach Position (vorne teurer)
}
```

### 6.3 Sitz zwischen Auswahl und Buchung belegt

```
┌──────────────────────────────────────┐
│  ⚠️ Sitz nicht mehr verfügbar        │
│                                      │
│  Sitz 14A ist leider nicht mehr      │
│  verfügbar. Bitte wählen Sie einen   │
│  anderen Sitzplatz.                  │
│                                      │
│  [Alternative vorschlagen] [Manuell] │
└──────────────────────────────────────┘
```

---

## 7. Accessibility (WCAG 2.1 AA)

- **Semantik:** `role="grid"` + `role="row"` + `role="gridcell"`
- **Labels:** `aria-label="Sitz 12B, Fenster, verfügbar, 25 Euro"` pro Sitz
- **Keyboard:**
  - `← → ↑ ↓` Navigation zwischen Sitzen
  - `Enter / Space` = Sitz auswählen
  - `Escape` = Modal schließen
  - `Tab` = Zum nächsten Bereich (Legend, Summary, etc.)
- **Focus:** Sichtbarer Ring (`focus-visible:ring-2 ring-pink-500`)
- **Screen Reader:** Deck + Kabine + Reihe + Spalte + Status wird angesagt
- **Farbenblind:** Muster + Icons + Text-Labels (nicht nur Farbe)
- **Reduced Motion:** Keine Animationen wenn `prefers-reduced-motion`
- **Touch Target:** Min 44×44px pro Sitz-Button (WCAG)

---

## 8. Währung & Preise

- Amadeus liefert Sitzpreise in der Buchungswährung (meistens EUR)
- Falls abweichend: Backend konvertiert zum Offer-Preis-Währung
- Anzeige: Konsistent mit dem restlichen Booking Flow
- Kostenlose Sitze: "Inklusive" Badge statt "0,00 €"
- Preis-Tiers berechnet sich relativ: min/max der verfügbaren Preise → 3 Stufen

---

## 9. Codeshare & Operating Carrier

- Amadeus SeatMap API liefert `operating.carrierCode` wenn abweichend
- **UI:** "Betrieben von [Operating Carrier]" Hinweis im Modal-Header
- Seatmap ist IMMER vom **Operating Carrier** (nicht Marketing Carrier)
- Aircraft-Type kann sich bei Codeshare unterscheiden

---

## 10. Implementierungs-Phasen

### Phase 1 — Backend + Basic Grid (2-3 Tage)
- [ ] Domain Models erweitern (SeatmapData, Deck, Seat, etc.)
- [ ] Amadeus SeatMap API Adapter implementieren
- [ ] `/api/flights/seatmap` POST Endpoint
- [ ] Redis Caching (5min TTL)
- [ ] Mock-Seatmap Generator für Test-Umgebung
- [ ] Frontend: TypeScript Types
- [ ] Frontend: `useSeatmap()` React Query Hook
- [ ] Frontend: SeatmapModal + SeatmapGrid (CSS Grid, Single Deck)
- [ ] Frontend: SeatCell + Tooltip
- [ ] Frontend: Basic Selection (Klick = Auswählen)
- [ ] Integration Test mit Amadeus Test API

### Phase 2 — Multi-Deck + Premium UX (2 Tage)
- [ ] Multi-Deck Tabs (A380/747 MAIN + UPPER)
- [ ] Segment-Tabs (pro Flugsegment)
- [ ] Kabinen-Grenzen (Business → Economy Divider)
- [ ] Reihen-Lücken-Handling (übersprungene Reihen)
- [ ] Facilities (Toiletten, Küche, Treppe, Bar)
- [ ] Wing Indicator + Exit Row Markierung
- [ ] Flugzeug-SVG Outlines (7 Familien)
- [ ] MiniMap mit Viewport-Indicator
- [ ] Pinch-to-Zoom + Double-Tap auf Mobile
- [ ] Landscape-Optimierung

### Phase 3 — Booking Integration + Multi-Pax (1-2 Tage)
- [ ] "Sitzplatz wählen" Button in Booking Page
- [ ] Zustand Store mit sessionStorage Persistenz
- [ ] Multi-Passagier Zuordnung (Auto-Advance, Farbige Marker)
- [ ] Infant-Handling (überspringen, Bassinet markieren)
- [ ] Notausgang-Warnung + Bestätigung
- [ ] Gruppenplatz-Algorithmus + Vorschläge
- [ ] Preis-Integration (Seatmap-Kosten → Gesamtpreis)
- [ ] Sitzplatz-Info auf Buchungsbestätigung
- [ ] CreateOrder: Seat SSR an Amadeus übergeben
- [ ] Pre-Booking Validation (Sitze noch frei?)

### Phase 4 — Polish + Accessibility (1 Tag)
- [ ] Farbcodierung nach Preis-Tiers (dynamisch)
- [ ] Legend + Filter (kostenlos / günstig / premium)
- [ ] Cabin Amenities Anzeige (Legspace, WiFi, Power, Tilt)
- [ ] Farbblind-Modus (Muster)
- [ ] WCAG Keyboard Navigation
- [ ] Screen Reader Labels
- [ ] `prefers-reduced-motion`
- [ ] Animations (Seat-Select Pop, Deck-Switch Slide, Modal Spring)
- [ ] Loading Skeleton (Flugzeug-Umriss als Placeholder)
- [ ] Responsive Tests (iPhone SE → iPad → Desktop → Landscape)
- [ ] Stale-Data Warnung (> 10min)

---

## 11. Risiken & Mitigations

| Risiko | Wahrscheinlichkeit | Impact | Mitigation |
|--------|-------------------|--------|-----------|
| Amadeus Test API: keine/limitierte Seatmap | Hoch | Mittel | Mock-Generator basierend auf Aircraft-Type |
| Airline blockiert Seatmap-Zugriff | Mittel | Niedrig | "Beim Check-in wählen" Fallback |
| A380 Upper Deck abweichendes Layout | Niedrig | Mittel | DeckType-basiertes Rendering |
| Performance 500+ Sitzen | Mittel | Mittel | Virtualisiertes Rendering, React.memo |
| Sitz-Preise veraltet | Mittel | Hoch | 5min Cache + Stale-Warning + Pre-Book Validation |
| Sitz zwischen Auswahl und Buchung belegt | Mittel | Hoch | Pre-Booking Validation + Alternative vorschlagen |
| Codeshare: falscher Aircraft-Type | Niedrig | Niedrig | Operating Carrier Info nutzen |
| Währung weicht von Buchung ab | Niedrig | Mittel | Backend-Konvertierung |
| Mobile Touch-Precision bei kleinen Sitzen | Mittel | Mittel | Min 44px Touch-Target + Zoom |

---

## 12. Dateien & Verzeichnisse

```
/root/flight-ibe-go/
├── internal/
│   ├── domain/
│   │   ├── entities.go              # + Seatmap Domain Models
│   │   └── ports.go                 # + SeatmapProvider Interface (besteht schon)
│   ├── infrastructure/
│   │   └── amadeus/
│   │       ├── adapter.go           # + GetSeatmap(), ValidateSeatAvailability()
│   │       └── seatmap_mock.go      # Mock-Generator für Test-Env
│   └── api/
│       ├── handlers.go              # + SeatmapHandler, SeatmapValidateHandler
│       └── routes.go                # + POST /api/flights/seatmap
│
├── frontend/src/
│   ├── components/seatmap/
│   │   ├── seatmap-modal.tsx        # Container + Dialog + Header
│   │   ├── seatmap-grid.tsx         # CSS Grid Renderer
│   │   ├── seat-cell.tsx            # Einzelner Sitz (memo)
│   │   ├── seat-tooltip.tsx         # Hover/Tap Details (Desktop/Mobile)
│   │   ├── deck-tabs.tsx            # Multi-Deck Switching + SVG
│   │   ├── segment-tabs.tsx         # Per-Segment Tabs
│   │   ├── passenger-selector.tsx   # Passagier-Chips + Active State
│   │   ├── cabin-header.tsx         # Kabinen-Info + Amenities
│   │   ├── cabin-divider.tsx        # Trennlinie zwischen Kabinen
│   │   ├── facility-block.tsx       # Toilette/Küche/Treppe
│   │   ├── wing-indicator.tsx       # Flügel-Overlay
│   │   ├── exit-row-marker.tsx      # Notausgang-Markierung
│   │   ├── minimap.tsx              # Scroll-Übersicht
│   │   ├── legend.tsx               # Farblegende + Characteristics
│   │   ├── price-tier-filter.tsx    # Filter nach Preis
│   │   ├── selection-summary.tsx    # Gewählte Sitze + Kosten
│   │   ├── group-suggest.tsx        # Gruppenplatz-Vorschlag
│   │   ├── exit-row-dialog.tsx      # Notausgang-Warnung
│   │   └── no-seatmap-fallback.tsx  # Fallback wenn nicht verfügbar
│   │
│   ├── hooks/
│   │   └── use-seatmap.ts           # React Query Hook
│   │
│   ├── stores/
│   │   └── seat-selection-store.ts  # Zustand + sessionStorage
│   │
│   ├── lib/
│   │   ├── aircraft-profiles.ts     # 30+ Flugzeugtypen
│   │   ├── seat-characteristics.ts  # IATA Code → Label/Icon
│   │   ├── facility-types.ts        # Facility Code → Label/Icon
│   │   ├── seat-grid-builder.ts     # Grid-Layout Berechnung
│   │   └── group-seat-algorithm.ts  # Nebeneinander-Vorschlag
│   │
│   ├── types/
│   │   └── seatmap.ts              # TypeScript Types
│   │
│   └── assets/svg/
│       ├── aircraft-a380.svg
│       ├── aircraft-747.svg
│       ├── aircraft-a350.svg
│       ├── aircraft-a330.svg
│       ├── aircraft-777.svg
│       ├── aircraft-a320.svg
│       └── aircraft-e190.svg
```

---

## 13. Geschätzter Aufwand

| Phase | Aufwand | Priorität |
|-------|---------|-----------|
| Phase 1: Backend + Basic Grid | 2-3 Tage | 🔴 Hoch |
| Phase 2: Multi-Deck + Premium UX | 2 Tage | 🔴 Hoch |
| Phase 3: Booking Integration + Multi-Pax | 1-2 Tage | 🔴 Hoch |
| Phase 4: Polish + Accessibility | 1 Tag | 🟡 Mittel |
| **Gesamt** | **6-8 Tage** | |

---

## 14. Definition of Done

- [ ] Seatmap kann für jeden Amadeus-Offer geladen werden
- [ ] Single-Deck (A320, 737, 777) funktioniert perfekt
- [ ] Multi-Deck (A380, 747) funktioniert perfekt
- [ ] Kabinen-Grenzen sind sichtbar (First/Business/Economy)
- [ ] Multi-Passagier-Zuordnung funktioniert
- [ ] Infants werden übersprungen
- [ ] Notausgang-Warnung wird angezeigt
- [ ] Sitzpreise werden korrekt zum Gesamtpreis addiert
- [ ] Sitzplätze werden an Amadeus CreateOrder übergeben
- [ ] Pre-Booking Validation verhindert doppelte Belegung
- [ ] Mobile: Full-Screen, Pinch-to-Zoom, Touch-Targets ≥ 44px
- [ ] Desktop: Modal, Hover-Tooltips, Keyboard-Navigation
- [ ] Fallback bei fehlender Seatmap
- [ ] sessionStorage Persistenz
- [ ] Accessibility: WCAG 2.1 AA (Keyboard, Screen Reader, Farbblind)

---

*Plan v2 — 08.02.2026 — Vollständig und implementierungsbereit* 🛫

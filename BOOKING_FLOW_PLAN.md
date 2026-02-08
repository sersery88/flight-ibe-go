# 🛫 Professional Booking Flow — Implementierungsplan

> **Ziel:** SOTA 2026 Buchungs-Flow wie Lufthansa.com / Emirates / Booking.com
> **Mobile-First, Multi-Step, Ancillaries, FQTV-Integration**
> **Erstellt:** 08.02.2026

---

## 1. Flow-Überblick

```
┌─────────────────────────────────────────────────────────────────┐
│                     BOOKING FLOW (4 Steps)                       │
│                                                                  │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌─────────────┐ │
│  │  Step 1   │→  │  Step 2   │→  │  Step 3   │→  │   Step 4    │ │
│  │ Passagier │   │  Extras   │   │ Zahlung & │   │ Bestätigung │ │
│  │   daten   │   │ Sitzplatz │   │  Abschluss│   │  & Voucher  │ │
│  │           │   │ Gepäck    │   │           │   │             │ │
│  └──────────┘   └──────────┘   └──────────┘   └─────────────┘ │
│       │               │              │               │          │
│  Formulare      PNR erstellen   Ticketing/       E-Mail +      │
│  Validierung    Seatmap laden   Zahlung          Download      │
│  FQTV           Ancillaries                                    │
│                 laden                                           │
└─────────────────────────────────────────────────────────────────┘
```

### Warum 4 Steps statt 1?
- **FQTV-Benefits:** Vielfliegernummer muss VOR der Seatmap bekannt sein → PNR zuerst
- **Ancillaries:** Extragepäck, Mahlzeiten etc. brauchen eine bestätigte Buchung
- **Conversion-Optimierung:** Klare Fortschrittsanzeige, kein Overwhelming
- **Mobile:** Ein Step pro Screen = bessere UX auf Smartphones
- **Error Recovery:** Schritt zurück ohne alles nochmal einzugeben

---

## 2. Step 1 — Passagierdaten

### 2.1 UI Layout (Mobile-First)

```
┌──────────────────────────────────────────┐
│  ← Zurück zu Ergebnissen                 │
│                                          │
│  ┌─ Progress Bar ──────────────────────┐ │
│  │ ● Passagiere  ○ Extras  ○ Zahlung   │ │
│  └──────────────────────────────────────┘ │
│                                          │
│  ┌─ Flugübersicht (kompakt) ───────────┐ │
│  │ FRA → BKK · 23. Juli – 1. Aug       │ │
│  │ Turkish Airlines · 1.090,63 €        │ │
│  │ [Details ▾]                          │ │
│  └──────────────────────────────────────┘ │
│                                          │
│  ┌─ Erwachsener 1 ────────────────────┐  │
│  │                                     │  │
│  │  Anrede:     [Herr] [Frau]         │  │
│  │  Vorname:    [_______________]      │  │
│  │  Nachname:   [_______________]      │  │
│  │                                     │  │
│  │  Geburtsdatum:                      │  │
│  │  [Tag ▾] [Monat ▾] [Jahr ▾]        │  │
│  │                                     │  │
│  │  Nationalität:                      │  │
│  │  [🇩🇪 Deutschland           ▾]      │  │
│  │                                     │  │
│  │  ── Vielfliegerprogramm (optional)  │  │
│  │  Airline: [Turkish Airlines   ▾]    │  │
│  │  Nummer:  [_______________]         │  │
│  │                                     │  │
│  └─────────────────────────────────────┘  │
│                                          │
│  ┌─ Kontaktdaten ─────────────────────┐  │
│  │  E-Mail:     [_______________]      │  │
│  │  Bestätigen: [_______________]      │  │
│  │  Telefon: [+49 ▾] [___________]    │  │
│  │                                     │  │
│  │  □ Reise-Deals per E-Mail          │  │
│  └─────────────────────────────────────┘  │
│                                          │
│  [          Weiter zu Extras →          ] │
│                                          │
└──────────────────────────────────────────┘
```

### 2.2 FQTV (Frequent Traveler) Feld

```typescript
interface FQTVField {
  programOwner: string;  // IATA Airline Code (z.B. "TK", "LH", "EK")
  memberId: string;      // Vielfliegernummer
}
```

**UX-Details:**
- Airline-Dropdown: Vorausgewählt mit Operating Carrier des Flugs
- Alliance-Hinweis: "Star Alliance Partner akzeptiert" wenn z.B. LH für TK-Flug
- Optional/Einklappbar: "Vielfliegerprogramm hinzufügen +"
- Validierung: Mindestens 5 Zeichen, alphanumerisch

**Alliance-Mapping:**
```typescript
const ALLIANCES: Record<string, string[]> = {
  'Star Alliance': ['LH', 'TK', 'UA', 'SQ', 'NH', 'OS', 'LX', 'SK', 'TP', 'AC', 'ET', 'AI', 'MS', ...],
  'SkyTeam': ['AF', 'KL', 'DL', 'AZ', 'SU', 'KE', 'VN', 'CI', 'AR', 'MU', 'ME', 'SV', ...],
  'Oneworld': ['BA', 'QF', 'AA', 'IB', 'CX', 'JL', 'QR', 'AY', 'MH', 'RJ', 'S7', ...],
};
```

### 2.3 Validierung

| Feld | Regeln |
|------|--------|
| Anrede | Pflicht (Herr/Frau) |
| Vorname | Pflicht, wie im Reisepass, nur Buchstaben + Bindestrich + Leerzeichen |
| Nachname | Pflicht, wie im Reisepass |
| Geburtsdatum | Pflicht, nicht in der Zukunft, altersgerecht (ADULT ≥12, CHILD 2-11, INFANT <2) |
| Nationalität | Pflicht, ISO 3166-1 alpha-2 |
| FQTV | Optional, min 5 Zeichen wenn ausgefüllt |
| E-Mail | Pflicht, valid, Bestätigung muss übereinstimmen |
| Telefon | Pflicht, min 6 Ziffern |

### 2.4 Was passiert bei "Weiter"

1. **Frontend:** Formulare validieren
2. **Backend:** `POST /api/flights/price` — Flight Offer nochmal bestätigen/preisen
3. **Backend:** `POST /api/flights/order` — PNR erstellen mit:
   - Flight Offer
   - Traveler-Daten (Name, DOB, Gender, Nationality)
   - FQTV-Daten (LoyaltyProgram)
   - Kontakt-Daten
   - `ticketingAgreement: { option: "DELAY_TO_QUEUE" }` — NOCH NICHT ticketen!
4. **Response:** `flightOrderId` + Buchungscode (PNR Reference)
5. **Navigate:** → Step 2

**WICHTIG:** Die Buchung ist zu diesem Zeitpunkt noch **nicht bezahlt und nicht geticketet**! Sie hat den Status `CONFIRMED` im GDS aber kein Ticket. Es gibt ein Ticketing-Zeitlimit (meistens 24-72h).

---

## 3. Step 2 — Extras & Sitzplatz

### 3.1 UI Layout

```
┌──────────────────────────────────────────┐
│  ← Zurück                                │
│                                          │
│  ┌─ Progress Bar ──────────────────────┐ │
│  │ ✓ Passagiere  ● Extras  ○ Zahlung   │ │
│  └──────────────────────────────────────┘ │
│                                          │
│  ┌─ 💺 Sitzplatzwahl ─────────────────┐  │
│  │                                     │  │
│  │  ✈ Hinflug: FRA → IST → BKK        │  │
│  │  [Sitzplan öffnen →]               │  │
│  │                                     │  │
│  │  ✈ Rückflug: BKK → IST → FRA       │  │
│  │  [Sitzplan öffnen →]               │  │
│  │                                     │  │
│  │  oder: [Sitzplatz beim Check-in]    │  │
│  └─────────────────────────────────────┘  │
│                                          │
│  ┌─ 🧳 Zusatzgepäck ──────────────────┐  │
│  │                                     │  │
│  │  Inkl: 1× 30kg pro Person          │  │
│  │                                     │  │
│  │  Erwachsener 1:                     │  │
│  │  ┌─────────────────────────────┐    │  │
│  │  │ +1 Gepäckstück (23kg)       │    │  │
│  │  │ + 45,00 €                   │    │  │
│  │  │ [─] 0 [+]                   │    │  │
│  │  └─────────────────────────────┘    │  │
│  │  ┌─────────────────────────────┐    │  │
│  │  │ Sportgepäck (Ski/Surf/Golf) │    │  │
│  │  │ + 75,00 €                   │    │  │
│  │  │ [─] 0 [+]                   │    │  │
│  │  └─────────────────────────────┘    │  │
│  │                                     │  │
│  └─────────────────────────────────────┘  │
│                                          │
│  ┌─ 🍽️ Mahlzeiten (wenn verfügbar) ──┐  │
│  │                                     │  │
│  │  Hinflug FRA→BKK (10h 40m):        │  │
│  │  ┌─────────────────────────────┐    │  │
│  │  │ 🥩 Rind mit Kartoffeln      │    │  │
│  │  │ ○ Wählen                    │    │  │
│  │  ├─────────────────────────────┤    │  │
│  │  │ 🐔 Hähnchen mit Reis        │    │  │
│  │  │ ○ Wählen                    │    │  │
│  │  ├─────────────────────────────┤    │  │
│  │  │ 🌱 Vegetarisch              │    │  │
│  │  │ ○ Wählen                    │    │  │
│  │  └─────────────────────────────┘    │  │
│  │                                     │  │
│  └─────────────────────────────────────┘  │
│                                          │
│  ┌─ ⚡ Weitere Services ──────────────┐  │
│  │                                     │  │
│  │  □ Priority Boarding    + 12,00 €   │  │
│  │  □ Airport Check-in     + 8,00 €    │  │
│  │  □ Lounge-Zugang        + 49,00 €   │  │
│  │  □ Fast Track Security  + 15,00 €   │  │
│  │                                     │  │
│  └─────────────────────────────────────┘  │
│                                          │
│  ┌─ Preisübersicht ───────────────────┐  │
│  │  Flug                  1.090,63 €   │  │
│  │  Sitzplätze                0,00 €   │  │
│  │  Zusatzgepäck              0,00 €   │  │
│  │  ──────────────────────────────────│  │
│  │  Gesamt               1.090,63 €   │  │
│  └─────────────────────────────────────┘  │
│                                          │
│  [          Weiter zur Zahlung →        ] │
│                                          │
└──────────────────────────────────────────┘
```

### 3.2 Seatmap (bereits implementiert)

- Nutzt das bestehende Seatmap Modal
- **NEU:** Jetzt mit `flightOrderId` statt Offer → PNR-basierte Seatmap
- FQTV-Benefits sichtbar (freigeschaltete Sitze)
- Seatmap API: `GET /v1/shopping/seatmaps?flight-orderId={orderId}`

### 3.3 Amadeus Ancillary APIs

#### Extra Bags (Zusatzgepäck)

**API:** `POST /v1/shopping/flight-offers/pricing?include=bags`

Response enthält `additionalServices.baggageAllowance`:
```json
{
  "travelerPricings": [{
    "fareDetailsBySegment": [{
      "additionalServices": {
        "chargeableCheckedBags": {
          "quantity": 2,
          "weight": 23,
          "weightUnit": "KG",
          "price": { "amount": "45.00", "currency": "EUR" }
        },
        "chargeableSportEquipment": [
          { "type": "SKI", "price": { "amount": "75.00", "currency": "EUR" } },
          { "type": "GOLF", "price": { "amount": "60.00", "currency": "EUR" } },
          { "type": "SURF", "price": { "amount": "75.00", "currency": "EUR" } }
        ]
      }
    }]
  }]
}
```

#### Other Services

**API:** `POST /v1/shopping/flight-offers/pricing?include=other-services`

Response enthält `otherServices`:
```json
{
  "otherServices": [
    { "type": "PRIORITY_BOARDING", "price": { "amount": "12.00", "currency": "EUR" } },
    { "type": "AIRPORT_CHECKIN", "price": { "amount": "8.00", "currency": "EUR" } }
  ]
}
```

#### Mahlzeiten

Amadeus Self-Service API bietet **keine direkte Meal-Selection**. Aber:
- Die `aircraftCabinAmenities.food` aus der Seatmap API zeigt ob Mahlzeiten inklusive sind
- Mahlzeitenwahl ist typischerweise ein Airline-spezifischer Prozess (via Airline Portal oder NDC)
- **Workaround:** Wir zeigen die inkludierten Mahlzeiten an (MEAL/FRESH_MEAL/SNACK), bieten aber keine Auswahl

> **Fazit:** Mahlzeiten-Auswahl als "Coming Soon" oder nur Info-Anzeige.

### 3.4 Backend: Ancillaries laden

```go
// Nach PNR-Erstellung: Ancillaries parallel laden
GET  /v1/shopping/seatmaps?flight-orderId={orderId}     → Seatmap
POST /v1/shopping/flight-offers/pricing?include=bags     → Extra Bags
POST /v1/shopping/flight-offers/pricing?include=other-services → Services
```

### 3.5 Was passiert bei "Weiter"

1. **Sitzplatz:** Wenn gewählt → Seat SSR zum PNR hinzufügen (PATCH Order)
2. **Extras:** Wenn gewählt → Additional Services zum PNR hinzufügen
3. **Navigate:** → Step 3

---

## 4. Step 3 — Zahlung & Abschluss

### 4.1 UI Layout

```
┌──────────────────────────────────────────┐
│  ← Zurück                                │
│                                          │
│  ┌─ Progress Bar ──────────────────────┐ │
│  │ ✓ Passagiere  ✓ Extras  ● Zahlung   │ │
│  └──────────────────────────────────────┘ │
│                                          │
│  ┌─ Buchungsübersicht ────────────────┐  │
│  │                                     │  │
│  │  ✈ FRA → IST → BKK · 23. Juli      │  │
│  │    Turkish Airlines TK1588/TK68     │  │
│  │    Economy · U · 30kg               │  │
│  │    💺 14A (Fenster), 14B (Gang)     │  │
│  │                                     │  │
│  │  ✈ BKK → IST → FRA · 1. August     │  │
│  │    Turkish Airlines TK69/TK1589     │  │
│  │    Economy · Q · 30kg               │  │
│  │    💺 22A (Fenster), 22B (Gang)     │  │
│  │                                     │  │
│  │  👤 Max Mustermann (Erw.)           │  │
│  │  👤 Anna Mustermann (Erw.)          │  │
│  │                                     │  │
│  └─────────────────────────────────────┘  │
│                                          │
│  ┌─ Preisaufstellung ─────────────────┐  │
│  │                                     │  │
│  │  2× Erwachsene          2.181,26 €  │  │
│  │  Sitzplätze (4 Segmente)   90,00 €  │  │
│  │  ──────────────────────────────────│  │
│  │  Gesamtpreis            2.271,26 €  │  │
│  │  Inkl. 843,26 € Steuern            │  │
│  │                                     │  │
│  └─────────────────────────────────────┘  │
│                                          │
│  ┌─ AGB ──────────────────────────────┐  │
│  │                                     │  │
│  │  ☑ Ich akzeptiere die AGB und       │  │
│  │    Datenschutzerklärung              │  │
│  │                                     │  │
│  │  ☑ Ich habe die Stornobedingungen   │  │
│  │    gelesen (Tarif: Economy Sv1)     │  │
│  │                                     │  │
│  └─────────────────────────────────────┘  │
│                                          │
│  ┌─ Zahlungsmethode ──────────────────┐  │
│  │                                     │  │
│  │  ○ Kreditkarte (VISA, MC, Amex)    │  │
│  │  ○ TWINT                           │  │
│  │  ○ Reka                            │  │
│  │  ○ Apple Pay                       │  │
│  │  ○ Google Pay                      │  │
│  │                                     │  │
│  └─────────────────────────────────────┘  │
│                                          │
│  ┌─ Trust Badges ─────────────────────┐  │
│  │  🔒 SSL · ✈️ IATA · 💳 Sicher      │  │
│  └─────────────────────────────────────┘  │
│                                          │
│  [        Verbindlich buchen →          ] │
│  (Kostenpflichtig · 2.271,26 €)          │
│                                          │
└──────────────────────────────────────────┘
```

### 4.2 Zahlungsarten

| Methode | Provider | Fee |
|---------|----------|-----|
| Kreditkarte (VISA, MC, Amex) | Saferpay | 0% |
| TWINT | Saferpay | 1.6% |
| Reka | Saferpay | 3.5% |
| Apple Pay | Saferpay (Wallets) | 0% |
| Google Pay | Saferpay (Wallets) | 0% |

### 4.3 Tarifbedingungen

Aus der Amadeus `detailed-fare-rules` API:
```
POST /v1/shopping/flight-offers/pricing?include=detailed-fare-rules
```

**WICHTIG: Kein Fare Basis Code anzeigen!** Kein "YOWCH3M", kein "QFLX2" — nur die verständlichen Regeln.

**Amadeus Response (Roh):**
```json
{
  "fareRules": {
    "rules": [
      { "category": "REFUND", "maxPenaltyAmount": "75.00", "notApplicable": false },
      { "category": "EXCHANGE", "maxPenaltyAmount": "50.00", "notApplicable": false },
      { "category": "REVALIDATION", "notApplicable": true }
    ]
  }
}
```

**UI-Darstellung (menschenlesbar, kein Fare Basis!):**
```
┌─ Tarifbedingungen ─────────────────────┐
│                                         │
│  🔄 Umbuchung                           │
│  Umbuchbar gegen Gebühr von 50,00 €    │
│                                         │
│  💰 Stornierung                         │
│  Erstattbar gegen Gebühr von 75,00 €   │
│  Steuer-Rückerstattung möglich          │
│                                         │
│  ⏰ Revalidierung                       │
│  Nicht möglich                          │
│                                         │
│  ℹ️ Detaillierte Bedingungen können     │
│  je nach Fluggesellschaft abweichen.    │
└─────────────────────────────────────────┘
```

**Parser-Mapping (fare-rules-parser.ts):**
```typescript
const RULE_LABELS: Record<string, { icon: string; label: string }> = {
  REFUND:       { icon: '💰', label: 'Stornierung' },
  EXCHANGE:     { icon: '🔄', label: 'Umbuchung' },
  REVALIDATION: { icon: '⏰', label: 'Revalidierung' },
  REISSUE:      { icon: '📄', label: 'Neuausstellung' },
};

// Textbausteine
function humanizeRule(category: string, rule: FareRule): string {
  if (rule.notApplicable) return 'Nicht möglich';
  if (rule.maxPenaltyAmount === '0') return 'Kostenlos';
  if (rule.maxPenaltyAmount) return `Gegen Gebühr von ${formatCurrency(rule.maxPenaltyAmount)}`;
  return 'Auf Anfrage bei der Airline';
}
```

→ **Anzeige:** Klappbarer Accordion in Step 3, keine Codes, nur klare Sprache.

### 4.4 Was passiert bei "Verbindlich buchen"

1. **Zahlung initiieren:**
   - Saferpay Payment Page öffnen (Redirect oder iFrame)
   - Kunden zahlt
   - Saferpay Callback → Backend
2. **Zahlung bestätigt:**
   - Saferpay `PaymentPage/Assert` → Zahlungsbestätigung
3. **Ticketing:**
   - Amadeus: Ticketing des PNR (optional, abhängig von Agreement)
   - In Self-Service: `ticketingAgreement` steuert das
4. **Navigate:** → Step 4

---

## 5. Step 4 — Bestätigung & Voucher

### 5.1 UI Layout

```
┌──────────────────────────────────────────┐
│                                          │
│            ✅                             │
│    Buchung bestätigt!                    │
│                                          │
│  Buchungscode: AXKF3T                    │
│  [📋 Kopieren]                           │
│                                          │
│  ┌─ Buchungsdetails ──────────────────┐  │
│  │  (vollständige Flug + Passagier-   │  │
│  │   Details wie in Step 3)           │  │
│  └─────────────────────────────────────┘  │
│                                          │
│  📧 Bestätigung gesendet an:             │
│     max@mustermann.de                    │
│                                          │
│  [📄 PDF Voucher herunterladen]          │
│  [🖨️ Drucken]                            │
│  [🔗 Buchung verwalten]                  │
│                                          │
│  ┌─ Nächste Schritte ─────────────────┐  │
│  │  • Online Check-in ab 24h vor Abflug│  │
│  │  • Reisepass nicht vergessen!       │  │
│  │  • Gepäck: 1× 30kg inklusive       │  │
│  └─────────────────────────────────────┘  │
│                                          │
│  [         Neue Suche starten →         ] │
│                                          │
└──────────────────────────────────────────┘
```

### 5.2 Backend-Aktionen

1. **Bestätigungs-E-Mail** senden (SMTP via Hostpoint)
2. **PDF Voucher** generieren (HTML → Chromium → PDF)
3. **Buchung in DB speichern** (PostgreSQL, für spätere Verwaltung)

---

## 6. Backend-Architektur

### 6.1 Neue API Endpoints

| Method | Path | Step | Beschreibung |
|--------|------|------|-------------|
| `POST` | `/api/flights/price` | 1 | Offer bestätigen/preisen (inkl. Fare Rules) |
| `POST` | `/api/flights/order` | 1→2 | PNR erstellen (DELAY_TO_QUEUE, kein Ticketing) |
| `GET` | `/api/flights/order/:id` | 2+ | PNR abrufen |
| `GET` | `/api/flights/seatmap/:orderId` | 2 | Seatmap für PNR |
| `POST` | `/api/flights/ancillaries/:orderId` | 2 | Ancillaries laden (Bags, Services) |
| `PATCH` | `/api/flights/order/:id/seats` | 2→3 | Sitzplätze zum PNR hinzufügen |
| `PATCH` | `/api/flights/order/:id/services` | 2→3 | Services zum PNR hinzufügen |
| `POST` | `/api/flights/order/:id/pay` | 3 | Zahlung initiieren (Saferpay) |
| `POST` | `/api/flights/order/:id/confirm` | 3 | Zahlung bestätigen + Ticketing |
| `DELETE` | `/api/flights/order/:id` | — | PNR stornieren (Timeout/Abbruch) |

### 6.2 Amadeus API Flow

```
Step 1:
  POST /v2/shopping/flight-offers         ← Suche (besteht)
  POST /v1/shopping/flight-offers/upselling ← Upsell (besteht)
  POST /v1/shopping/flight-offers/pricing?include=bags,other-services,detailed-fare-rules
    → Preisbestätigung + Ancillary-Optionen + Fare Rules
  POST /v1/booking/flight-orders           ← PNR erstellen
    → flightOrderId, PNR Reference

Step 2:
  GET /v1/shopping/seatmaps?flight-orderId={id}  ← PNR-basierte Seatmap
  GET /v1/booking/flight-orders/{id}              ← PNR Details

Step 3:
  → Saferpay Payment (extern)
  → Ticketing via Amadeus (oder manuell via Queue)

Cleanup:
  DELETE /v1/booking/flight-orders/{id}    ← PNR stornieren bei Abbruch/Timeout
```

### 6.3 PNR Lifecycle Management

```
Created (Step 1)                     CONFIRMED, not ticketed
    │                                TTL: managed by US, not airline
    ├─→ Extras added (Step 2)        CONFIRMED, seats/services added
    │
    ├─→ Payment + Ticket (Step 3)    TICKETED ✅
    │
    ├─→ User klickt "Zurück"         SOFORT DELETE → PNR weg
    │
    ├─→ User schließt Tab/Browser    beforeunload → DELETE request
    │                                + Cleanup Cron als Fallback
    │
    ├─→ User navigiert weg           routeChange → DELETE request
    │
    └─→ Timeout (Fallback)           AUTO-CANCEL nach 15min Inaktivität
```

### 6.4 PNR Auto-Cancel — 3 Schichten

**Schicht 1: Sofortige Stornierung (Frontend-triggered)**
- **"Zurück zu Ergebnissen"** Button → `DELETE /api/flights/order/:id` → PNR weg
- **Browser Back** aus Step 2/3 → beforeunload Handler → Cancel API
- **"Abbrechen"** Button (überall sichtbar) → Bestätigungsdialog → Cancel
- **Route Change** (Next.js `beforePopState` / `routeChangeStart`) → Cancel

```typescript
// Im booking-flow-store.ts
cancelBooking: async () => {
  const { orderId } = get();
  if (orderId) {
    // Fire-and-forget + sendBeacon als Fallback
    try {
      await apiClient.delete(`/flights/order/${orderId}`);
    } catch {
      navigator.sendBeacon(`/api/flights/order/${orderId}/cancel`);
    }
  }
  set(initialState); // Reset store
  sessionStorage.removeItem('booking-flow');
}
```

**Schicht 2: Browser-Close / Tab-Close (Best-Effort)**
```typescript
useEffect(() => {
  const handleUnload = () => {
    const state = useBookingFlowStore.getState();
    if (state.orderId && state.currentStep < 4) {
      // sendBeacon ist fire-and-forget, überlebt Tab-Close
      navigator.sendBeacon(
        `/api/flights/order/${state.orderId}/cancel`,
        JSON.stringify({ reason: 'tab_closed' })
      );
    }
  };
  window.addEventListener('beforeunload', handleUnload);
  return () => window.removeEventListener('beforeunload', handleUnload);
}, []);
```

**Schicht 3: Backend Cleanup Cron (Fallback für alles was durchrutscht)**
- Cron alle **5 Minuten**: Unbestätigte PNRs checken
- PNR älter als **15 Minuten** ohne Payment → `DELETE`
- PNR älter als **60 Minuten** generell → `DELETE`
- Logging jeder Stornierung für Audit

```go
// PNR Cleanup Job
func (s *OrderService) CleanupStalePNRs(ctx context.Context) {
    orders := s.repo.FindUnconfirmed(ctx)
    for _, order := range orders {
        age := time.Since(order.CreatedAt)
        if age > 15*time.Minute {
            s.amadeus.CancelOrder(ctx, order.AmadeusOrderID)
            s.repo.MarkCancelled(ctx, order.ID, "auto_cleanup")
            s.logger.Info("PNR auto-cancelled", "orderId", order.ID, "age", age)
        }
    }
}
```

### 6.5 Cancel-Endpoint

```go
// DELETE /api/flights/order/:id
// POST  /api/flights/order/:id/cancel  (für sendBeacon, da DELETE kein Body hat)
func (h *OrderHandler) CancelOrder(c *gin.Context) {
    orderID := c.Param("id")
    
    // Amadeus: PNR stornieren
    err := h.amadeus.CancelOrder(c, orderID)
    if err != nil {
        // Trotzdem als cancelled markieren — Cron räumt auf
        h.logger.Error("PNR cancel failed, marking for cleanup", "err", err)
    }
    
    // Lokal als cancelled markieren
    h.repo.MarkCancelled(c, orderID, c.Query("reason"))
    
    c.Status(204)
}
```

### 6.4 State Management

```typescript
interface BookingFlowState {
  // Step tracking
  currentStep: 1 | 2 | 3 | 4;
  
  // Step 1 Data
  offer: FlightOffer;
  travelers: TravelerData[];
  contact: ContactData;
  
  // Step 1 → 2 Transition
  orderId: string;          // Amadeus Flight Order ID
  pnrReference: string;     // PNR Locator (z.B. "AXKF3T")
  
  // Step 2 Data
  seatSelections: Record<string, Record<string, SelectedSeat>>;
  ancillaries: SelectedAncillary[];
  
  // Step 3 Data
  paymentMethod: string;
  paymentToken?: string;    // Saferpay Token
  
  // Step 4 Data
  confirmed: boolean;
  ticketNumbers?: string[];
  voucherUrl?: string;
}
```

→ Persistiert in **sessionStorage** (Zustand mit persist middleware)

---

## 7. Amadeus Ancillaries — Vollständiger Katalog

### 7.1 Verfügbar via Self-Service API

| Typ | API Parameter | Beschreibung |
|-----|-------------|-------------|
| Extra Checked Bags | `include=bags` | Zusätzliches Aufgabegepäck (23kg/32kg) |
| Sport Equipment | `include=bags` | Ski, Golf, Surf, Fahrrad |
| Priority Boarding | `include=other-services` | Prioritäts-Einsteigen |
| Airport Check-in | `include=other-services` | Check-in am Schalter |
| Chargeable Seats | Seatmap API | Kostenpflichtige Sitzplätze |
| Credit Card Fees | `include=credit-card-fees` | Kreditkartengebühren |
| Fare Rules | `include=detailed-fare-rules` | Storno-/Umbuchungsbedingungen |

### 7.2 NICHT verfügbar via Self-Service (Enterprise only)

| Typ | Anmerkung |
|-----|----------|
| Mahlzeitenwahl | Nur via NDC/Enterprise |
| Lounge-Zugang | Airline-spezifisch |
| Fast Track Security | Flughafen-spezifisch |
| Transfer/Taxi | Separate API (Transfer Search) |
| Reiseversicherung | Drittanbieter-Integration |

→ Diese können als **Drittanbieter-Integration** oder "Coming Soon" implementiert werden.

### 7.3 UI-Darstellung Ancillaries

**Gepäck-Karten:**
```
┌─────────────────────────────────────┐
│ 🧳 Zusätzliches Gepäckstück         │
│                                     │
│ 23 kg Aufgabegepäck                 │
│ Pro Person · Pro Strecke             │
│                                     │
│ 45,00 €                             │
│                                     │
│ Erw. 1: [─] 0 [+]                  │
│ Erw. 2: [─] 0 [+]                  │
└─────────────────────────────────────┘
```

**Service-Toggles:**
```
┌─────────────────────────────────────┐
│ ⚡ Priority Boarding                 │
│ Zuerst an Bord — kein Stress        │
│                                     │
│ 12,00 € pro Person                  │
│                                     │
│ [  Hinzufügen  ]                    │
└─────────────────────────────────────┘
```

---

## 8. Progress Bar Component

```
Mobile: Compact mit Icons
┌──────────────────────────────────┐
│  ① ──── ② ──── ③ ──── ④        │
│  ✓      ●      ○      ○        │
│ Daten  Extras  Zahlung  ✓       │
└──────────────────────────────────┘

Desktop: Full mit Labels
┌────────────────────────────────────────────┐
│  ✓ Passagierdaten → ● Extras & Sitzplatz  │
│  → ○ Zahlung & Abschluss → ○ Bestätigung  │
└────────────────────────────────────────────┘
```

**Verhalten:**
- Abgeschlossene Steps: Grün ✓, klickbar (zurücknavigieren)
- Aktueller Step: Pink ●
- Zukünftige Steps: Grau ○, nicht klickbar
- Animation: Smooth slide der Progresslinie

---

## 9. Mobile-First Design Patterns

### 9.1 Bottom Sheet statt Modal
- Seatmap → Full-Screen Bottom Sheet (schon implementiert)
- Gepäck-Auswahl → Inline (kein Modal nötig)
- Fare Rules → Expandable Accordion

### 9.2 Sticky Elements
- Progress Bar → Sticky top
- Preis-Summary → Sticky bottom
- "Weiter" Button → Sticky bottom (mit Preis)

### 9.3 Touch Targets
- Min 44×44px für alle interaktiven Elemente
- Große +/- Buttons für Gepäck-Counter
- Swipe zwischen Steps (optional)

### 9.4 Formular-Optimierung
- Auto-Focus auf erstes leeres Feld
- `inputMode="numeric"` für Telefon
- `inputMode="email"` für E-Mail
- `autocomplete` Attribute (given-name, family-name, bday, etc.)
- Inline-Validierung (nicht erst bei Submit)
- Smart Keyboard: Nur relevante Tasten

---

## 10. Error Handling & Edge Cases

### 10.1 PNR-Erstellung schlägt fehl
- Grund: Offer abgelaufen, keine Plätze mehr
- **UI:** "Dieses Angebot ist nicht mehr verfügbar. Bitte suche erneut."
- **Action:** Zurück zu Suchergebnissen

### 10.2 Zahlung schlägt fehl
- Grund: Karte abgelehnt, Timeout
- **UI:** "Zahlung fehlgeschlagen. Bitte versuche es erneut oder wähle eine andere Zahlungsmethode."
- **Action:** Zurück zu Step 3, PNR bleibt bestehen

### 10.3 User verlässt Flow
- **Sofort:** Frontend triggert PNR-Cancel (sendBeacon bei Tab-Close)
- **Fallback:** Backend Cron cancelt nach 15min Inaktivität
- **Kein Resume:** Abgebrochene Buchungen werden NICHT fortgesetzt — neuer Flow nötig
- **Grund:** Preise und Verfügbarkeit können sich jede Minute ändern

### 10.4 Ticketing-Zeitlimit
- Amadeus gibt `lastTicketingDate` zurück
- Wenn < 2h: Countdown-Timer anzeigen
- Wenn abgelaufen: PNR ist ungültig, Buchung nicht möglich

### 10.5 Preis-Änderung
- `POST /pricing` Response ≠ Suchpreis
- **UI:** "Der Preis hat sich geändert: 1.090 € → 1.120 €. Möchtest du fortfahren?"
- **Action:** Akzeptieren oder Abbrechen

---

## 11. Implementierungs-Phasen

### Phase 1 — Booking Page Refactor (2-3 Tage)
- [ ] Booking Page in 4-Step Flow umbauen (Stepper/Router)
- [ ] Progress Bar Komponente
- [ ] Step 1: Passagierdaten + FQTV Felder
- [ ] Step Navigation + Zustand Store
- [ ] sessionStorage Persistenz
- [ ] Mobile-first responsive Layout

### Phase 2 — PNR-Erstellung Backend (1-2 Tage)
- [ ] `POST /api/flights/price` (mit bags, other-services, fare-rules)
- [ ] `POST /api/flights/order` (PNR erstellen, DELAY_TO_QUEUE)
- [ ] `GET /api/flights/order/:id` (PNR abrufen)
- [ ] `DELETE /api/flights/order/:id` (PNR stornieren)
- [ ] Pricing Response → Ancillary-Optionen extrahieren
- [ ] Fare Rules Parser
- [ ] FQTV/LoyaltyProgram in Order integrieren

### Phase 3 — Step 2: Extras & Sitzplatz (2 Tage)
- [ ] Seatmap umstellen auf PNR-basiert (GET mit flightOrderId)
- [ ] Ancillaries UI: Extra Bags Counter
- [ ] Ancillaries UI: Service Toggles
- [ ] Ancillaries UI: Fare Rules Accordion
- [ ] `PATCH /api/flights/order/:id/seats`
- [ ] `PATCH /api/flights/order/:id/services`
- [ ] Preis-Update nach Ancillary-Änderung

### Phase 4 — Step 3: Zahlung (1-2 Tage)
- [ ] Buchungsübersicht (Review Screen)
- [ ] Saferpay Integration (besteht teilweise vom Hotel IBE)
- [ ] Zahlungsmethoden-Auswahl
- [ ] Payment Redirect Flow
- [ ] Ticketing nach erfolgreicher Zahlung
- [ ] AGB + Stornobedingungen Checkboxen

### Phase 5 — Step 4: Bestätigung + Cleanup (1 Tag)
- [ ] Bestätigungsseite
- [ ] Bestätigungs-E-Mail
- [ ] PDF Voucher
- [ ] PNR Cleanup Cron (unbestätigte PNRs nach 4h stornieren)

### Phase 6 — Polish (1 Tag)
- [ ] Animations (Step-Transitions, Progress Bar)
- [ ] Loading States (Skeleton pro Step)
- [ ] Error Boundaries
- [ ] Accessibility Audit
- [ ] Responsive Tests
- [ ] Alliance-Mapping für FQTV
- [ ] Preis-Änderung Handling

---

## 12. Risiken & Mitigations

| Risiko | Impact | Mitigation |
|--------|--------|-----------|
| Amadeus Test: PNR-Erstellung limitiert | Hoch | Mock-Mode für Entwicklung |
| Ancillary-Optionen airline-abhängig | Mittel | Graceful Fallback wenn leer |
| Ticketing-Zeitlimit zu kurz | Hoch | Timer-Anzeige + Warnung |
| PNR-Leak (nicht stornierte Buchungen) | Hoch | Cleanup-Cron alle 30min |
| Saferpay Redirect auf Mobile problematisch | Mittel | In-App Browser / Payment Sheet |
| FQTV-Validierung nicht möglich | Niedrig | Nur Format-Check, Airline validiert |
| Preis ändert sich zwischen Steps | Mittel | Preis-Diff Dialog |

---

## 13. Geschätzter Aufwand

| Phase | Aufwand | Priorität |
|-------|---------|-----------|
| Phase 1: Booking Page Refactor | 2-3 Tage | 🔴 Hoch |
| Phase 2: PNR Backend | 1-2 Tage | 🔴 Hoch |
| Phase 3: Extras & Sitzplatz | 2 Tage | 🔴 Hoch |
| Phase 4: Zahlung | 1-2 Tage | 🔴 Hoch |
| Phase 5: Bestätigung + Cleanup | 1 Tag | 🔴 Hoch |
| Phase 6: Polish | 1 Tag | 🟡 Mittel |
| **Gesamt** | **8-11 Tage** | |

---

## 14. Dateien & Verzeichnisse (Neu)

```
/root/flight-ibe-go/
├── internal/
│   ├── domain/
│   │   └── entities.go           # + Order, Ancillary, FareRule Structs
│   ├── infrastructure/
│   │   └── amadeus/
│   │       ├── adapter.go        # + CreateOrder, GetOrder, Pricing with includes
│   │       └── ancillaries.go    # Ancillary-Parsing & Formatting
│   └── api/
│       ├── handlers.go           # + OrderHandler, AncillaryHandler
│       └── routes.go             # + Neue Endpoints
│
├── frontend/src/
│   ├── app/
│   │   └── booking/
│   │       ├── page.tsx          # Step Router / Layout
│   │       ├── step-1.tsx        # Passagierdaten
│   │       ├── step-2.tsx        # Extras & Sitzplatz
│   │       ├── step-3.tsx        # Zahlung & Abschluss
│   │       └── step-4.tsx        # Bestätigung
│   │
│   ├── components/
│   │   ├── booking/
│   │   │   ├── progress-bar.tsx
│   │   │   ├── flight-summary-compact.tsx
│   │   │   ├── fqtv-field.tsx
│   │   │   ├── ancillary-card.tsx
│   │   │   ├── baggage-counter.tsx
│   │   │   ├── service-toggle.tsx
│   │   │   ├── fare-rules-accordion.tsx
│   │   │   ├── payment-methods.tsx
│   │   │   ├── booking-review.tsx
│   │   │   ├── price-breakdown.tsx
│   │   │   └── confirmation-card.tsx
│   │   └── seatmap/              # (besteht)
│   │
│   ├── stores/
│   │   └── booking-flow-store.ts  # 4-Step State Machine
│   │
│   └── lib/
│       ├── alliances.ts           # Airline Alliance Mapping
│       └── fare-rules-parser.ts   # Fare Rules → verständlicher Text
```

---

*Plan erstellt am 08.02.2026 — SOTA 2026 Booking Flow* ✈️

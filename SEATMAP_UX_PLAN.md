# 💺 Seatmap UX v3 — Comprehensive Visual Differentiation

> **Problem:** Sitze sehen alle gleich aus. Kein visueller Unterschied zwischen Exit, Bulkhead, Preferred, Bassinet, Pet-friendly. Tooltip unzuverlässig auf Mobile. Legende nicht aussagekräftig. "Sitz ansehen" Button nicht sichtbar genug.

---

## 1. Seat-Typ Kategorisierung (basierend auf Amadeus API)

### Seat Categories (aus `characteristicsCodes`)

| Kategorie | Codes | Visuelle Behandlung | Farbe |
|-----------|-------|---------------------|-------|
| **Standard** | keine besonderen | Neutral, verfügbar | `bg-sky-400` (blau) |
| **Preferred / Premium** | `P`, `PS`, `1A`, `EC`, `XL` | Stern-Icon ⭐, Premium-Farbe | `bg-violet-500` (lila) |
| **Extra Beinfreiheit** | `L`, `XL` | Bein-Icon 🦵 | `bg-teal-500` (teal) |
| **Notausgang (Exit)** | `E`, `IE` | Tür-Icon 🚪, orange Rand | `bg-amber-500` (orange) |
| **Bulkhead** | `K` | Wand-Icon 🔲 | `bg-indigo-400` (indigo) |
| **Bassinet (Baby)** | `B`, `BK` | Baby-Icon 👶 | `bg-pink-300` (rosa) |
| **Rollstuhl / Accessibility** | `H` | Rollstuhl-Icon ♿ | `bg-sky-400` + Badge |
| **Begleithund / Pet** | `CH` | Hund-Icon 🐕 | `bg-sky-400` + Badge |
| **Eingeschränkt** | `LS`, `LR`, `V`, `1`, `LA`, `GA`, `ST` | Warning-Icon ⚠️ | Normale Farbe + amber Ecke |
| **Kostenlos** | Preis = 0 | "Frei"-Badge | `bg-emerald-500` (grün) |
| **Belegt** | OCCUPIED | X-Mark | `bg-gray-300` |
| **Blockiert** | BLOCKED | Leer | `bg-gray-200` |

### Prioritäts-Reihenfolge (wenn ein Sitz mehrere Codes hat):
1. SELECTED (pink, immer höchste Prio)
2. Exit Row (orange)
3. Preferred/Premium (lila)
4. Extra Beinfreiheit (teal)
5. Bulkhead (indigo)
6. Bassinet (rosa)
7. Standard kostenlos (grün)
8. Standard kostenpflichtig (blau)

### Visual Indicator System

Jeder Sitz bekommt bis zu 2 visuelle Elemente:
1. **Hintergrundfarbe** → Kategorie (siehe oben)
2. **Mini-Icon (Ecke)** → Spezielle Eigenschaft (optional, nur wenn relevant)

```
┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐
│   A  │  │ ⭐ A │  │ 🚪 A │  │ 👶 A │
│      │  │      │  │      │  │      │
└──────┘  └──────┘  └──────┘  └──────┘
 Standard   Preferred  Exit Row  Bassinet
 (sky)      (violet)   (amber)   (pink)
```

Das Mini-Icon ist 10×10px in der oberen rechten Ecke des Seat-Buttons.

---

## 2. Tooltip → Bottom Sheet (Mobile) / Popover (Desktop)

### Problem
Hover-Tooltips funktionieren nicht auf Touch-Geräten. Lang-Press ist nicht intuitiv.

### Lösung
- **Mobile:** Tap auf Sitz → Bottom Sheet mit Details (kein Hover!)
- **Desktop:** Hover → Tooltip wie bisher, Klick → Auswählen

### Mobile Bottom Sheet (bei Tap auf verfügbaren Sitz):

```
┌──────────────────────────────────────┐
│  ─────  (drag handle)                │
│                                      │
│  💺 Sitz 14A · Fenster               │
│                                      │
│  ┌─ Eigenschaften ────────────────┐  │
│  │                                │  │
│  │  🦵 Extra Beinfreiheit         │  │
│  │  🔌 Steckdose vorhanden        │  │
│  │  🚪 Notausgangsreihe           │  │
│  │  ✈️ Über dem Flügel             │  │
│  │                                │  │
│  └────────────────────────────────┘  │
│                                      │
│  ┌─ Hinweise ─────────────────────┐  │
│  │  ⚠️ Rückenlehne eingeschränkt   │  │
│  │  ⚠️ Neben Küche                 │  │
│  └────────────────────────────────┘  │
│                                      │
│  🖼️ [Sitzplatz ansehen →]           │
│                                      │
│  ┌────────────────────────────────┐  │
│  │  22,00 €                       │  │
│  │  [    💺 Sitz auswählen     ]  │  │
│  └────────────────────────────────┘  │
│                                      │
└──────────────────────────────────────┘
```

### Desktop Tooltip (wie bisher, aber erweitert):
- Alle Eigenschaften gruppiert (Features grün, Warnings amber)
- Mini-Icon Badges
- Preis prominent

---

## 3. Legende v3 — Interaktiv + Filter

### Aktuelle Legende
Nur Farbquadrate mit Labels. Nicht hilfreich.

### Neue Legende (2 Sektionen):

```
┌─ Preiskategorien ─────────────────────┐
│                                        │
│  🟢 Kostenlos    🔵 Standard (< 30€)   │
│  🟡 Comfort (30-80€)  🟣 Premium (80€+)│
│                                        │
├─ Sitztypen ───────────────────────────┤
│                                        │
│  [🚪 Exit Row    ]  [🦵 Extra Beinfreiheit] │
│  [⭐ Preferred   ]  [🔲 Bulkhead      ]    │
│  [👶 Bassinet    ]  [🐕 Pet-friendly   ]    │
│  [♿ Rollstuhl   ]  [⚠️ Eingeschränkt  ]    │
│                                        │
│  ■ Belegt   □ Nicht verfügbar          │
│                                        │
└────────────────────────────────────────┘
```

### Filter-Funktion (Killer Feature!)
Die Sitztyp-Badges sind **KLICKBAR**:
- Klick auf "🚪 Exit Row" → Alle Exit-Sitze blinken/pulsieren
- Klick auf "👶 Bassinet" → Alle Bassinet-Sitze hervorgehoben
- Rest wird gedimmt (opacity 0.3)
- Zweiter Klick → Filter aufheben
- Nur EIN Filter gleichzeitig aktiv

---

## 4. "Sitz ansehen" Button — Redesign

### Problem
Button ist zu dezent, man sieht nicht dass man Bilder ansehen kann.

### Lösung
In der Cabin Amenity Bar:

```
┌─ Economy Class ──────────────────────────────┐
│  🦵 32" · 📶 WiFi · 🔌 USB · 🍽️ Mahlzeit    │
│                                              │
│  ┌──────────────────────────────────────┐    │
│  │  📷                                  │    │
│  │  [Sitzplatz-Foto ansehen →]          │    │
│  │  Dein Sitz in der Economy Class      │    │
│  └──────────────────────────────────────┘    │
└──────────────────────────────────────────────┘
```

- Eigene Card innerhalb der Amenity Bar
- Thumbnail-Preview (wenn Media URL vorhanden)
- Klarer CTA-Text
- Bild-Icon prominent

---

## 5. Implementierung

### Dateien zu ändern:

1. **`seat-cell.tsx`** — Komplett neues Farbsystem basierend auf Seat-Typ statt nur Preis
   - `getSeatCategory()` Funktion die den dominanten Typ bestimmt
   - Mini-Icons in der Ecke für spezielle Typen
   - Neue Farb-Map

2. **`seat-tooltip.tsx`** → **`seat-detail-sheet.tsx`** — Neues Dual-System
   - Desktop: Popover (hover)
   - Mobile: Bottom Sheet (tap)
   - Detailreiche Anzeige mit allen Characteristics
   - "Sitz auswählen" Button im Sheet

3. **`legend.tsx`** — Komplett neu mit 2 Sektionen + Filter
   - Preiskategorien (Farbquadrate)
   - Sitztypen (klickbare Filter-Badges)
   - Filter-State als Callback an seatmap-grid

4. **`seatmap-grid.tsx`** — Filter-Support
   - Neuer Prop: `highlightFilter?: string` (z.B. "EXIT", "BASSINET", "PREFERRED")
   - Nicht-matchende Sitze werden gedimmt
   - Matchende Sitze pulsieren kurz

5. **`cabin-amenity-bar.tsx`** — "Sitz ansehen" als eigene Card mit Preview

6. **`seatmap-modal.tsx`** — Filter-State verwalten, an Grid + Legend weiterreichen

---

## 6. Seat Category Detection

```typescript
type SeatCategory = 
  | 'exit'        // E, IE
  | 'preferred'   // P, PS, 1A, EC
  | 'extraleg'    // L, XL (ohne Exit)
  | 'bulkhead'    // K
  | 'bassinet'    // B, BK
  | 'accessible'  // H
  | 'pet'         // CH
  | 'restricted'  // Hat Warnings (LS, LR, V, LA, GA)
  | 'standard';   // Keine besonderen Codes

function getSeatCategory(codes?: string[]): SeatCategory {
  if (!codes || codes.length === 0) return 'standard';
  
  // Priority order
  if (codes.includes('E') || codes.includes('IE')) return 'exit';
  if (codes.some(c => ['P', 'PS', '1A', 'EC'].includes(c))) return 'preferred';
  if (codes.includes('L') || codes.includes('XL')) return 'extraleg';
  if (codes.includes('K')) return 'bulkhead';
  if (codes.includes('B') || codes.includes('BK')) return 'bassinet';
  if (codes.includes('H')) return 'accessible';
  if (codes.includes('CH')) return 'pet';
  
  return 'standard';
}

const CATEGORY_COLORS: Record<SeatCategory, { bg: string; text: string; icon?: string }> = {
  exit:        { bg: 'bg-amber-500',    text: 'text-white', icon: '🚪' },
  preferred:   { bg: 'bg-violet-500',   text: 'text-white', icon: '⭐' },
  extraleg:    { bg: 'bg-teal-500',     text: 'text-white', icon: '🦵' },
  bulkhead:    { bg: 'bg-indigo-400',   text: 'text-white', icon: '🔲' },
  bassinet:    { bg: 'bg-pink-400',     text: 'text-white', icon: '👶' },
  accessible:  { bg: 'bg-sky-400',      text: 'text-white', icon: '♿' },
  pet:         { bg: 'bg-sky-400',      text: 'text-white', icon: '🐕' },
  restricted:  { bg: 'bg-sky-300',      text: 'text-white' },
  standard:    { bg: 'bg-sky-400',      text: 'text-white' },
};
```

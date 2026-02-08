// Package ordertracker provides in-memory tracking of flight order PNRs
// for cleanup of stale/abandoned bookings.
package ordertracker

import (
	"sync"
	"time"
)

// TrackedOrder represents a tracked PNR order.
type TrackedOrder struct {
	OrderID   string
	CreatedAt time.Time
	Confirmed bool
}

// Tracker manages in-memory order tracking for stale PNR cleanup.
type Tracker struct {
	mu     sync.RWMutex
	orders map[string]*TrackedOrder
}

// New creates a new Tracker.
func New() *Tracker {
	return &Tracker{
		orders: make(map[string]*TrackedOrder),
	}
}

// Track begins tracking a new order.
func (t *Tracker) Track(orderID string) {
	t.mu.Lock()
	defer t.mu.Unlock()
	t.orders[orderID] = &TrackedOrder{
		OrderID:   orderID,
		CreatedAt: time.Now(),
		Confirmed: false,
	}
}

// Confirm marks an order as confirmed (paid/ticketed).
// Confirmed orders will not be auto-cancelled.
func (t *Tracker) Confirm(orderID string) {
	t.mu.Lock()
	defer t.mu.Unlock()
	if order, ok := t.orders[orderID]; ok {
		order.Confirmed = true
	}
}

// Remove stops tracking an order (e.g. after manual cancel).
func (t *Tracker) Remove(orderID string) {
	t.mu.Lock()
	defer t.mu.Unlock()
	delete(t.orders, orderID)
}

// GetStale returns order IDs that are older than maxAge and not confirmed.
func (t *Tracker) GetStale(maxAge time.Duration) []string {
	t.mu.RLock()
	defer t.mu.RUnlock()

	cutoff := time.Now().Add(-maxAge)
	var stale []string
	for _, order := range t.orders {
		if !order.Confirmed && order.CreatedAt.Before(cutoff) {
			stale = append(stale, order.OrderID)
		}
	}
	return stale
}

// Count returns the total number of tracked orders.
func (t *Tracker) Count() int {
	t.mu.RLock()
	defer t.mu.RUnlock()
	return len(t.orders)
}

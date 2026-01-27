// Package cache provides caching implementations
package cache

import (
	"context"
	"log/slog"
	"sync"
	"time"

	lru "github.com/hashicorp/golang-lru/v2"
	"github.com/sersery88/flight-ibe-go/internal/domain"
)

// CacheEntry represents a cached item with TTL
type CacheEntry struct {
	Response  *domain.FlightSearchResponse
	ExpiresAt time.Time
}

// IsExpired checks if the cache entry has expired
func (e *CacheEntry) IsExpired() bool {
	return time.Now().After(e.ExpiresAt)
}

// LRUCache implements domain.FlightCache using an LRU cache
type LRUCache struct {
	cache   *lru.Cache[string, *CacheEntry]
	mu      sync.RWMutex
	ttl     time.Duration
	logger  *slog.Logger
	metrics domain.Metrics
}

// LRUCacheConfig contains configuration for LRUCache
type LRUCacheConfig struct {
	Size    int
	TTL     time.Duration
	Logger  *slog.Logger
	Metrics domain.Metrics
}

// NewLRUCache creates a new LRU cache
func NewLRUCache(config LRUCacheConfig) (*LRUCache, error) {
	if config.Size <= 0 {
		config.Size = 1000 // Default size
	}
	if config.TTL <= 0 {
		config.TTL = 15 * time.Minute // Default TTL
	}
	
	cache, err := lru.New[string, *CacheEntry](config.Size)
	if err != nil {
		return nil, err
	}
	
	lruCache := &LRUCache{
		cache:   cache,
		ttl:     config.TTL,
		logger:  config.Logger,
		metrics: config.Metrics,
	}
	
	// Start background cleanup goroutine
	go lruCache.cleanupExpired()
	
	return lruCache, nil
}

// Get retrieves a cached response
func (c *LRUCache) Get(ctx context.Context, key string) (*domain.FlightSearchResponse, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()
	
	entry, ok := c.cache.Get(key)
	if !ok {
		return nil, false
	}
	
	// Check if expired
	if entry.IsExpired() {
		// Remove expired entry (will be cleaned up in background)
		return nil, false
	}
	
	// Update cache info with current TTL
	if entry.Response.CacheInfo != nil {
		entry.Response.CacheInfo.TTL = int(time.Until(entry.ExpiresAt).Seconds())
	}
	
	return entry.Response, true
}

// Set stores a response in the cache
func (c *LRUCache) Set(ctx context.Context, key string, response *domain.FlightSearchResponse) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	
	expiresAt := time.Now().Add(c.ttl)
	
	// Update cache info
	if response.CacheInfo == nil {
		response.CacheInfo = &domain.CacheInfo{}
	}
	response.CacheInfo.CachedAt = time.Now()
	response.CacheInfo.ExpiresAt = expiresAt
	response.CacheInfo.TTL = int(c.ttl.Seconds())
	
	entry := &CacheEntry{
		Response:  response,
		ExpiresAt: expiresAt,
	}
	
	c.cache.Add(key, entry)
	
	if c.metrics != nil {
		c.metrics.SetCacheSize(c.cache.Len())
	}
	
	if c.logger != nil {
		c.logger.Debug("cached response",
			slog.String("key", key),
			slog.Time("expiresAt", expiresAt),
			slog.Int("cacheSize", c.cache.Len()),
		)
	}
	
	return nil
}

// Delete removes an entry from the cache
func (c *LRUCache) Delete(ctx context.Context, key string) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	
	c.cache.Remove(key)
	
	if c.metrics != nil {
		c.metrics.SetCacheSize(c.cache.Len())
	}
	
	return nil
}

// Clear removes all entries from the cache
func (c *LRUCache) Clear(ctx context.Context) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	
	c.cache.Purge()
	
	if c.metrics != nil {
		c.metrics.SetCacheSize(0)
	}
	
	return nil
}

// Len returns the number of items in the cache
func (c *LRUCache) Len() int {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.cache.Len()
}

// cleanupExpired periodically removes expired entries
func (c *LRUCache) cleanupExpired() {
	ticker := time.NewTicker(time.Minute)
	defer ticker.Stop()
	
	for range ticker.C {
		c.mu.Lock()
		
		// Get all keys and check for expiration
		keys := c.cache.Keys()
		removed := 0
		
		for _, key := range keys {
			if entry, ok := c.cache.Peek(key); ok && entry.IsExpired() {
				c.cache.Remove(key)
				removed++
			}
		}
		
		if c.metrics != nil {
			c.metrics.SetCacheSize(c.cache.Len())
		}
		
		c.mu.Unlock()
		
		if removed > 0 && c.logger != nil {
			c.logger.Debug("cleaned up expired cache entries",
				slog.Int("removed", removed),
				slog.Int("remaining", c.cache.Len()),
			)
		}
	}
}

// Stats returns cache statistics
type CacheStats struct {
	Size      int `json:"size"`
	MaxSize   int `json:"maxSize"`
	HitRate   float64 `json:"hitRate,omitempty"`
}

// Stats returns current cache statistics
func (c *LRUCache) Stats() CacheStats {
	c.mu.RLock()
	defer c.mu.RUnlock()
	
	return CacheStats{
		Size:    c.cache.Len(),
		MaxSize: c.cache.Len(), // LRU doesn't expose cap, using len as approx
	}
}

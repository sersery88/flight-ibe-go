// Package coalesce provides request coalescing to prevent duplicate API calls
package coalesce

import (
	"context"
	"sync"
	"time"
)

// call represents an in-flight request
type call struct {
	wg     sync.WaitGroup
	result interface{}
	err    error
}

// Coalescer coalesces duplicate concurrent requests
type Coalescer struct {
	mu       sync.Mutex
	calls    map[string]*call
	timeout  time.Duration
}

// NewCoalescer creates a new request coalescer
func NewCoalescer(timeout time.Duration) *Coalescer {
	if timeout <= 0 {
		timeout = 30 * time.Second
	}
	
	return &Coalescer{
		calls:   make(map[string]*call),
		timeout: timeout,
	}
}

// Do executes fn for the given key, coalescing duplicate concurrent calls
// If there's already an in-flight request for this key, wait for its result
func (c *Coalescer) Do(ctx context.Context, key string, fn func() (interface{}, error)) (interface{}, error) {
	c.mu.Lock()
	
	// Check if there's already an in-flight request
	if existing, ok := c.calls[key]; ok {
		c.mu.Unlock()
		
		// Wait for the existing call to complete
		done := make(chan struct{})
		go func() {
			existing.wg.Wait()
			close(done)
		}()
		
		select {
		case <-done:
			return existing.result, existing.err
		case <-ctx.Done():
			return nil, ctx.Err()
		}
	}
	
	// Create a new call
	call := &call{}
	call.wg.Add(1)
	c.calls[key] = call
	c.mu.Unlock()
	
	// Execute the function
	go func() {
		defer func() {
			call.wg.Done()
			
			// Remove the call after a short delay to allow for slight timing differences
			time.AfterFunc(100*time.Millisecond, func() {
				c.mu.Lock()
				delete(c.calls, key)
				c.mu.Unlock()
			})
		}()
		
		// Create a context with timeout
		execCtx, cancel := context.WithTimeout(context.Background(), c.timeout)
		defer cancel()
		
		// Use a channel to capture the result
		type result struct {
			value interface{}
			err   error
		}
		resultCh := make(chan result, 1)
		
		go func() {
			v, err := fn()
			resultCh <- result{v, err}
		}()
		
		select {
		case r := <-resultCh:
			call.result = r.value
			call.err = r.err
		case <-execCtx.Done():
			call.err = execCtx.Err()
		}
	}()
	
	// Wait for our call to complete
	done := make(chan struct{})
	go func() {
		call.wg.Wait()
		close(done)
	}()
	
	select {
	case <-done:
		return call.result, call.err
	case <-ctx.Done():
		return nil, ctx.Err()
	}
}

// Len returns the number of in-flight requests
func (c *Coalescer) Len() int {
	c.mu.Lock()
	defer c.mu.Unlock()
	return len(c.calls)
}

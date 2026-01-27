// Package worker provides a worker pool for background task processing
package worker

import (
	"context"
	"log/slog"
	"sync"
	"time"
)

// Task represents a background task
type Task struct {
	Name    string
	Execute func(ctx context.Context) error
}

// Pool manages a pool of workers for background task execution
type Pool struct {
	tasks     chan Task
	wg        sync.WaitGroup
	ctx       context.Context
	cancel    context.CancelFunc
	logger    *slog.Logger
	workers   int
	queueSize int
}

// PoolConfig contains configuration for the worker pool
type PoolConfig struct {
	Workers   int
	QueueSize int
	Logger    *slog.Logger
}

// NewPool creates a new worker pool
func NewPool(config PoolConfig) *Pool {
	if config.Workers <= 0 {
		config.Workers = 4
	}
	if config.QueueSize <= 0 {
		config.QueueSize = 100
	}

	ctx, cancel := context.WithCancel(context.Background())

	pool := &Pool{
		tasks:     make(chan Task, config.QueueSize),
		ctx:       ctx,
		cancel:    cancel,
		logger:    config.Logger,
		workers:   config.Workers,
		queueSize: config.QueueSize,
	}

	// Start workers
	for i := 0; i < config.Workers; i++ {
		pool.wg.Add(1)
		go pool.worker(i)
	}

	if config.Logger != nil {
		config.Logger.Info("worker pool started",
			slog.Int("workers", config.Workers),
			slog.Int("queueSize", config.QueueSize),
		)
	}

	return pool
}

// worker is the main worker loop
func (p *Pool) worker(id int) {
	defer p.wg.Done()

	for {
		select {
		case <-p.ctx.Done():
			return
		case task, ok := <-p.tasks:
			if !ok {
				return
			}
			p.executeTask(id, task)
		}
	}
}

// executeTask executes a task with error handling
func (p *Pool) executeTask(workerID int, task Task) {
	start := time.Now()

	// Create a context with timeout for the task
	ctx, cancel := context.WithTimeout(p.ctx, 30*time.Second)
	defer cancel()

	// Execute task with panic recovery
	func() {
		defer func() {
			if r := recover(); r != nil {
				if p.logger != nil {
					p.logger.Error("task panic",
						slog.Int("worker", workerID),
						slog.String("task", task.Name),
						slog.Any("panic", r),
					)
				}
			}
		}()

		if err := task.Execute(ctx); err != nil {
			if p.logger != nil {
				p.logger.Error("task failed",
					slog.Int("worker", workerID),
					slog.String("task", task.Name),
					slog.String("error", err.Error()),
					slog.Duration("duration", time.Since(start)),
				)
			}
		} else {
			if p.logger != nil {
				p.logger.Debug("task completed",
					slog.Int("worker", workerID),
					slog.String("task", task.Name),
					slog.Duration("duration", time.Since(start)),
				)
			}
		}
	}()
}

// Submit adds a task to the pool
func (p *Pool) Submit(task Task) bool {
	select {
	case p.tasks <- task:
		return true
	default:
		// Queue is full
		if p.logger != nil {
			p.logger.Warn("task queue full, dropping task",
				slog.String("task", task.Name),
			)
		}
		return false
	}
}

// SubmitFunc is a convenience method to submit a function as a task
func (p *Pool) SubmitFunc(name string, fn func(ctx context.Context) error) bool {
	return p.Submit(Task{
		Name:    name,
		Execute: fn,
	})
}

// SubmitWait submits a task and waits for it to complete
func (p *Pool) SubmitWait(ctx context.Context, task Task) error {
	done := make(chan error, 1)

	wrappedTask := Task{
		Name: task.Name,
		Execute: func(taskCtx context.Context) error {
			err := task.Execute(taskCtx)
			done <- err
			return err
		},
	}

	if !p.Submit(wrappedTask) {
		return context.DeadlineExceeded
	}

	select {
	case err := <-done:
		return err
	case <-ctx.Done():
		return ctx.Err()
	}
}

// Shutdown gracefully shuts down the pool
func (p *Pool) Shutdown(timeout time.Duration) {
	// Stop accepting new tasks
	p.cancel()
	close(p.tasks)

	// Wait for workers to finish with timeout
	done := make(chan struct{})
	go func() {
		p.wg.Wait()
		close(done)
	}()

	select {
	case <-done:
		if p.logger != nil {
			p.logger.Info("worker pool shutdown complete")
		}
	case <-time.After(timeout):
		if p.logger != nil {
			p.logger.Warn("worker pool shutdown timed out")
		}
	}
}

// Stats returns pool statistics
type PoolStats struct {
	Workers   int `json:"workers"`
	QueueSize int `json:"queueSize"`
	QueueUsed int `json:"queueUsed"`
}

// Stats returns current pool statistics
func (p *Pool) Stats() PoolStats {
	return PoolStats{
		Workers:   p.workers,
		QueueSize: p.queueSize,
		QueueUsed: len(p.tasks),
	}
}

// Scheduler runs periodic tasks
type Scheduler struct {
	pool   *Pool
	tasks  []scheduledTask
	ctx    context.Context
	cancel context.CancelFunc
	wg     sync.WaitGroup
	logger *slog.Logger
}

type scheduledTask struct {
	name     string
	interval time.Duration
	fn       func(ctx context.Context) error
}

// NewScheduler creates a new task scheduler
func NewScheduler(pool *Pool, logger *slog.Logger) *Scheduler {
	ctx, cancel := context.WithCancel(context.Background())
	return &Scheduler{
		pool:   pool,
		ctx:    ctx,
		cancel: cancel,
		logger: logger,
	}
}

// Schedule adds a periodic task
func (s *Scheduler) Schedule(name string, interval time.Duration, fn func(ctx context.Context) error) {
	s.tasks = append(s.tasks, scheduledTask{
		name:     name,
		interval: interval,
		fn:       fn,
	})
}

// Start starts all scheduled tasks
func (s *Scheduler) Start() {
	for _, task := range s.tasks {
		s.wg.Add(1)
		go s.runScheduled(task)
	}
	
	if s.logger != nil {
		s.logger.Info("scheduler started",
			slog.Int("tasks", len(s.tasks)),
		)
	}
}

func (s *Scheduler) runScheduled(task scheduledTask) {
	defer s.wg.Done()

	ticker := time.NewTicker(task.interval)
	defer ticker.Stop()

	// Run immediately on start
	s.pool.SubmitFunc(task.name, task.fn)

	for {
		select {
		case <-s.ctx.Done():
			return
		case <-ticker.C:
			s.pool.SubmitFunc(task.name, task.fn)
		}
	}
}

// Stop stops the scheduler
func (s *Scheduler) Stop() {
	s.cancel()
	s.wg.Wait()
	
	if s.logger != nil {
		s.logger.Info("scheduler stopped")
	}
}

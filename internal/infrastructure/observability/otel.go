// Package observability provides OpenTelemetry setup and observability utilities
package observability

import (
	"context"
	"errors"
	"time"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp"
	"go.opentelemetry.io/otel/exporters/prometheus"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/otel/sdk/metric"
	"go.opentelemetry.io/otel/sdk/resource"
	"go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.24.0"
)

// Config for OpenTelemetry setup
type Config struct {
	ServiceName    string
	ServiceVersion string
	Environment    string
	OTLPEndpoint   string // If empty, uses stdout
	EnableTracing  bool
	EnableMetrics  bool
}

// OTelSDK holds the OpenTelemetry SDK components
type OTelSDK struct {
	tracerProvider *trace.TracerProvider
	meterProvider  *metric.MeterProvider
	shutdownFuncs  []func(context.Context) error
}

// SetupOTelSDK initializes the OpenTelemetry SDK
func SetupOTelSDK(ctx context.Context, config Config) (*OTelSDK, error) {
	sdk := &OTelSDK{}

	// Create resource
	res, err := resource.Merge(
		resource.Default(),
		resource.NewWithAttributes(
			semconv.SchemaURL,
			semconv.ServiceName(config.ServiceName),
			semconv.ServiceVersion(config.ServiceVersion),
			semconv.DeploymentEnvironment(config.Environment),
		),
	)
	if err != nil {
		return nil, err
	}

	// Set up propagator
	otel.SetTextMapPropagator(propagation.NewCompositeTextMapPropagator(
		propagation.TraceContext{},
		propagation.Baggage{},
	))

	// Set up tracing
	if config.EnableTracing {
		var exporter trace.SpanExporter
		var err error

		if config.OTLPEndpoint != "" {
			exporter, err = otlptracehttp.New(ctx,
				otlptracehttp.WithEndpoint(config.OTLPEndpoint),
				otlptracehttp.WithInsecure(),
			)
		} else {
			// Use stdout exporter for development
			exporter, err = newStdoutTraceExporter()
		}

		if err != nil {
			return nil, err
		}

		sdk.tracerProvider = trace.NewTracerProvider(
			trace.WithBatcher(exporter, trace.WithBatchTimeout(time.Second)),
			trace.WithResource(res),
			trace.WithSampler(trace.AlwaysSample()),
		)
		sdk.shutdownFuncs = append(sdk.shutdownFuncs, sdk.tracerProvider.Shutdown)
		otel.SetTracerProvider(sdk.tracerProvider)
	}

	// Set up metrics
	if config.EnableMetrics {
		promExporter, err := prometheus.New()
		if err != nil {
			return nil, err
		}

		sdk.meterProvider = metric.NewMeterProvider(
			metric.WithResource(res),
			metric.WithReader(promExporter),
		)
		sdk.shutdownFuncs = append(sdk.shutdownFuncs, sdk.meterProvider.Shutdown)
		otel.SetMeterProvider(sdk.meterProvider)
	}

	return sdk, nil
}

// Shutdown gracefully shuts down the SDK
func (sdk *OTelSDK) Shutdown(ctx context.Context) error {
	var errs []error
	for _, fn := range sdk.shutdownFuncs {
		if err := fn(ctx); err != nil {
			errs = append(errs, err)
		}
	}
	return errors.Join(errs...)
}

// TracerProvider returns the tracer provider
func (sdk *OTelSDK) TracerProvider() *trace.TracerProvider {
	return sdk.tracerProvider
}

// MeterProvider returns the meter provider
func (sdk *OTelSDK) MeterProvider() *metric.MeterProvider {
	return sdk.meterProvider
}

// newStdoutTraceExporter creates a stdout exporter for development
func newStdoutTraceExporter() (trace.SpanExporter, error) {
	// For development, we just use a no-op exporter
	// In production, configure OTLP endpoint
	return &noopExporter{}, nil
}

// noopExporter is a no-op span exporter for development
type noopExporter struct{}

func (e *noopExporter) ExportSpans(ctx context.Context, spans []trace.ReadOnlySpan) error {
	return nil
}

func (e *noopExporter) Shutdown(ctx context.Context) error {
	return nil
}

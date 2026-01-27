// Package amadeus provides a client for the Amadeus Self-Service APIs
package amadeus

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"sync"
	"time"
)

// Environment constants
const (
	TestBaseURL       = "https://test.api.amadeus.com"
	ProductionBaseURL = "https://api.amadeus.com"
)

// Client for Amadeus API
type Client struct {
	httpClient   *http.Client
	baseURL      string
	clientID     string
	clientSecret string

	// Token cache
	tokenMu     sync.RWMutex
	accessToken string
	tokenExpiry time.Time
}

// TokenResponse from OAuth2 endpoint
type TokenResponse struct {
	AccessToken string `json:"access_token"`
	TokenType   string `json:"token_type"`
	ExpiresIn   int64  `json:"expires_in"`
}

// NewClient creates a new Amadeus API client
func NewClient() (*Client, error) {
	clientID := os.Getenv("AMADEUS_CLIENT_ID")
	clientSecret := os.Getenv("AMADEUS_CLIENT_SECRET")

	if clientID == "" || clientSecret == "" {
		return nil, fmt.Errorf("AMADEUS_CLIENT_ID and AMADEUS_CLIENT_SECRET must be set")
	}

	baseURL := TestBaseURL
	if os.Getenv("AMADEUS_ENV") == "production" {
		baseURL = ProductionBaseURL
	}

	return &Client{
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
		baseURL:      baseURL,
		clientID:     clientID,
		clientSecret: clientSecret,
	}, nil
}

// IsProduction returns true if using production environment
func (c *Client) IsProduction() bool {
	return c.baseURL == ProductionBaseURL
}

// GetToken returns a valid access token, refreshing if necessary
func (c *Client) GetToken() (string, error) {
	c.tokenMu.RLock()
	if c.accessToken != "" && time.Now().Add(60*time.Second).Before(c.tokenExpiry) {
		token := c.accessToken
		c.tokenMu.RUnlock()
		return token, nil
	}
	c.tokenMu.RUnlock()

	return c.refreshToken()
}

// refreshToken fetches a new access token
func (c *Client) refreshToken() (string, error) {
	c.tokenMu.Lock()
	defer c.tokenMu.Unlock()

	// Double-check after acquiring write lock
	if c.accessToken != "" && time.Now().Add(60*time.Second).Before(c.tokenExpiry) {
		return c.accessToken, nil
	}

	data := url.Values{}
	data.Set("grant_type", "client_credentials")
	data.Set("client_id", c.clientID)
	data.Set("client_secret", c.clientSecret)

	req, err := http.NewRequest("POST", c.baseURL+"/v1/security/oauth2/token", bytes.NewBufferString(data.Encode()))
	if err != nil {
		return "", fmt.Errorf("failed to create token request: %w", err)
	}

	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("token request failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read token response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("token request failed with status %d: %s", resp.StatusCode, string(body))
	}

	var tokenResp TokenResponse
	if err := json.Unmarshal(body, &tokenResp); err != nil {
		return "", fmt.Errorf("failed to parse token response: %w", err)
	}

	c.accessToken = tokenResp.AccessToken
	// Set expiry with 2-minute buffer
	c.tokenExpiry = time.Now().Add(time.Duration(tokenResp.ExpiresIn-120) * time.Second)

	return c.accessToken, nil
}

// doRequest performs an authenticated HTTP request
func (c *Client) doRequest(method, path string, body interface{}) ([]byte, error) {
	token, err := c.GetToken()
	if err != nil {
		return nil, err
	}

	var reqBody io.Reader
	if body != nil {
		jsonBody, err := json.Marshal(body)
		if err != nil {
			return nil, fmt.Errorf("failed to marshal request body: %w", err)
		}
		reqBody = bytes.NewBuffer(jsonBody)
	}

	req, err := http.NewRequest(method, c.baseURL+path, reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+token)
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("API error (status %d): %s", resp.StatusCode, string(respBody))
	}

	return respBody, nil
}

// Get performs a GET request
func (c *Client) Get(path string) ([]byte, error) {
	return c.doRequest("GET", path, nil)
}

// Post performs a POST request
func (c *Client) Post(path string, body interface{}) ([]byte, error) {
	return c.doRequest("POST", path, body)
}

// Delete performs a DELETE request
func (c *Client) Delete(path string) ([]byte, error) {
	return c.doRequest("DELETE", path, nil)
}

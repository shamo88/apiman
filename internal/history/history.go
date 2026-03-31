package history

import (
	"apiman/internal/models"
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
)

const (
	MaxHistoryEntries = 2000
	indexFileName    = "index.json"
	detailDirName    = "detail"
)

type HistoryManager struct {
	historyDir string
	detailDir  string
	indexPath  string
	mu         sync.RWMutex
}

func NewHistoryManager(configDir string) (*HistoryManager, error) {
	historyDir := filepath.Join(configDir, "history")
	if err := os.MkdirAll(historyDir, 0755); err != nil {
		return nil, err
	}
	detailDir := filepath.Join(historyDir, detailDirName)
	if err := os.MkdirAll(detailDir, 0755); err != nil {
		return nil, err
	}
	indexPath := filepath.Join(historyDir, indexFileName)

	mgr := &HistoryManager{
		historyDir: historyDir,
		detailDir:  detailDir,
		indexPath:  indexPath,
	}

	// Initialize index file if not exists
	if _, err := os.Stat(indexPath); os.IsNotExist(err) {
		if err := mgr.saveIndex([]models.HistoryIndex{}); err != nil {
			return nil, err
		}
	}

	return mgr, nil
}

func (h *HistoryManager) loadIndex() ([]models.HistoryIndex, error) {
	data, err := os.ReadFile(h.indexPath)
	if err != nil {
		if os.IsNotExist(err) {
			return []models.HistoryIndex{}, nil
		}
		return nil, err
	}
	var entries []models.HistoryIndex
	if err := json.Unmarshal(data, &entries); err != nil {
		return nil, err
	}
	return entries, nil
}

func (h *HistoryManager) saveIndex(entries []models.HistoryIndex) error {
	data, err := json.MarshalIndent(entries, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(h.indexPath, data, 0644)
}

func (h *HistoryManager) AddEntry(entry *models.RequestHistory) error {
	h.mu.Lock()
	defer h.mu.Unlock()

	if entry.ID == "" {
		entry.ID = uuid.New().String()
	}
	if entry.CreatedAt.IsZero() {
		entry.CreatedAt = time.Now()
	}

	// Save detail file
	data, err := json.MarshalIndent(entry, "", "  ")
	if err != nil {
		return err
	}
	detailFile := filepath.Join(h.detailDir, entry.ID+".json")
	if err := os.WriteFile(detailFile, data, 0644); err != nil {
		return err
	}

	// Load current index
	entries, err := h.loadIndexUnsafe()
	if err != nil {
		return err
	}

	// Determine status
	status := "success"
	responseCode := 0
	if entry.Response != nil {
		if entry.Response.Error != "" {
			status = "error"
		}
		responseCode = entry.Response.StatusCode
	}

	// Create index entry
	indexEntry := models.HistoryIndex{
		ID:           entry.ID,
		Timestamp:    entry.CreatedAt,
		Source:       entry.Source,
		SourceTool:   entry.SourceTool,
		ProjectID:    entry.ProjectID,
		ProjectName:  entry.ProjectName,
		RequestName:  entry.RequestName,
		RequestPath:  entry.RequestPath,
		Method:       entry.Method,
		URL:          entry.URL,
		Status:       status,
		ResponseCode: responseCode,
		Duration:     entry.Response.Duration,
		DetailFile:   detailFile,
	}

	// Add to beginning (newest first)
	entries = append([]models.HistoryIndex{indexEntry}, entries...)

	// Trim to max entries
	var removedEntries []models.HistoryIndex
	if len(entries) > MaxHistoryEntries {
		removedEntries = entries[MaxHistoryEntries:]
		entries = entries[:MaxHistoryEntries]
	}

	// Save updated index
	if err := h.saveIndexUnsafe(entries); err != nil {
		return err
	}

	// Delete detail files for removed entries
	for _, removed := range removedEntries {
		os.Remove(removed.DetailFile)
	}

	return nil
}

func (h *HistoryManager) loadIndexUnsafe() ([]models.HistoryIndex, error) {
	data, err := os.ReadFile(h.indexPath)
	if err != nil {
		if os.IsNotExist(err) {
			return []models.HistoryIndex{}, nil
		}
		return nil, err
	}
	var entries []models.HistoryIndex
	if err := json.Unmarshal(data, &entries); err != nil {
		return nil, err
	}
	return entries, nil
}

func (h *HistoryManager) saveIndexUnsafe(entries []models.HistoryIndex) error {
	data, err := json.MarshalIndent(entries, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(h.indexPath, data, 0644)
}

func (h *HistoryManager) SearchEntries(params models.HistorySearchParams, limit int) ([]models.HistoryEntry, error) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	if limit <= 0 {
		limit = 100
	}

	entries, err := h.loadIndexUnsafe()
	if err != nil {
		return nil, err
	}

	// Convert time filters
	var fromTime, toTime *time.Time
	if params.From != "" {
		if t, err := time.Parse("2006-01-02", params.From); err == nil {
			fromTime = &t
		}
	}
	if params.To != "" {
		if t, err := time.Parse("2006-01-02", params.To); err == nil {
			// Add one day to include the entire end date
			t = t.Add(24*time.Hour - time.Second)
			toTime = &t
		}
	}

	var result []models.HistoryEntry
	for _, e := range entries {
		if !h.matchEntry(&e, params, fromTime, toTime) {
			continue
		}

		result = append(result, models.HistoryEntry{
			ID:          e.ID,
			Source:      e.Source,
			SourceTool:  e.SourceTool,
			ProjectName: e.ProjectName,
			RequestName: e.RequestName,
			Method:      e.Method,
			URL:         e.URL,
			StatusCode:  e.ResponseCode,
			Duration:    e.Duration,
			CreatedAt:   e.Timestamp,
		})

		if len(result) >= limit {
			break
		}
	}

	return result, nil
}

func (h *HistoryManager) matchEntry(e *models.HistoryIndex, params models.HistorySearchParams, fromTime, toTime *time.Time) bool {
	// Time filter
	if fromTime != nil && e.Timestamp.Before(*fromTime) {
		return false
	}
	if toTime != nil && e.Timestamp.After(*toTime) {
		return false
	}

	// Method filter (case insensitive exact match)
	if params.Method != "" && !strings.EqualFold(e.Method, params.Method) {
		return false
	}

	// Status code filter
	if params.Status > 0 && e.ResponseCode != params.Status {
		return false
	}

	// Source filter (case insensitive exact match)
	if params.Source != "" && !strings.EqualFold(string(e.Source), params.Source) {
		return false
	}

	// Tool filter (case insensitive exact match)
	if params.Tool != "" && !strings.EqualFold(e.SourceTool, params.Tool) {
		return false
	}

	// Project name fuzzy search
	if params.Project != "" && !strings.Contains(strings.ToLower(e.ProjectName), strings.ToLower(params.Project)) {
		return false
	}

	// Request name fuzzy search
	if params.Name != "" && !strings.Contains(strings.ToLower(e.RequestName), strings.ToLower(params.Name)) {
		return false
	}

	// URL fuzzy search
	if params.URL != "" && !strings.Contains(strings.ToLower(e.URL), strings.ToLower(params.URL)) {
		return false
	}

	// Keyword综合搜索 (URL + request name)
	if params.Keyword != "" {
		kw := strings.ToLower(params.Keyword)
		if !strings.Contains(strings.ToLower(e.RequestName), kw) && !strings.Contains(strings.ToLower(e.URL), kw) {
			return false
		}
	}

	return true
}

func (h *HistoryManager) ListEntries(limit int) ([]models.HistoryEntry, error) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	if limit <= 0 {
		limit = 100
	}

	entries, err := h.loadIndexUnsafe()
	if err != nil {
		return nil, err
	}

	if limit > len(entries) {
		limit = len(entries)
	}

	result := make([]models.HistoryEntry, 0, limit)
	for i := 0; i < limit; i++ {
		e := entries[i]
		result = append(result, models.HistoryEntry{
			ID:          e.ID,
			Source:      e.Source,
			SourceTool:  e.SourceTool,
			ProjectName: e.ProjectName,
			RequestName: e.RequestName,
			Method:      e.Method,
			URL:         e.URL,
			StatusCode:  e.ResponseCode,
			Duration:    e.Duration,
			CreatedAt:   e.Timestamp,
		})
	}

	return result, nil
}

func (h *HistoryManager) GetEntry(id string) (*models.RequestHistory, error) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	entries, err := h.loadIndexUnsafe()
	if err != nil {
		return nil, err
	}

	for _, e := range entries {
		if e.ID == id {
			data, err := os.ReadFile(e.DetailFile)
			if err != nil {
				return nil, err
			}
			var entry models.RequestHistory
			if err := json.Unmarshal(data, &entry); err != nil {
				return nil, err
			}
			return &entry, nil
		}
	}

	return nil, os.ErrNotExist
}

func (h *HistoryManager) DeleteEntry(id string) error {
	h.mu.Lock()
	defer h.mu.Unlock()

	entries, err := h.loadIndexUnsafe()
	if err != nil {
		return err
	}

	var newEntries []models.HistoryIndex
	var detailFile string
	for _, e := range entries {
		if e.ID == id {
			detailFile = e.DetailFile
		} else {
			newEntries = append(newEntries, e)
		}
	}

	if detailFile == "" {
		return os.ErrNotExist
	}

	if err := h.saveIndexUnsafe(newEntries); err != nil {
		return err
	}

	os.Remove(detailFile)
	return nil
}

func (h *HistoryManager) ClearAll() error {
	h.mu.Lock()
	defer h.mu.Unlock()

	// Clear index
	if err := h.saveIndexUnsafe([]models.HistoryIndex{}); err != nil {
		return err
	}

	// Clear detail directory
	files, err := os.ReadDir(h.detailDir)
	if err != nil {
		return err
	}
	for _, f := range files {
		os.Remove(filepath.Join(h.detailDir, f.Name()))
	}

	return nil
}

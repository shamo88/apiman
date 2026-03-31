package history

import (
	"apiman/internal/models"
	"encoding/json"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/google/uuid"
)

type HistoryManager struct {
	historyDir string
	mu         sync.RWMutex
}

func NewHistoryManager(configDir string) (*HistoryManager, error) {
	historyDir := filepath.Join(configDir, "history")
	if err := os.MkdirAll(historyDir, 0755); err != nil {
		return nil, err
	}
	return &HistoryManager{
		historyDir: historyDir,
	}, nil
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

	data, err := json.MarshalIndent(entry, "", "  ")
	if err != nil {
		return err
	}

	filename := filepath.Join(h.historyDir, entry.ID+".json")
	return os.WriteFile(filename, data, 0644)
}

func (h *HistoryManager) ListEntries(limit int) ([]models.HistoryEntry, error) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	var entries []models.HistoryEntry
	limit = limit
	if limit <= 0 {
		limit = 100
	}

	files, err := os.ReadDir(h.historyDir)
	if err != nil {
		return nil, err
	}

	// Sort by modification time (newest first)
	type fileInfo struct {
		name    string
		modTime time.Time
	}
	var fileInfos []fileInfo
	for _, f := range files {
		if f.IsDir() || filepath.Ext(f.Name()) != ".json" {
			continue
		}
		info, _ := f.Info()
		fileInfos = append(fileInfos, fileInfo{f.Name(), info.ModTime()})
	}

	// Sort descending by mod time
	for i := 0; i < len(fileInfos)-1; i++ {
		for j := i + 1; j < len(fileInfos); j++ {
			if fileInfos[j].modTime.After(fileInfos[i].modTime) {
				fileInfos[i], fileInfos[j] = fileInfos[j], fileInfos[i]
			}
		}
	}

	count := 0
	for _, fi := range fileInfos {
		if count >= limit {
			break
		}
		data, err := os.ReadFile(filepath.Join(h.historyDir, fi.name))
		if err != nil {
			continue
		}
		var entry models.RequestHistory
		if err := json.Unmarshal(data, &entry); err != nil {
			continue
		}
		historyEntry := models.HistoryEntry{
			ID:          entry.ID,
			ProjectName: entry.ProjectName,
			RequestName: entry.RequestName,
			Method:      entry.Method,
			URL:         entry.URL,
			CreatedAt:   entry.CreatedAt,
		}
		if entry.Response != nil {
			historyEntry.StatusCode = entry.Response.StatusCode
			historyEntry.Duration = entry.Response.Duration
		}
		entries = append(entries, historyEntry)
		count++
	}

	return entries, nil
}

func (h *HistoryManager) GetEntry(id string) (*models.RequestHistory, error) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	filename := filepath.Join(h.historyDir, id+".json")
	data, err := os.ReadFile(filename)
	if err != nil {
		return nil, err
	}

	var entry models.RequestHistory
	if err := json.Unmarshal(data, &entry); err != nil {
		return nil, err
	}
	return &entry, nil
}

func (h *HistoryManager) DeleteEntry(id string) error {
	h.mu.Lock()
	defer h.mu.Unlock()

	filename := filepath.Join(h.historyDir, id+".json")
	return os.Remove(filename)
}

func (h *HistoryManager) ClearAll() error {
	h.mu.Lock()
	defer h.mu.Unlock()

	files, err := os.ReadDir(h.historyDir)
	if err != nil {
		return err
	}
	for _, f := range files {
		if f.IsDir() {
			continue
		}
		os.Remove(filepath.Join(h.historyDir, f.Name()))
	}
	return nil
}

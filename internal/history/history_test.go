package history

import (
	"os"
	"path/filepath"
	"testing"
	"time"

	"apiman/internal/models"
)

func TestHistoryManager_AddEntry(t *testing.T) {
	// 创建临时目录
	tmpDir := t.TempDir()

	mgr, err := NewHistoryManager(tmpDir)
	if err != nil {
		t.Fatalf("failed to create history manager: %v", err)
	}

	entry := &models.RequestHistory{
		ProjectID:   "test-project",
		ProjectName: "Test Project",
		RequestName: "Test Request",
		RequestPath: "/test/path",
		Method:      "GET",
		URL:         "https://api.example.com/test",
		Source:      models.HistorySourceGUI,
		Response:    &models.CurlResponse{StatusCode: 200, Duration: 100},
	}

	err = mgr.AddEntry(entry)
	if err != nil {
		t.Fatalf("failed to add entry: %v", err)
	}

	// 验证条目已添加
	entries, err := mgr.ListEntries(10)
	if err != nil {
		t.Fatalf("failed to list entries: %v", err)
	}

	if len(entries) != 1 {
		t.Errorf("expected 1 entry, got %d", len(entries))
	}

	if entries[0].ProjectName != "Test Project" {
		t.Errorf("expected project name 'Test Project', got '%s'", entries[0].ProjectName)
	}
}

func TestHistoryManager_ListEntries_Limit(t *testing.T) {
	tmpDir := t.TempDir()

	mgr, err := NewHistoryManager(tmpDir)
	if err != nil {
		t.Fatalf("failed to create history manager: %v", err)
	}

	// 添加5个条目
	for i := 0; i < 5; i++ {
		entry := &models.RequestHistory{
			ProjectID:   "test-project",
			RequestName: "Request",
			Method:      "GET",
			URL:         "https://api.example.com/test",
			Source:      models.HistorySourceGUI,
			Response:    &models.CurlResponse{StatusCode: 200, Duration: 100},
		}
		if err := mgr.AddEntry(entry); err != nil {
			t.Fatalf("failed to add entry %d: %v", i, err)
		}
	}

	// 测试限制
	entries, err := mgr.ListEntries(3)
	if err != nil {
		t.Fatalf("failed to list entries: %v", err)
	}

	if len(entries) != 3 {
		t.Errorf("expected 3 entries with limit, got %d", len(entries))
	}
}

func TestHistoryManager_DeleteEntry(t *testing.T) {
	tmpDir := t.TempDir()

	mgr, err := NewHistoryManager(tmpDir)
	if err != nil {
		t.Fatalf("failed to create history manager: %v", err)
	}

	entry := &models.RequestHistory{
		ProjectID:   "test-project",
		RequestName: "Test Request",
		Method:      "GET",
		URL:         "https://api.example.com/test",
		Source:      models.HistorySourceGUI,
		Response:    &models.CurlResponse{StatusCode: 200, Duration: 100},
	}

	if err := mgr.AddEntry(entry); err != nil {
		t.Fatalf("failed to add entry: %v", err)
	}

	entries, _ := mgr.ListEntries(10)
	if len(entries) != 1 {
		t.Fatalf("expected 1 entry, got %d", len(entries))
	}

	// 删除条目
	if err := mgr.DeleteEntry(entries[0].ID); err != nil {
		t.Fatalf("failed to delete entry: %v", err)
	}

	// 验证删除
	entries, err = mgr.ListEntries(10)
	if err != nil {
		t.Fatalf("failed to list entries: %v", err)
	}

	if len(entries) != 0 {
		t.Errorf("expected 0 entries after delete, got %d", len(entries))
	}
}

func TestHistoryManager_ClearAll(t *testing.T) {
	tmpDir := t.TempDir()

	mgr, err := NewHistoryManager(tmpDir)
	if err != nil {
		t.Fatalf("failed to create history manager: %v", err)
	}

	// 添加多个条目
	for i := 0; i < 3; i++ {
		entry := &models.RequestHistory{
			ProjectID:   "test-project",
			RequestName: "Request",
			Method:      "GET",
			URL:         "https://api.example.com/test",
			Source:      models.HistorySourceGUI,
			Response:    &models.CurlResponse{StatusCode: 200, Duration: 100},
		}
		if err := mgr.AddEntry(entry); err != nil {
			t.Fatalf("failed to add entry: %v", err)
		}
	}

	// 清空
	if err := mgr.ClearAll(); err != nil {
		t.Fatalf("failed to clear all: %v", err)
	}

	// 验证
	entries, err := mgr.ListEntries(10)
	if err != nil {
		t.Fatalf("failed to list entries: %v", err)
	}

	if len(entries) != 0 {
		t.Errorf("expected 0 entries after clear, got %d", len(entries))
	}
}

func TestHistoryManager_SearchEntries(t *testing.T) {
	tmpDir := t.TempDir()

	mgr, err := NewHistoryManager(tmpDir)
	if err != nil {
		t.Fatalf("failed to create history manager: %v", err)
	}

	// 添加测试数据
	testCases := []struct {
		method string
		url    string
	}{
		{"GET", "https://api.example.com/users"},
		{"POST", "https://api.example.com/users"},
		{"GET", "https://api.example.com/products"},
		{"DELETE", "https://api.example.com/users/1"},
	}

	for _, tc := range testCases {
		entry := &models.RequestHistory{
			ProjectID:   "test-project",
			RequestName: "Test",
			Method:      tc.method,
			URL:         tc.url,
			Source:      models.HistorySourceGUI,
			Response:    &models.CurlResponse{StatusCode: 200, Duration: 100},
		}
		if err := mgr.AddEntry(entry); err != nil {
			t.Fatalf("failed to add entry: %v", err)
		}
	}

	// 测试方法过滤
	params := models.HistorySearchParams{
		Method: "GET",
	}
	results, err := mgr.SearchEntries(params, 10)
	if err != nil {
		t.Fatalf("failed to search entries: %v", err)
	}

	if len(results) != 2 {
		t.Errorf("expected 2 GET entries, got %d", len(results))
	}

	// 测试 URL 过滤
	params = models.HistorySearchParams{
		URL: "users",
	}
	results, err = mgr.SearchEntries(params, 10)
	if err != nil {
		t.Fatalf("failed to search entries: %v", err)
	}

	if len(results) != 3 {
		t.Errorf("expected 3 entries matching 'users', got %d", len(results))
	}
}

func TestHistoryManager_GetEntry(t *testing.T) {
	tmpDir := t.TempDir()

	mgr, err := NewHistoryManager(tmpDir)
	if err != nil {
		t.Fatalf("failed to create history manager: %v", err)
	}

	entry := &models.RequestHistory{
		ProjectID:   "test-project",
		ProjectName: "Test Project",
		RequestName: "Test Request",
		Method:      "POST",
		URL:         "https://api.example.com/create",
		Source:      models.HistorySourceGUI,
		Response:    &models.CurlResponse{StatusCode: 201, Duration: 150},
	}

	if err := mgr.AddEntry(entry); err != nil {
		t.Fatalf("failed to add entry: %v", err)
	}

	entries, _ := mgr.ListEntries(10)
	if len(entries) != 1 {
		t.Fatalf("expected 1 entry, got %d", len(entries))
	}

	// 获取详情
	detail, err := mgr.GetEntry(entries[0].ID)
	if err != nil {
		t.Fatalf("failed to get entry: %v", err)
	}

	if detail == nil {
		t.Fatal("expected entry detail, got nil")
	}

	if detail.ProjectName != "Test Project" {
		t.Errorf("expected project name 'Test Project', got '%s'", detail.ProjectName)
	}
}

func TestHistoryManager_EntryTimestamp(t *testing.T) {
	tmpDir := t.TempDir()

	mgr, err := NewHistoryManager(tmpDir)
	if err != nil {
		t.Fatalf("failed to create history manager: %v", err)
	}

	before := time.Now().Add(-time.Second)

	entry := &models.RequestHistory{
		ProjectID:   "test-project",
		RequestName: "Test",
		Method:      "GET",
		URL:         "https://api.example.com/test",
		Source:      models.HistorySourceGUI,
		Response:    &models.CurlResponse{StatusCode: 200, Duration: 100},
	}

	if err := mgr.AddEntry(entry); err != nil {
		t.Fatalf("failed to add entry: %v", err)
	}

	after := time.Now().Add(time.Second)

	entries, _ := mgr.ListEntries(10)
	if len(entries) != 1 {
		t.Fatalf("expected 1 entry, got %d", len(entries))
	}

	entryTime := entries[0].CreatedAt
	if entryTime.Before(before) || entryTime.After(after) {
		t.Errorf("entry timestamp %v is outside expected range [%v, %v]", entryTime, before, after)
	}
}

// 测试空目录情况
func TestHistoryManager_EmptyDir(t *testing.T) {
	tmpDir := t.TempDir()

	mgr, err := NewHistoryManager(tmpDir)
	if err != nil {
		t.Fatalf("failed to create history manager: %v", err)
	}

	entries, err := mgr.ListEntries(10)
	if err != nil {
		t.Fatalf("failed to list entries: %v", err)
	}

	if len(entries) != 0 {
		t.Errorf("expected 0 entries for empty dir, got %d", len(entries))
	}
}

// 测试不存在目录
func TestHistoryManager_NonExistentDir(t *testing.T) {
	nonExistent := filepath.Join(os.TempDir(), "non-existent-dir", "history-test")

	_, err := NewHistoryManager(nonExistent)
	if err == nil {
		t.Error("expected error for non-existent directory, got nil")
	}
}

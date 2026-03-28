package postman

import (
	"apiman/internal/models"
	"encoding/json"
	"os"
	"path/filepath"
	"strings"

	"github.com/google/uuid"
)

// CollectionFileName is a single Postman Collection v2.1 JSON file per project.
const CollectionFileName = "collection.postman.json"

type Collection struct {
	Info PostmanInfo      `json:"info"`
	Item []CollectionItem `json:"item"`
}

type CollectionItem struct {
	ID           string             `json:"id,omitempty"`
	Name         string             `json:"name"`
	Item         []CollectionItem   `json:"item,omitempty"`
	Request      *CollectionRequest `json:"request,omitempty"`
	Event        []PostmanEvent     `json:"event,omitempty"`
	PreScriptID  string             `json:"_apiman_pre_script_id,omitempty"`
	PostScriptID string             `json:"_apiman_post_script_id,omitempty"`

	ApimanCases        []models.HttpRequestCase `json:"_apiman_cases,omitempty"`
	ApimanActiveCaseID string                   `json:"_apiman_active_case_id,omitempty"`
}

type PostmanInfo struct {
	ID          string `json:"_postman_id,omitempty"`
	Name        string `json:"name"`
	Schema      string `json:"schema,omitempty"`
	Description string `json:"description,omitempty"`
}

type CollectionRequest struct {
	Method           string          `json:"method"`
	Header           []PostmanHeader `json:"header,omitempty"`
	URL              *PostmanURL     `json:"url"`
	Body             *PostmanBody    `json:"body,omitempty"`
	ApimanBodyType   string          `json:"_apiman_body_type,omitempty"`
}

type PostmanURL struct {
	Raw   string              `json:"raw"`
	Query []PostmanQueryParam `json:"query,omitempty"`
}

type PostmanQueryParam struct {
	Key      string `json:"key"`
	Value    string `json:"value"`
	Disabled bool   `json:"disabled,omitempty"`
}

type PostmanEvent struct {
	Listen string         `json:"listen"`
	Script *PostmanScript `json:"script,omitempty"`
}

type PostmanScript struct {
	Type string   `json:"type"`
	Exec []string `json:"exec,omitempty"`
	Src  string   `json:"src,omitempty"`
}

type PostmanHeader struct {
	Key      string `json:"key"`
	Value    string `json:"value"`
	Disabled bool   `json:"disabled,omitempty"`
}

type PostmanBody struct {
	Mode       string              `json:"mode"`
	Raw        string              `json:"raw,omitempty"`
	URLEncoded []PostmanURLEncoded `json:"urlencoded,omitempty"`
	FormData   []PostmanFormData   `json:"formdata,omitempty"`
}

type PostmanURLEncoded struct {
	Key      string `json:"key"`
	Value    string `json:"value"`
	Type     string `json:"type"`
	Disabled bool   `json:"disabled,omitempty"`
}

type PostmanFormData struct {
	Key      string `json:"key"`
	Value    string `json:"value"`
	Type     string `json:"type"`
	Disabled bool   `json:"disabled,omitempty"`
}

func CollectionFilePath(projectPath string) string {
	return filepath.Join(projectPath, CollectionFileName)
}

func NewCollection(displayName string) *Collection {
	return &Collection{
		Info: PostmanInfo{
			ID:     uuid.New().String(),
			Name:   displayName,
			Schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
		},
		Item: []CollectionItem{},
	}
}

func LoadCollection(projectPath string) (*Collection, error) {
	p := CollectionFilePath(projectPath)
	data, err := os.ReadFile(p)
	if err != nil {
		return nil, err
	}
	var c Collection
	if err := json.Unmarshal(data, &c); err != nil {
		return nil, err
	}
	if c.Info.Schema == "" {
		c.Info.Schema = "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
	}
	return &c, nil
}

func SaveCollection(projectPath string, c *Collection) error {
	if c.Info.Schema == "" {
		c.Info.Schema = "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
	}
	p := CollectionFilePath(projectPath)
	data, err := json.MarshalIndent(c, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(p, data, 0644)
}

func RequestRefPath(projectID, requestID string) string {
	return "request|" + projectID + "|" + requestID
}

func FolderRefPath(projectID, folderID string) string {
	return "folder|" + projectID + "|" + folderID
}

func ParseRequestRef(path string) (projectID, requestID string, ok bool) {
	if !strings.HasPrefix(path, "request|") {
		return "", "", false
	}
	inner := strings.TrimPrefix(path, "request|")
	i := strings.IndexByte(inner, '|')
	if i <= 0 || i >= len(inner)-1 {
		return "", "", false
	}
	return inner[:i], inner[i+1:], true
}

// RequestCaseRefPath identifies one 用例 under a request (for tree UI).
func RequestCaseRefPath(projectID, requestID, caseID string) string {
	return "requestCase|" + projectID + "|" + requestID + "|" + caseID
}

// ParseRequestCaseRef parses RequestCaseRefPath.
func ParseRequestCaseRef(path string) (projectID, requestID, caseID string, ok bool) {
	const p = "requestCase|"
	if !strings.HasPrefix(path, p) {
		return "", "", "", false
	}
	rest := path[len(p):]
	parts := strings.Split(rest, "|")
	if len(parts) != 3 || parts[0] == "" || parts[1] == "" || parts[2] == "" {
		return "", "", "", false
	}
	return parts[0], parts[1], parts[2], true
}

func ParseFolderRef(path string) (projectID, folderID string, ok bool) {
	if !strings.HasPrefix(path, "folder|") {
		return "", "", false
	}
	inner := strings.TrimPrefix(path, "folder|")
	i := strings.IndexByte(inner, '|')
	if i <= 0 || i >= len(inner)-1 {
		return "", "", false
	}
	return inner[:i], inner[i+1:], true
}

func IsRootFolderParent(parentPath, projectPath string) bool {
	return parentPath == projectPath || strings.TrimSpace(parentPath) == ""
}

// ExtractItem removes the first item (folder or request) with the given id and returns it.
func ExtractItem(items []CollectionItem, id string) ([]CollectionItem, CollectionItem, bool) {
	for i := range items {
		if items[i].ID == id {
			removed := items[i]
			return append(items[:i], items[i+1:]...), removed, true
		}
		newChildren, removed, ok := ExtractItem(items[i].Item, id)
		if ok {
			items[i].Item = newChildren
			return items, removed, true
		}
	}
	return items, CollectionItem{}, false
}

// InsertItemUnder appends item under the folder with parentID, or at root when parentID is empty.
func InsertItemUnder(items []CollectionItem, parentID string, item CollectionItem) ([]CollectionItem, bool) {
	return InsertItemUnderBefore(items, parentID, item, "")
}

// InsertItemUnderBefore inserts item as a direct child of parentID (root when parentID is empty),
// immediately before the sibling with ID beforeID. If beforeID is empty, appends at end.
// If beforeID is not found among siblings, appends at end.
func InsertItemUnderBefore(items []CollectionItem, parentID string, item CollectionItem, beforeID string) ([]CollectionItem, bool) {
	beforeID = strings.TrimSpace(beforeID)
	if parentID == "" {
		return insertSiblingBefore(items, item, beforeID), true
	}
	for i := range items {
		if items[i].ID == parentID {
			items[i].Item = insertSiblingBefore(items[i].Item, item, beforeID)
			return items, true
		}
		newChildren, ok := InsertItemUnderBefore(items[i].Item, parentID, item, beforeID)
		if ok {
			items[i].Item = newChildren
			return items, true
		}
	}
	return items, false
}

func insertSiblingBefore(siblings []CollectionItem, item CollectionItem, beforeID string) []CollectionItem {
	if beforeID == "" {
		return append(siblings, item)
	}
	for i := range siblings {
		if siblings[i].ID == beforeID {
			out := make([]CollectionItem, 0, len(siblings)+1)
			out = append(out, siblings[:i]...)
			out = append(out, item)
			out = append(out, siblings[i:]...)
			return out
		}
	}
	return append(siblings, item)
}

func FindItemRef(items []CollectionItem, id string) *CollectionItem {
	for i := range items {
		if items[i].ID == id {
			return &items[i]
		}
		if found := FindItemRef(items[i].Item, id); found != nil {
			return found
		}
	}
	return nil
}

func DeleteItemByID(items []CollectionItem, id string) ([]CollectionItem, bool) {
	next, _, ok := ExtractItem(items, id)
	return next, ok
}

// FolderSubtreeContainsID returns true if needle appears anywhere under the folder rooted at rootFolderID.
func FolderSubtreeContainsID(items []CollectionItem, rootFolderID, needle string) bool {
	root, ok := findItemValue(items, rootFolderID)
	if !ok {
		return false
	}
	return treeContainsID(root, needle)
}

func treeContainsID(root CollectionItem, needle string) bool {
	if root.ID == needle {
		return true
	}
	for _, ch := range root.Item {
		if treeContainsID(ch, needle) {
			return true
		}
	}
	return false
}

func findItemValue(items []CollectionItem, id string) (CollectionItem, bool) {
	for _, it := range items {
		if it.ID == id {
			return it, true
		}
		if v, ok := findItemValue(it.Item, id); ok {
			return v, true
		}
	}
	return CollectionItem{}, false
}

func GenerateItemID() string {
	return uuid.New().String()
}

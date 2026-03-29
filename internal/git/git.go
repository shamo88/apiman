package git

import (
	"encoding/base64"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/go-git/go-git/v5"
	"github.com/go-git/go-git/v5/config"
	"github.com/go-git/go-git/v5/plumbing"
	"github.com/go-git/go-git/v5/plumbing/transport/http"
)

// Simple obfuscation key - not true encryption but better than plain text
// In production, consider using system keychain or DPAPI
var obfuscationKey = []byte("apiman-git-sync-key-2024")

// obfuscate simple XOR obfuscation with base64 encoding
func obfuscate(input string) string {
	if input == "" {
		return ""
	}
	result := make([]byte, len(input))
	for i, c := range input {
		result[i] = byte(c) ^ obfuscationKey[i%len(obfuscationKey)]
	}
	return base64.StdEncoding.EncodeToString(result)
}

// deobfuscate reverse the obfuscation
func deobfuscate(input string) string {
	if input == "" {
		return ""
	}
	data, err := base64.StdEncoding.DecodeString(input)
	if err != nil {
		return input // Not obfuscated, return as-is
	}
	result := make([]byte, len(data))
	for i, c := range data {
		result[i] = c ^ obfuscationKey[i%len(obfuscationKey)]
	}
	return string(result)
}

// ensureAuth ensures username is not empty when password is provided
func ensureAuth(username, password string) *http.BasicAuth {
	if username == "" && password != "" {
		// For Gitee/GitHub with Access Token, username can be any non-empty value
		username = "oauth2"
	}
	return &http.BasicAuth{
		Username: username,
		Password: password,
	}
}

type GitSyncManager struct {
	repoPath string
}

func NewGitSyncManager(basePath string) *GitSyncManager {
	return &GitSyncManager{
		repoPath: filepath.Join(basePath, "git-sync"),
	}
}

func (g *GitSyncManager) GetRepoPath() string {
	return g.repoPath
}

// CloneOrPull clones the repository if it doesn't exist, otherwise pulls the latest changes
func (g *GitSyncManager) CloneOrPull(remoteURL, branch, username, password string) error {
	log.Printf("[GitSync] CloneOrPull called: repoPath=%s, remoteURL=%s, branch=%s", g.repoPath, remoteURL, branch)

	if err := os.MkdirAll(g.repoPath, 0755); err != nil {
		return fmt.Errorf("failed to create sync directory: %w", err)
	}

	// Check if repo exists
	gitDir := filepath.Join(g.repoPath, ".git")
	_, err := os.Stat(gitDir)
	log.Printf("[GitSync] .git directory check: exists=%v, err=%v", !os.IsNotExist(err), err)

	if os.IsNotExist(err) {
		// Clone the repository
		log.Printf("[GitSync] Repository does not exist, cloning from %s", remoteURL)
		err = g.cloneRepo(remoteURL, branch, username, password)
		if err != nil {
			errMsg := strings.ToLower(err.Error())
			log.Printf("[GitSync] Clone failed: %v", err)
			// If clone fails because repo is empty or doesn't exist, create a new repo
			if strings.Contains(errMsg, "remote repository is empty") ||
				strings.Contains(errMsg, "repository not found") ||
				strings.Contains(errMsg, "couldn't find remote ref") {
				log.Printf("[GitSync] Remote repo is empty or not found, creating new local repo")
				return g.createNewRepo(remoteURL, branch, username, password)
			}
			return err
		}
		return nil
	}

	log.Printf("[GitSync] Repository exists, pulling latest changes")
	// Pull latest changes
	return g.pullRepo(branch, username, password)
}

func (g *GitSyncManager) cloneRepo(remoteURL, branch, username, password string) error {
	log.Printf("[GitSync] cloneRepo: URL=%s, branch=%s, username=%s", remoteURL, branch, username)
	auth := ensureAuth(username, password)

	_, err := git.PlainClone(g.repoPath, false, &git.CloneOptions{
		URL:           remoteURL,
		ReferenceName: plumbing.NewBranchReferenceName(branch),
		SingleBranch:  true,
		Depth:         1,
		Auth:          auth,
	})
	if err != nil {
		log.Printf("[GitSync] clone error: %v", err)
		return fmt.Errorf("failed to clone repository: %w", err)
	}
	log.Printf("[GitSync] clone successful")
	return nil
}

func (g *GitSyncManager) createNewRepo(remoteURL, branch, username, password string) error {
	log.Printf("[GitSync] createNewRepo: URL=%s, branch=%s", remoteURL, branch)

	// Remove the existing (broken) directory if any
	os.RemoveAll(g.repoPath)

	// Create a new repository
	repo, err := git.PlainInit(g.repoPath, false)
	if err != nil {
		return fmt.Errorf("failed to init repository: %w", err)
	}

	// Add remote
	_, err = repo.CreateRemote(&config.RemoteConfig{
		Name: "origin",
		URLs: []string{remoteURL},
	})
	if err != nil {
		return fmt.Errorf("failed to add remote: %w", err)
	}

	// Create an initial commit (needed for push to work properly)
	worktree, err := repo.Worktree()
	if err != nil {
		return fmt.Errorf("failed to get worktree: %w", err)
	}

	// Create a README file for initial commit
	readmePath := filepath.Join(g.repoPath, "README.md")
	if err := os.WriteFile(readmePath, []byte("# Apiman Sync\n"), 0644); err != nil {
		return fmt.Errorf("failed to create README: %w", err)
	}

	_, err = worktree.Add("README.md")
	if err != nil {
		return fmt.Errorf("failed to add README: %w", err)
	}

	_, err = worktree.Commit("Initial commit", &git.CommitOptions{})
	if err != nil {
		return fmt.Errorf("failed to create initial commit: %w", err)
	}

	// Push to set upstream
	auth := ensureAuth(username, password)

	err = repo.Push(&git.PushOptions{
		RemoteName: "origin",
		Auth:       auth,
		RefSpecs:   []config.RefSpec{config.RefSpec(fmt.Sprintf("refs/heads/%s:refs/heads/%s", branch, branch))},
	})
	if err != nil {
		log.Printf("[GitSync] Initial push failed: %v", err)
		return fmt.Errorf("failed to push initial commit: %w", err)
	}

	log.Printf("[GitSync] New repository created with remote origin and initial commit")
	return nil
}

func (g *GitSyncManager) pullRepo(branch, username, password string) error {
	repo, err := git.PlainOpen(g.repoPath)
	if err != nil {
		return fmt.Errorf("failed to open repository: %w", err)
	}

	worktree, err := repo.Worktree()
	if err != nil {
		return fmt.Errorf("failed to get worktree: %w", err)
	}

	auth := ensureAuth(username, password)

	pullOpts := &git.PullOptions{
		RemoteName:     "origin",
		ReferenceName:  plumbing.NewBranchReferenceName(branch),
		SingleBranch:   true,
		Auth:           auth,
		Force:          true,
	}

	err = worktree.Pull(pullOpts)
	if err != nil {
		errMsg := strings.ToLower(err.Error())
		// If remote repository is empty (has no commits), push our local content instead
		if strings.Contains(errMsg, "remote repository is empty") ||
			strings.Contains(errMsg, "repository is empty") {
			log.Printf("[GitSync] Remote is empty, pushing local content instead")
			return g.pushRepo(branch, username, password)
		}
		if err != git.NoErrAlreadyUpToDate {
			return fmt.Errorf("failed to pull: %w", err)
		}
	}
	return nil
}

func (g *GitSyncManager) pushRepo(branch, username, password string) error {
	repo, err := git.PlainOpen(g.repoPath)
	if err != nil {
		return fmt.Errorf("failed to open repository: %w", err)
	}

	auth := ensureAuth(username, password)

	err = repo.Push(&git.PushOptions{
		RemoteName: "origin",
		Auth:       auth,
		RefSpecs:   []config.RefSpec{config.RefSpec(fmt.Sprintf("refs/heads/%s:refs/heads/%s", branch, branch))},
	})
	if err != nil {
		errMsg := strings.ToLower(err.Error())
		// If there's nothing to push (already up-to-date), create an initial commit first
		if strings.Contains(errMsg, "already up-to-date") {
			log.Printf("[GitSync] Nothing to push, creating initial commit")
			if initErr := g.createInitialCommit(repo); initErr != nil {
				return fmt.Errorf("failed to create initial commit: %w", initErr)
			}
			// Retry push after creating initial commit
			return g.pushRepo(branch, username, password)
		}
		return fmt.Errorf("failed to push: %w", err)
	}
	log.Printf("[GitSync] Push successful")
	return nil
}

func (g *GitSyncManager) createInitialCommit(repo *git.Repository) error {
	worktree, err := repo.Worktree()
	if err != nil {
		return fmt.Errorf("failed to get worktree: %w", err)
	}

	// Create a README file for initial commit
	readmePath := filepath.Join(g.repoPath, "README.md")
	if err := os.WriteFile(readmePath, []byte("# Apiman Sync\n"), 0644); err != nil {
		return fmt.Errorf("failed to create README: %w", err)
	}

	log.Printf("[GitSync] README created, adding to index")

	// Add the README file
	_, err = worktree.Add("README.md")
	if err != nil {
		return fmt.Errorf("failed to add README: %w", err)
	}

	// Verify status after adding
	status, err := worktree.Status()
	if err != nil {
		return fmt.Errorf("failed to get status: %w", err)
	}
	log.Printf("[GitSync] Status after add: %v", status)

	_, err = worktree.Commit("Initial commit", &git.CommitOptions{})
	if err != nil {
		return fmt.Errorf("failed to create initial commit: %w", err)
	}

	log.Printf("[GitSync] Created initial commit")
	return nil
}

// CommitAndPush commits changes and pushes to remote
func (g *GitSyncManager) CommitAndPush(files []string, message, branch, username, password string) error {
	log.Printf("[GitSync] CommitAndPush: files=%v, message=%s, branch=%s", files, message, branch)
	repo, err := git.PlainOpen(g.repoPath)
	if err != nil {
		return fmt.Errorf("failed to open repository: %w", err)
	}

	worktree, err := repo.Worktree()
	if err != nil {
		return fmt.Errorf("failed to get worktree: %w", err)
	}

	// Add files
	for _, file := range files {
		_, err := worktree.Add(file)
		if err != nil {
			return fmt.Errorf("failed to add file %s: %w", file, err)
		}
	}

	// Check if there are staged changes
	status, err := worktree.Status()
	if err != nil {
		return fmt.Errorf("failed to get status: %w", err)
	}

	if status.IsClean() {
		log.Printf("[GitSync] No changes to commit")
		return nil // Nothing to commit
	}

	// Commit
	commit, err := worktree.Commit(message, &git.CommitOptions{
		All: true,
	})
	if err != nil {
		return fmt.Errorf("failed to commit: %w", err)
	}
	log.Printf("[GitSync] Committed: %s", commit.String())

	// Push
	auth := ensureAuth(username, password)

	err = repo.Push(&git.PushOptions{
		RemoteName: "origin",
		Auth:       auth,
		RefSpecs:   []config.RefSpec{config.RefSpec(fmt.Sprintf("refs/heads/%s:refs/heads/%s", branch, branch))},
	})
	if err != nil {
		log.Printf("[GitSync] Push failed: %v", err)
		return fmt.Errorf("failed to push: %w", err)
	}
	log.Printf("[GitSync] Push successful")

	return nil
}

// SyncProject syncs a single project to the repository
func (g *GitSyncManager) SyncProject(projectPath, projectID, message, branch, username, password string) error {
	// Copy project files to repo
	projectDest := filepath.Join(g.repoPath, "projects", projectID)
	if err := os.MkdirAll(projectDest, 0755); err != nil {
		return fmt.Errorf("failed to create project directory: %w", err)
	}

	// Files to sync
	files := []string{
		"collection.postman.json",
		"environments.json",
		"meta.json",
		"variables.json",
	}

	var syncFiles []string
	for _, file := range files {
		src := filepath.Join(projectPath, file)
		dst := filepath.Join(projectDest, file)

		if data, err := os.ReadFile(src); err == nil {
			if err := os.WriteFile(dst, data, 0644); err != nil {
				return fmt.Errorf("failed to copy %s: %w", file, err)
			}
			syncFiles = append(syncFiles, filepath.Join("projects", projectID, file))
		}
	}

	// Copy scripts directory
	scriptsSrc := filepath.Join(projectPath, "scripts")
	scriptsDst := filepath.Join(projectDest, "scripts")
	if info, err := os.Stat(scriptsSrc); err == nil && info.IsDir() {
		if err := copyDirectory(scriptsSrc, scriptsDst); err != nil {
			return fmt.Errorf("failed to copy scripts: %w", err)
		}
		syncFiles = append(syncFiles, filepath.Join("projects", projectID, "scripts"))
	}

	if len(syncFiles) == 0 {
		return nil
	}

	// Generate commit message if empty
	if message == "" {
		message = fmt.Sprintf("Sync project %s at %s", projectID, time.Now().Format(time.RFC3339))
	}

	return g.CommitAndPush(syncFiles, message, branch, username, password)
}

// SyncAllProjects syncs all projects to the repository
func (g *GitSyncManager) SyncAllProjects(projectsDir, remoteURL, branch, username, password string) error {
	// First ensure the repo is cloned/updated
	if remoteURL != "" {
		if err := g.CloneOrPull(remoteURL, branch, username, password); err != nil {
			return fmt.Errorf("failed to sync repository: %w", err)
		}
	}

	entries, err := os.ReadDir(projectsDir)
	if err != nil {
		return fmt.Errorf("failed to read projects directory: %w", err)
	}

	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}

		metaFile := filepath.Join(projectsDir, entry.Name(), "meta.json")
		if _, err := os.Stat(metaFile); err != nil {
			continue
		}

		// Extract project ID from path
		projectID := entry.Name()
		if err := g.SyncProject(filepath.Join(projectsDir, entry.Name()), projectID, "", branch, username, password); err != nil {
			// Log error but continue with other projects
			continue
		}
	}

	return nil
}

// HasLocalRepo checks if the local repository exists
func (g *GitSyncManager) HasLocalRepo() bool {
	_, err := os.Stat(filepath.Join(g.repoPath, ".git"))
	return err == nil
}

func copyDirectory(src, dst string) error {
	info, err := os.Stat(src)
	if err != nil {
		return err
	}

	if err := os.MkdirAll(dst, info.Mode()); err != nil {
		return err
	}

	entries, err := os.ReadDir(src)
	if err != nil {
		return err
	}

	for _, entry := range entries {
		srcPath := filepath.Join(src, entry.Name())
		dstPath := filepath.Join(dst, entry.Name())

		if entry.IsDir() {
			if err := copyDirectory(srcPath, dstPath); err != nil {
				return err
			}
		} else {
			data, err := os.ReadFile(srcPath)
			if err != nil {
				return err
			}
			if err := os.WriteFile(dstPath, data, 0644); err != nil {
				return err
			}
		}
	}

	return nil
}

// GetAuth returns the auth credentials for Git operations
func GetAuth(username, password string) *http.BasicAuth {
	return &http.BasicAuth{
		Username: username,
		Password: password,
	}
}

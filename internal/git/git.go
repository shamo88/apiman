package git

import (
	"bytes"
	"encoding/base64"
	"fmt"
	"log"
	"os"
	"os/exec"
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
func ensureAuth(password string) *http.BasicAuth {
	// For Gitee/GitHub with Access Token, username is set to "oauth2"
	username := "oauth2"
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

// GetProjectsPath returns the projects directory path within the git-sync repo
func (g *GitSyncManager) GetProjectsPath() string {
	return filepath.Join(g.repoPath, "projects")
}

// RemoveRepo deletes the entire git-sync repository directory
func (g *GitSyncManager) RemoveRepo() error {
	return os.RemoveAll(g.repoPath)
}

// CloneOrPull clones the repository if it doesn't exist, otherwise pulls the latest changes
func (g *GitSyncManager) CloneOrPull(remoteURL, branch, password string) error {
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
		err = g.cloneRepo(remoteURL, branch, password)
		if err != nil {
			errMsg := strings.ToLower(err.Error())
			log.Printf("[GitSync] Clone failed: %v", err)
			// If clone fails because repo is empty or doesn't exist, create a new repo
			if strings.Contains(errMsg, "remote repository is empty") ||
				strings.Contains(errMsg, "repository not found") ||
				strings.Contains(errMsg, "couldn't find remote ref") {
				log.Printf("[GitSync] Remote repo is empty or not found, creating new local repo")
				return g.createNewRepo(remoteURL, branch, password)
			}
			return err
		}
		return nil
	}

	log.Printf("[GitSync] Repository exists, pulling latest changes")
	// Pull latest changes
	return g.pullRepo(branch, password)
}

func (g *GitSyncManager) cloneRepo(remoteURL, branch, password string) error {
	log.Printf("[GitSync] cloneRepo: URL=%s, branch=%s, password='%s'", remoteURL, branch, strings.Repeat("*", len(password)))
	auth := ensureAuth(password)

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

func (g *GitSyncManager) createNewRepo(remoteURL, branch, password string) error {
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
	log.Printf("[GitSync] Creating README at: %s", readmePath)
	if err := os.WriteFile(readmePath, []byte("# Apiman Sync\n"), 0644); err != nil {
		return fmt.Errorf("failed to create README: %w", err)
	}

	// Verify file exists
	if _, err := os.Stat(readmePath); err != nil {
		return fmt.Errorf("README file not found after creation: %w", err)
	}
	log.Printf("[GitSync] README file created successfully")

	_, err = worktree.Add("README.md")
	if err != nil {
		return fmt.Errorf("failed to add README: %w", err)
	}
	log.Printf("[GitSync] README added to worktree")

	// Get status before commit
	status, err := worktree.Status()
	if err != nil {
		return fmt.Errorf("failed to get status: %w", err)
	}
	log.Printf("[GitSync] Status before commit: %v", status)

	_, err = worktree.Commit("Initial commit", &git.CommitOptions{})
	if err != nil {
		return fmt.Errorf("failed to create initial commit: %w", err)
	}

	// Push to set upstream
	auth := ensureAuth(password)

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

func (g *GitSyncManager) pullRepo(branch, password string) error {
	repo, err := git.PlainOpen(g.repoPath)
	if err != nil {
		return fmt.Errorf("failed to open repository: %w", err)
	}

	worktree, err := repo.Worktree()
	if err != nil {
		return fmt.Errorf("failed to get worktree: %w", err)
	}

	// Check if worktree has uncommitted changes
	status, err := worktree.Status()
	if err != nil {
		log.Printf("[GitSync] Failed to get worktree status: %v", err)
	} else if !status.IsClean() {
		log.Printf("[GitSync] Worktree has uncommitted changes, skipping pull")
		return nil
	}

	auth := ensureAuth(password)

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
			return g.pushRepo(branch, password)
		}
		if err != git.NoErrAlreadyUpToDate {
			return fmt.Errorf("failed to pull: %w", err)
		}
	}
	return nil
}

func (g *GitSyncManager) pushRepo(branch, password string) error {
	auth := ensureAuth(password)

	// First try with go-git
	repo, err := git.PlainOpen(g.repoPath)
	if err != nil {
		return fmt.Errorf("failed to open repository: %w", err)
	}

	err = repo.Push(&git.PushOptions{
		RemoteName: "origin",
		Auth:       auth,
		RefSpecs:   []config.RefSpec{config.RefSpec(fmt.Sprintf("refs/heads/%s:refs/heads/%s", branch, branch))},
	})
	if err == nil {
		log.Printf("[GitSync] Push successful")
		return nil
	}

	errMsg := strings.ToLower(err.Error())
	log.Printf("[GitSync] go-git push failed: %v", err)

	// If there's nothing to push, create an initial commit first
	if strings.Contains(errMsg, "already up-to-date") || strings.Contains(errMsg, "nothing to push") {
		log.Printf("[GitSync] Nothing to push, creating initial commit")
		if initErr := g.createInitialCommit(branch, password); initErr != nil {
			return fmt.Errorf("failed to create initial commit: %w", initErr)
		}
		// Push using git command after commit
		log.Printf("[GitSync] Pushing after initial commit using git command")
		return g.gitPush(branch, password)
	}

	// Try git command as fallback
	log.Printf("[GitSync] Trying git command push as fallback")
	return g.gitPush(branch, password)
}

func (g *GitSyncManager) gitPush(branch, password string) error {
	// Use ensureAuth to get proper username (oauth2 if token auth)
	auth := ensureAuth(password)
	actualUsername := auth.Username
	actualPassword := auth.Password

	log.Printf("[GitSync] gitPush with username='%s', password='%s'", actualUsername, strings.Repeat("*", len(actualPassword)))

	// Get the remote URL
	repo, err := git.PlainOpen(g.repoPath)
	if err != nil {
		return fmt.Errorf("failed to open repository: %w", err)
	}

	remote, err := repo.Remote("origin")
	if err != nil {
		return fmt.Errorf("failed to get remote: %w", err)
	}

	remoteURL := remote.Config().URLs[0]
	log.Printf("[GitSync] Remote URL: %s", remoteURL)

	// Check if URL already has credentials embedded
	hasCreds := strings.Contains(remoteURL, "@")
	if !hasCreds && actualUsername != "" && actualPassword != "" {
		// Embed credentials in URL
		credURL := strings.Replace(remoteURL, "https://", fmt.Sprintf("https://%s:%s@", actualUsername, actualPassword), 1)
		log.Printf("[GitSync] Embedding credentials in URL")

		// Set the remote URL with credentials
		cmd := exec.Command("git", "remote", "set-url", "origin", credURL)
		cmd.Dir = g.repoPath
		if err := cmd.Run(); err != nil {
			return fmt.Errorf("failed to set remote URL: %w", err)
		}
		remoteURL = credURL
	} else if hasCreds {
		log.Printf("[GitSync] URL already has credentials embedded")
	}

	log.Printf("[GitSync] Using URL: %s", maskURL(remoteURL))

	// Push
	cmd := exec.Command("git", "push", "-u", "origin", branch)
	cmd.Dir = g.repoPath
	var stderr bytes.Buffer
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		errMsg := string(stderr.Bytes())
		log.Printf("[GitSync] Git push failed: %v, stderr: %s", err, errMsg)

		// If branch does not exist, create it from current HEAD and push
		if strings.Contains(errMsg, "src refspec") && strings.Contains(errMsg, "does not match any") {
			log.Printf("[GitSync] Branch %s does not exist, creating it", branch)
			// Create the branch
			cmd = exec.Command("git", "checkout", "-b", branch)
			cmd.Dir = g.repoPath
			if err := cmd.Run(); err != nil {
				return fmt.Errorf("failed to create branch: %w", err)
			}
			// Retry push
			cmd = exec.Command("git", "push", "-u", "origin", branch)
			cmd.Dir = g.repoPath
			cmd.Stderr = &stderr
			if err := cmd.Run(); err != nil {
				return fmt.Errorf("git push failed after creating branch: %s", string(stderr.Bytes()))
			}
			log.Printf("[GitSync] Git push successful after creating branch")
			return nil
		}
		return fmt.Errorf("git push failed: %s", errMsg)
	}
	log.Printf("[GitSync] Git push successful")
	return nil
}

func maskURL(url string) string {
	// Mask password in URL for logging
	if strings.Contains(url, "@") {
		parts := strings.Split(url, "@")
		if len(parts) >= 2 {
			return parts[0] + "@" + parts[len(parts)-1]
		}
	}
	return url
}

func (g *GitSyncManager) createInitialCommit(branch, password string) error {
	// Create a README file for initial commit
	readmePath := filepath.Join(g.repoPath, "README.md")
	log.Printf("[GitSync] README path: %s", readmePath)
	if err := os.WriteFile(readmePath, []byte("# Apiman Sync\n"), 0644); err != nil {
		return fmt.Errorf("failed to create README: %w", err)
	}

	// Verify README was created
	info, err := os.Stat(readmePath)
	log.Printf("[GitSync] README stat: size=%d, err=%v", info.Size(), err)

	// Use git exec to add and commit directly
	cmd := exec.Command("git", "add", "README.md")
	cmd.Dir = g.repoPath
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("failed to git add: %w", err)
	}
	log.Printf("[GitSync] git add succeeded")

	// Check git status before commit
	cmd = exec.Command("git", "status")
	cmd.Dir = g.repoPath
	out, _ := cmd.Output()
	log.Printf("[GitSync] git status before commit: %s", string(out))

	// Check if there's already a commit
	cmd = exec.Command("git", "rev-parse", "HEAD")
	cmd.Dir = g.repoPath
	if err := cmd.Run(); err != nil {
		log.Printf("[GitSync] No HEAD commit exists, will create initial commit")
	} else {
		log.Printf("[GitSync] HEAD already exists, skipping commit")
		return nil // Already have a commit, no need to create new one
	}

	// Create commit
	cmd = exec.Command("git", "commit", "-m", "Initial commit")
	cmd.Dir = g.repoPath
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("failed to git commit: %w", err)
	}
	log.Printf("[GitSync] git commit succeeded")

	return nil
}

// CommitAndPush commits changes and pushes to remote
func (g *GitSyncManager) CommitAndPush(files []string, message, branch, password string) error {
	log.Printf("[GitSync] CommitAndPush: files=%v, message=%s, branch=%s", files, message, branch)
	repo, err := git.PlainOpen(g.repoPath)
	if err != nil {
		return fmt.Errorf("failed to open repository: %w", err)
	}

	worktree, err := repo.Worktree()
	if err != nil {
		return fmt.Errorf("failed to get worktree: %w", err)
	}

	// Add files - for directories, recursively add all files
	for _, file := range files {
		// Check if it's a directory
		if info, err := os.Stat(filepath.Join(g.repoPath, file)); err == nil && info.IsDir() {
			log.Printf("[GitSync] Adding directory recursively: %s", file)
			// Use git add for directory to ensure all files are staged
			cmd := exec.Command("git", "add", "-A", file)
			cmd.Dir = g.repoPath
			if err := cmd.Run(); err != nil {
				return fmt.Errorf("failed to add directory %s: %w", file, err)
			}
		} else {
			_, err := worktree.Add(file)
			if err != nil {
				return fmt.Errorf("failed to add file %s: %w", file, err)
			}
		}
	}

	// Check if there are staged changes
	status, err := worktree.Status()
	if err != nil {
		return fmt.Errorf("failed to get status: %w", err)
	}

	log.Printf("[GitSync] Status after add: IsClean=%v", status.IsClean())

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
	auth := ensureAuth(password)

	// First check current branch using Head
	head, err := repo.Head()
	if err == nil {
		log.Printf("[GitSync] HEAD: %s, target branch: %s", head.Name(), branch)
	}

	err = repo.Push(&git.PushOptions{
		RemoteName: "origin",
		Auth:       auth,
		RefSpecs:   []config.RefSpec{config.RefSpec(fmt.Sprintf("refs/heads/%s:refs/heads/%s", branch, branch))},
		Force:      true, // Use force to overwrite remote
	})
	if err != nil {
		log.Printf("[GitSync] Push failed: %v", err)
		return fmt.Errorf("failed to push: %w", err)
	}
	log.Printf("[GitSync] Push successful")

	return nil
}

// SyncProject syncs a single project to the repository
func (g *GitSyncManager) SyncProject(projectPath, projectID, message, branch, password string) error {
	log.Printf("[GitSync] SyncProject: projectPath=%s, projectID=%s, repoPath=%s", projectPath, projectID, g.repoPath)

	// Compute relative path from repo root (e.g., "projects/slug__uuid")
	relPath, err := filepath.Rel(g.repoPath, projectPath)
	if err != nil {
		return fmt.Errorf("failed to compute relative path: %w", err)
	}

	// Stage project files for commit
	files := []string{
		"collection.postman.json",
		"environments.json",
		"meta.json",
		"variables.json",
	}
	var syncFiles []string
	for _, file := range files {
		fullPath := filepath.Join(projectPath, file)
		if _, err := os.Stat(fullPath); err == nil {
			syncFiles = append(syncFiles, filepath.Join(relPath, file))
		}
	}
	// Check scripts
	scriptsPath := filepath.Join(projectPath, "scripts")
	if _, err := os.Stat(scriptsPath); err == nil {
		syncFiles = append(syncFiles, filepath.Join(relPath, "scripts"))
	}
	if len(syncFiles) == 0 {
		return nil
	}
	if message == "" {
		message = fmt.Sprintf("Sync project %s at %s", projectID, time.Now().Format(time.RFC3339))
	}
	return g.CommitAndPush(syncFiles, message, branch, password)
}

// SyncAllProjects syncs all projects to the repository
func (g *GitSyncManager) SyncAllProjects(projectsDir, remoteURL, branch, password string) error {
	// Commit and push all changes (projects are already in the git repo directory)
	commitMsg := fmt.Sprintf("Sync all projects at %s", time.Now().Format(time.RFC3339))
	return g.CommitAndPush([]string{"projects"}, commitMsg, branch, password)
}

// HasLocalRepo checks if the local repository exists
func (g *GitSyncManager) HasLocalRepo() bool {
	_, err := os.Stat(filepath.Join(g.repoPath, ".git"))
	return err == nil
}


// extractProjectID extracts the UUID from a directory name like "项目名__uuid" or just "uuid"
func extractProjectID(dirName string) string {
	// Try to find UUID after "__"
	if idx := strings.LastIndex(dirName, "__"); idx >= 0 && idx < len(dirName)-2 {
		return dirName[idx+2:]
	}
	// Otherwise return the whole name (might be just the UUID)
	return dirName
}
